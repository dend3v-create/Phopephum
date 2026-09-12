import { describe, it, expect } from "vitest";
import { PERSON_LIMIT, getPersonLimit, checkQuotaStatus } from "./quotaCalculator.js";
import type { CanonicalPlan } from "@phopephum/types";

describe("PHOPEPHUM V3 — PEOPLE BOOK ENTITLEMENT & DOWNGRADE INTEGRITY", () => {
  interface CustomerProfile {
    id: string;
    userId: string;
    name: string;
    birthDate: string;
  }

  // Simulated Database with Strict RLS and Entitlement Gate
  class MockCustomerRepository {
    private customers: CustomerProfile[] = [];

    async list(userId: string): Promise<CustomerProfile[]> {
      return this.customers.filter((c) => c.userId === userId);
    }

    async create(
      userId: string,
      plan: CanonicalPlan,
      name: string,
      birthDate: string
    ): Promise<{ success: boolean; data?: CustomerProfile; error?: string }> {
      const userCustomers = await this.list(userId);
      const limit = getPersonLimit(plan);

      const quotaCheck = checkQuotaStatus({
        currentUsage: userCustomers.length,
        limit,
      });

      if (!quotaCheck.allowed) {
        return {
          success: false,
          error: `Limit reached (${userCustomers.length}/${limit}). Please upgrade plan.`,
        };
      }

      const newCust: CustomerProfile = {
        id: `cust_${Date.now()}_${Math.random()}`,
        userId,
        name,
        birthDate,
      };

      this.customers.push(newCust);
      return { success: true, data: newCust };
    }

    async update(
      id: string,
      userId: string,
      updatedName: string
    ): Promise<{ success: boolean; data?: CustomerProfile; error?: string }> {
      const cust = this.customers.find((c) => c.id === id && c.userId === userId);
      if (!cust) {
        return { success: false, error: "Not found or unauthorized" };
      }
      cust.name = updatedName;
      return { success: true, data: cust };
    }

    async delete(id: string, userId: string): Promise<{ success: boolean; error?: string }> {
      const idx = this.customers.findIndex((c) => c.id === id && c.userId === userId);
      if (idx === -1) {
        return { success: false, error: "Not found or unauthorized" };
      }
      this.customers.splice(idx, 1);
      return { success: true };
    }
  }

  it("should enforce exact SSoT limits for all 4 plans (Free 1, Premium 5, Pro 20, Master 100)", () => {
    expect(PERSON_LIMIT.free).toBe(1);
    expect(PERSON_LIMIT.premium).toBe(5);
    expect(PERSON_LIMIT.pro).toBe(20);
    expect(PERSON_LIMIT.master).toBe(100);
  });

  it("should allow Free user to create 1 profile and block 2nd profile", async () => {
    const repo = new MockCustomerRepository();
    const userId = "free_user_1";

    const res1 = await repo.create(userId, "free", "ดวงคุณแม่", "1968-05-12");
    expect(res1.success).toBe(true);

    const res2 = await repo.create(userId, "free", "ดวงคุณพ่อ", "1965-03-20");
    expect(res2.success).toBe(false);
    expect(res2.error).toContain("Limit reached (1/1)");
  });

  it("should allow Premium user to create up to 5 profiles and block 6th profile", async () => {
    const repo = new MockCustomerRepository();
    const userId = "prem_user_1";

    for (let i = 1; i <= 5; i++) {
      const res = await repo.create(userId, "premium", `Person ${i}`, "1990-01-01");
      expect(res.success).toBe(true);
    }

    const resOver = await repo.create(userId, "premium", "Person 6", "1990-01-01");
    expect(resOver.success).toBe(false);
    expect(resOver.error).toContain("Limit reached (5/5)");
  });

  it("should preserve all existing profiles upon Downgrade without data loss (Downgrade Safety)", async () => {
    const repo = new MockCustomerRepository();
    const userId = "downgraded_user";

    // User creates 20 profiles while on Pro plan
    for (let i = 1; i <= 20; i++) {
      await repo.create(userId, "pro", `Client ${i}`, "1992-02-02");
    }

    expect((await repo.list(userId)).length).toBe(20);

    // User subscription expires -> Downgraded to Free plan (limit = 1)
    // 1. Existing 20 profiles must be 100% preserved
    const listAfterDowngrade = await repo.list(userId);
    expect(listAfterDowngrade.length).toBe(20);

    // 2. Creating a new (21st) profile is rejected
    const createNew = await repo.create(userId, "free", "New Person", "2000-01-01");
    expect(createNew.success).toBe(false);
    expect(createNew.error).toContain("Limit reached (20/1)");

    // 3. User can still Edit existing profiles
    const firstCust = listAfterDowngrade[0];
    const updateRes = await repo.update(firstCust.id, userId, "Client 1 (Renamed)");
    expect(updateRes.success).toBe(true);
    expect(updateRes.data?.name).toBe("Client 1 (Renamed)");

    // 4. User can still Delete profiles
    const deleteRes = await repo.delete(firstCust.id, userId);
    expect(deleteRes.success).toBe(true);
    expect((await repo.list(userId)).length).toBe(19);
  });

  it("should strictly enforce User Isolation and prevent cross-tenant data access (RLS)", async () => {
    const repo = new MockCustomerRepository();
    const userA = "user_alice";
    const userB = "user_bob";

    const aliceCust = (await repo.create(userA, "premium", "Alice Relative", "1988-08-08")).data!;
    const bobCust = (await repo.create(userB, "premium", "Bob Relative", "1989-09-09")).data!;

    // Bob cannot see Alice's profiles
    const bobList = await repo.list(userB);
    expect(bobList.some((c) => c.id === aliceCust.id)).toBe(false);

    // Bob cannot update Alice's profiles
    const attackUpdate = await repo.update(aliceCust.id, userB, "Hacked Name");
    expect(attackUpdate.success).toBe(false);

    // Bob cannot delete Alice's profiles
    const attackDelete = await repo.delete(aliceCust.id, userB);
    expect(attackDelete.success).toBe(false);
  });
});
