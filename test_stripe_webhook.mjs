/**
 * test_stripe_webhook.mjs
 * Script สำหรับจำลองสัญญาณ Stripe Webhook เพื่อทดสอบระบบ Upgrade อัตโนมัติ
 * วิธีใช้: node test_stripe_webhook.mjs <USER_ID> <PLAN_ID>
 */

const userId = process.argv[2];
const planId = process.argv[3] || 'pro';

if (!userId) {
  console.log("❌ กรุณาระบุ User ID");
  process.exit(1);
}

const WEBHOOK_URL = "http://localhost:5173/api/webhook/stripe"; 

const mockEvent = {
  type: "checkout.session.completed",
  data: {
    object: {
      amount_total: planId === 'pro' ? 25900 : planId === 'imperial' ? 78900 : 900,
      currency: "thb",
      metadata: {
        userId: userId,
        planId: planId,
        referralCode: "" // ใส่ Referral Code ถ้าต้องการทดสอบ Affiliate
      }
    }
  }
};

console.log(`🚀 กำลังจำลอง Stripe Webhook สำหรับ User: ${userId} (Plan: ${planId})...`);

try {
  const response = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "stripe-signature": "mock_signature" // ในระบบจริงต้องใช้ signature จริง
    },
    body: JSON.stringify(mockEvent)
  });

  if (response.ok) {
    console.log("✅ จำลองสำเร็จ! กรุณาเช็คหน้า Dashboard และอีเมลของคุณ");
  } else {
    console.log(`❌ จำลองล้มเหลว: ${response.status}`);
    const text = await response.text();
    console.log(text);
  }
} catch (error) {
  console.error("❌ เกิดข้อผิดพลาดในการเชื่อมต่อ:", error.message);
}
