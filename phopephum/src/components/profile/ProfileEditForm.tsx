"use client";

import React, { useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  displayName: string;
  birthDate: string;   // "YYYY-MM-DD"
  birthTime: string;   // "HH:MM"
  birthPlace: string;
  gender: "male" | "female" | "other";
}

export interface ProfileEditFormProps {
  initialData: UserProfile;
  onSave: (data: Omit<UserProfile, "id">) => Promise<void>;
  onCancel?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────

export interface ValidationErrors {
  displayName?: string;
  birthDate?: string;
  birthTime?: string;
  birthPlace?: string;
}

export function validateProfile(
  data: Omit<UserProfile, "id">
): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!data.displayName.trim()) {
    errors.displayName = "กรุณากรอกชื่อ-นามสกุล";
  } else if (data.displayName.trim().length < 2) {
    errors.displayName = "ชื่อต้องมีอย่างน้อย 2 ตัวอักษร";
  }

  if (!data.birthDate) {
    errors.birthDate = "กรุณาระบุวันเกิด";
  } else {
    const parsed = new Date(data.birthDate);
    if (isNaN(parsed.getTime())) {
      errors.birthDate = "รูปแบบวันที่ไม่ถูกต้อง";
    } else if (parsed > new Date()) {
      errors.birthDate = "วันเกิดต้องไม่เกินวันปัจจุบัน";
    }
  }

  if (!data.birthTime) {
    errors.birthTime = "กรุณาระบุเวลาเกิด";
  } else {
    const timeRegex = /^([01]?\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(data.birthTime)) {
      errors.birthTime = "รูปแบบเวลาไม่ถูกต้อง (ชช:นน)";
    }
  }

  if (!data.birthPlace.trim()) {
    errors.birthPlace = "กรุณาระบุสถานที่เกิด";
  }

  return errors;
}

// ─────────────────────────────────────────────────────────────────────────────
// Thai Date Formatter
// ─────────────────────────────────────────────────────────────────────────────

export function formatThaiDate(isoDate: string): string {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-").map(Number);
  const buddhistYear = year + 543;
  const thaiMonths = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
  ];
  return `${day} ${thaiMonths[month - 1]} ${buddhistYear}`;
}

