/**
 * test_payment_flow.mjs
 * Script สำหรับจำลองสัญญาณ Webhook จาก GBPrimePay เพื่อทดสอบระบบ Upgrade อัตโนมัติ
 * วิธีใช้: node test_payment_flow.mjs <REQUEST_ID> <PLAN>
 */

const requestId = process.argv[2];
const plan = process.argv[3] || 'pro';

if (!requestId) {
  console.log("❌ กรุณาระบุ Request ID (ได้จากหน้า Payment Modal หรือตาราง subscription_requests)");
  process.exit(1);
}

// เปลี่ยนเป็น URL ของคุณ (เช่น http://localhost:5173 หรือ Production URL)
const WEBHOOK_URL = "http://localhost:5173/api/webhook/gbprimepay"; 

const mockPayload = {
  referenceNo: requestId,
  resultCode: "00", // "00" หมายถึงจ่ายสำเร็จตามสเปค GB
  amount: plan === 'pro' ? 259.00 : plan === 'imperial' ? 789.00 : 9.00,
  currency: "THB",
  status: "success"
};

console.log(`🚀 กำลังจำลองการจ่ายเงินสำหรับ Request: ${requestId} (Plan: ${plan})...`);

try {
  const response = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(mockPayload)
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