/** แปลง Gregorian YYYY-MM-DD → Buddhist Era YYYY-MM-DD (สำหรับ display) */
export function toBuddhistYear(isoDate: string): string {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-");
  const beYear = Number(year) + 543;
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${beYear}`;
}

/** แปลง Buddhist DD/MM/YYYY → ISO YYYY-MM-DD */
export function fromBuddhistInput(thaiInput: string): string {
  const parts = thaiInput.split("/");
  if (parts.length !== 3) return thaiInput;
  const [day, month, beYear] = parts.map(Number);
  const year = beYear > 2500 ? beYear - 543 : beYear; // handle both BE and CE
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile Edit Form Component
// ─────────────────────────────────────────────────────────────────────────────

export function ProfileEditForm({
  initialData,
  onSave,
  onCancel,
}: ProfileEditFormProps) {
  const [form, setForm] = useState({
    displayName: initialData.displayName,
    birthDate: initialData.birthDate,
    birthTime: initialData.birthTime,
    birthPlace: initialData.birthPlace,
    gender: initialData.gender,
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // ─── Thai date input state (DD/MM/YYYY พ.ศ.) ───
  const [thaiDateInput, setThaiDateInput] = useState(
    toBuddhistYear(initialData.birthDate)
  );

  // ─── Handle Thai date input ───
  function handleThaiDateChange(val: string) {
    setThaiDateInput(val);
    // Auto-format: เพิ่ม / อัตโนมัติ
    if (val.length === 2 || val.length === 5) {
      setThaiDateInput(val + "/");
    }
    // Parse เมื่อครบ
    if (val.length === 10) {
      const iso = fromBuddhistInput(val);
      setForm((f) => ({ ...f, birthDate: iso }));
    }
  }

  // ─── Save ───
  async function handleSave() {
    const errs = validateProfile(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await onSave(form);
      setSaved(true);
      setIsEditing(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setErrors({ displayName: "เกิดข้อผิดพลาด กรุณาลองใหม่" });
    } finally {
      setSaving(false);
    }
  }

  // ─── View Mode ───
  if (!isEditing) {
    return (
      <ProfileViewCard
        profile={{ ...form, id: initialData.id }}
        saved={saved}
        onEdit={() => setIsEditing(true)}
      />
    );
  }

  // ─── Edit Mode ───
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <span style={styles.cardIcon}>◎</span>
        <span style={styles.cardTitle}>แก้ไขข้อมูลส่วนตัว</span>
      </div>

      {/* ชื่อ-นามสกุล */}
      <FieldGroup
        label="ชื่อ-นามสกุล"
        error={errors.displayName}
        required
      >
        <input
          type="text"
          value={form.displayName}
          onChange={(e) =>
            setForm((f) => ({ ...f, displayName: e.target.value }))
          }
          placeholder="กรอกชื่อ-นามสกุล"
          style={{
            ...styles.input,
            borderColor: errors.displayName ? "#EF4444" : "var(--hora-dark-border)",
          }}
        />
      </FieldGroup>

      {/* วันเกิด (Thai Buddhist) */}
      <FieldGroup
        label="วันเกิด (วว/ดด/ปปปป พ.ศ.)"
        error={errors.birthDate}
        hint={form.birthDate ? `→ ${formatThaiDate(form.birthDate)}` : undefined}
        required
      >
        <input
          type="text"
          inputMode="numeric"
          value={thaiDateInput}
          onChange={(e) => handleThaiDateChange(e.target.value)}
          placeholder="23/09/2525"
          maxLength={10}
          style={{
            ...styles.input,
            borderColor: errors.birthDate ? "#EF4444" : "var(--hora-dark-border)",
            letterSpacing: "0.05em",
          }}
        />
        {/* Native date fallback */}
        <input
          type="date"
          value={form.birthDate}
          onChange={(e) => {
            setForm((f) => ({ ...f, birthDate: e.target.value }));
            setThaiDateInput(toBuddhistYear(e.target.value));
          }}
          style={{
            ...styles.input,
            marginTop: "6px",
            color: "var(--hora-text-muted)",
            fontSize: "12px",
          }}
        />
      </FieldGroup>

      {/* เวลาเกิด */}
      <FieldGroup
        label="เวลาเกิด (ชช:นน)"
        error={errors.birthTime}
        hint="ใส่ 00:00 ถ้าไม่ทราบเวลา"
        required
      >
        <input
          type="time"
          value={form.birthTime}
          onChange={(e) =>
            setForm((f) => ({ ...f, birthTime: e.target.value }))
          }
          style={{
            ...styles.input,
            borderColor: errors.birthTime ? "#EF4444" : "var(--hora-dark-border)",
          }}
        />
      </FieldGroup>

      {/* ภูมิสถาน */}
      <FieldGroup
        label="สถานที่เกิด"
        error={errors.birthPlace}
        required
      >
        <input
          type="text"
          value={form.birthPlace}
          onChange={(e) =>
            setForm((f) => ({ ...f, birthPlace: e.target.value }))
          }
          placeholder="เช่น กรุงเทพฯ, เชียงใหม่"
          style={{
            ...styles.input,
            borderColor: errors.birthPlace ? "#EF4444" : "var(--hora-dark-border)",
          }}
        />
      </FieldGroup>

      {/* เพศสถาน */}
      <FieldGroup label="เพศสถาน">
        <div style={{ display: "flex", gap: "8px" }}>
          {(["male", "female", "other"] as const).map((g) => (
            <button
              key={g}
              onClick={() => setForm((f) => ({ ...f, gender: g }))}
              style={{
                flex: 1,
                padding: "10px 4px",
                border: `1px solid ${
                  form.gender === g
                    ? "var(--hora-gold)"
                    : "var(--hora-dark-border)"
                }`,
                borderRadius: "8px",
                background:
                  form.gender === g
                    ? "rgba(201, 169, 110, 0.12)"
                    : "transparent",
                color:
                  form.gender === g
                    ? "var(--hora-gold)"
                    : "var(--hora-text-muted)",
                fontSize: "13px",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {g === "male" ? "บุรุษ" : g === "female" ? "สตรี" : "อื่นๆ"}
            </button>
          ))}
        </div>
      </FieldGroup>

      {/* Actions */}
      <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
        <button
          onClick={() => {
            setIsEditing(false);
            onCancel?.();
          }}
          style={styles.btnSecondary}
        >
          ยกเลิก
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            ...styles.btnPrimary,
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "กำลังบันทึก..." : "💾 บันทึกข้อมูล"}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile View Card (read-only)
// ─────────────────────────────────────────────────────────────────────────────

function ProfileViewCard({
  profile,
  saved,
  onEdit,
}: {
  profile: UserProfile;
  saved: boolean;
  onEdit: () => void;
}) {
  const fields = [
    { label: "นามนามา", value: profile.displayName },
    {
      label: "วันเกิด",
      value: profile.birthDate ? formatThaiDate(profile.birthDate) : "-",
    },
    { label: "เวลาเกิด", value: profile.birthTime ? `${profile.birthTime} น.` : "-" },
    { label: "สถานที่เกิด", value: profile.birthPlace || "-" },
    {
      label: "เพศสถาน",
      value:
        profile.gender === "male"
          ? "บุรุษ"
          : profile.gender === "female"
          ? "สตรี"
          : "อื่นๆ",
    },
  ];

  return (
    <div style={styles.card}>
      <div style={{ ...styles.cardHeader, justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={styles.cardIcon}>◎</span>
          <span style={styles.cardTitle}>พิกัดกำเนิด</span>
        </div>
        <button onClick={onEdit} style={styles.editBtn}>
          ✏️ แก้ไข
        </button>
      </div>

      {saved && (
        <div style={styles.successBanner}>
          ✅ บันทึกข้อมูลเรียบร้อยแล้ว
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {fields.map(({ label, value }) => (
          <div key={label} style={styles.fieldRow}>
            <span style={styles.fieldLabel}>{label}</span>
            <span style={styles.fieldValue}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FieldGroup Helper
// ─────────────────────────────────────────────────────────────────────────────

function FieldGroup({
  label,
  children,
  error,
  hint,
  required,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  hint?: string;
  required?: boolean;
}) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <label
        style={{
          display: "block",
          fontSize: "12px",
          color: "var(--hora-text-muted)",
          marginBottom: "6px",
          letterSpacing: "0.04em",
        }}
      >
        {label}
        {required && <span style={{ color: "#EF4444", marginLeft: "2px" }}>*</span>}
      </label>
      {children}
      {hint && !error && (
        <span style={{ fontSize: "11px", color: "var(--hora-gold)", marginTop: "4px", display: "block" }}>
          {hint}
        </span>
      )}
      {error && (
        <span style={{ fontSize: "11px", color: "#EF4444", marginTop: "4px", display: "block" }}>
          ⚠️ {error}
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles object
// ─────────────────────────────────────────────────────────────────────────────

const styles = {
  card: {
    backgroundColor: "var(--hora-dark-card)",
    border: "1px solid var(--hora-dark-border)",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "12px",
    width: "100%",
    boxSizing: "border-box" as const,
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "16px",
  },
  cardIcon: {
    fontSize: "18px",
    color: "var(--hora-gold)",
  },
  cardTitle: {
    fontSize: "15px",
    fontWeight: 700,
    color: "var(--hora-gold)",
    fontFamily: "'Playfair Display', serif",
  },
  input: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.04)",
    border: "1px solid var(--hora-dark-border)",
    borderRadius: "8px",
    padding: "12px",
    color: "var(--hora-text)",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box" as const,
    fontFamily: "inherit",
    transition: "border-color 0.15s",
  },
  fieldRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
    paddingBottom: "10px",
    borderBottom: "1px solid rgba(201,169,110,0.06)",
  },
  fieldLabel: {
    fontSize: "12px",
    color: "var(--hora-text-muted)",
    flexShrink: 0,
  },
  fieldValue: {
    fontSize: "14px",
    color: "var(--hora-text)",
    fontWeight: 500,
    textAlign: "right" as const,
  },
  editBtn: {
    background: "transparent",
    border: "1px solid var(--hora-dark-border)",
    borderRadius: "6px",
    color: "var(--hora-gold)",
    fontSize: "12px",
    padding: "4px 10px",
    cursor: "pointer",
  },
  btnPrimary: {
    flex: 2,
    padding: "13px",
    borderRadius: "8px",
    background: "var(--hora-gold)",
    color: "#0A0806",
    fontWeight: 700,
    fontSize: "14px",
    border: "none",
    cursor: "pointer",
  },
  btnSecondary: {
    flex: 1,
    padding: "13px",
    borderRadius: "8px",
    background: "transparent",
    color: "var(--hora-text-muted)",
    fontWeight: 500,
    fontSize: "14px",
    border: "1px solid var(--hora-dark-border)",
    cursor: "pointer",
  },
  successBanner: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    border: "1px solid rgba(16, 185, 129, 0.3)",
    borderRadius: "8px",
    padding: "10px 12px",
    color: "#10B981",
    fontSize: "13px",
    marginBottom: "14px",
  },
} as const;
