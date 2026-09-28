import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { Link, useLoaderData } from "@remix-run/react";
import { getUser } from "~/services/auth.server";
import type { Env } from "~/env.server";
import { AstralIcon } from "~/components/ui/AstralIcon";

export const meta: MetaFunction = () => [
  { title: "สัญญาข้อกำหนดและเงื่อนไขพันธมิตร v2026.1 — PhopePhum Partner Agreement" },
  {
    name: "description",
    content: "ข้อกำหนดและเงื่อนไขการเข้าร่วมโครงการพันธมิตรและนักพยากรณ์อิสระ แพลตฟอร์ม PhopePhum (ภพภูมิ) ฉบับ v2026.1",
  },
  { property: "og:title", content: "สัญญาพันธมิตร PhopePhum Partner Agreement v2026.1" },
  { property: "og:url", content: "https://phopephum.com/terms/partner-v2026.1.pdf" },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await getUser(request, env).catch(() => null);
  return json({ isLoggedIn: !!user });
}

export default function PartnerTermsDocument() {
  const { isLoggedIn } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-[#020617] text-[#F8F6F1] font-sans antialiased selection:bg-[#C6A96B]/30 selection:text-[#F8F6F1] print:bg-white print:text-black">
      {/* ── Top Bar Navigation (Hidden in Print) ── */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#020617]/80 backdrop-blur-md px-4 sm:px-8 py-3.5 print:hidden">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            to="/dashboard/partner"
            className="text-xs font-bold text-[#C6A96B] hover:text-[#D9BC82] transition-colors inline-flex items-center gap-1.5 uppercase tracking-wider"
          >
            <span>←</span> กลับสู่ระบบพันธมิตร
          </Link>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-1.5 rounded-xl border border-[#C6A96B]/40 bg-[#C6A96B]/10 hover:bg-[#C6A96B]/20 text-[#C6A96B] text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            >
              <span>🖨️</span>
              <span>พิมพ์ / บันทึกเป็น PDF</span>
            </button>
            <Link
              to={isLoggedIn ? "/dashboard" : "/"}
              className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-all"
            >
              หน้าแรก
            </Link>
          </div>
        </div>
      </header>

      {/* ── Main Document Sheet ── */}
      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-8 sm:py-12 print:p-0 print:max-w-none">
        <div className="rounded-3xl border border-white/10 bg-[#0B1528]/60 backdrop-blur-xl p-6 sm:p-12 shadow-2xl space-y-8 print:border-none print:bg-transparent print:p-0 print:shadow-none">
          
          {/* Header Badge & Title */}
          <div className="border-b border-white/10 pb-8 text-center sm:text-left flex flex-col sm:flex-row sm:items-end justify-between gap-4 print:border-b-2 print:border-black">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#C6A96B]/30 bg-[#C6A96B]/10 text-[#C6A96B] text-[11px] font-bold tracking-widest uppercase mb-3 print:border-black print:text-black">
                <AstralIcon name="crown" size="sm" />
                <span>OFFICIAL PARTNER AGREEMENT</span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#F8F6F1] tracking-tight print:text-black">
                ข้อกำหนดและสัญญาการเข้าร่วมโครงการพันธมิตร
              </h1>
              <p className="text-xs text-[#94A3B8] mt-1 print:text-gray-700">
                PhopePhum Living Wisdom OS Partner & Affiliate Program Agreement (ฉบับ v2026.1)
              </p>
            </div>
            <div className="text-right sm:text-right font-mono text-[11px] text-[#94A3B8] space-y-0.5 print:text-gray-800">
              <p>รหัสเอกสาร: <strong>TERMS-v2026.1</strong></p>
              <p>วันที่มีผลบังคับใช้: <strong>1 มกราคม 2569</strong></p>
              <p>สถานะ: <strong className="text-emerald-400 print:text-black">ACTIVE (มีผลบังคับใช้)</strong></p>
            </div>
          </div>

          {/* Document Content Sections */}
          <div className="space-y-8 text-sm sm:text-base leading-relaxed text-slate-300 print:text-black">
            
            {/* 1. คำนำและคู่สัญญา */}
            <section className="space-y-2">
              <h2 className="font-display font-bold text-lg text-[#F8F6F1] flex items-center gap-2 print:text-black">
                <span className="text-[#C6A96B] print:text-black">1.</span> บททั่วไปและคู่สัญญา
              </h2>
              <p>
                สัญญานี้ทำขึ้นระหว่าง <strong>แพลตฟอร์ม PhopePhum (ภพภูมิ)</strong> โดย บริษัท แคป วิชั่น อินสติทิวท์ จำกัด (ต่อไปนี้จะเรียกว่า <em>"ผู้ให้บริการ"</em>) ฝ่ายหนึ่ง กับ <strong>บุคคลหรือนิติบุคคลที่สมัครเข้าร่วมเป็นพันธมิตร</strong> (ต่อไปนี้จะเรียกว่า <em>"พันธมิตร"</em> หรือ <em>"Partner"</em>) อีกฝ่ายหนึ่ง
              </p>
              <p>
                เมื่อพันธมิตรกดยอมรับข้อกำหนดในระบบ ถือว่าพันธมิตรได้อ่าน เข้าใจ และยินยอมผูกพันตามเงื่อนไขทุกประการในสัญญานี้
              </p>
            </section>

            {/* 2. นิยามศัพท์สำคัญ */}
            <section className="space-y-2">
              <h2 className="font-display font-bold text-lg text-[#F8F6F1] flex items-center gap-2 print:text-black">
                <span className="text-[#C6A96B] print:text-black">2.</span> นิยามศัพท์ (Definitions)
              </h2>
              <ul className="list-disc list-inside space-y-1.5 pl-2 text-xs sm:text-sm">
                <li><strong>รหัสพันธมิตร (Partner Code / Link):</strong> ลิงก์หรือรหัสอ้างอิงเฉพาะตัวที่ระบบออกให้เพื่อใช้วัดผลการแนะนำผู้ใช้งาน</li>
                <li><strong>ผู้ใช้ที่ได้รับการแนะนำ (Referred User):</strong> ผู้ใช้งานใหม่ที่ลงทะเบียนผ่านรหัสพันธมิตรของท่าน และได้รับการบันทึก Attribution ในระบบอย่างถูกต้อง</li>
                <li><strong>ฐานคำนวณคอมมิชชัน (Net Commission Base):</strong> ยอดชำระค่าบริการสุทธิหลังจากหักภาษีมูลค่าเพิ่ม (VAT 7%) และส่วนลดทางการค้าแล้ว</li>
                <li><strong>ระยะเวลาพักเงิน (Holding Period 14 วัน):</strong> ระยะเวลากักยอดคอมมิชชันไว้ชั่วคราวเพื่อป้องกันการปฏิเสธยอดเงิน (Chargeback) หรือการขอคืนเงิน (Refund)</li>
              </ul>
            </section>

            {/* 3. โครงสร้างผลตอบแทนและคอมมิชชัน */}
            <section className="space-y-3">
              <h2 className="font-display font-bold text-lg text-[#F8F6F1] flex items-center gap-2 print:text-black">
                <span className="text-[#C6A96B] print:text-black">3.</span> โครงสร้างผลตอบแทนและส่วนแบ่งรายได้ (Commission Tier)
              </h2>
              <p>
                พันธมิตรจะได้รับค่าตอบแทนเมื่อผู้ใช้ที่ท่านแนะนำมีการสมัครสมาชิกหรือซื้อแพ็กเกจบนระบบ ตามอัตราขั้นบันไดดังต่อไปนี้:
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm border border-white/10 rounded-xl overflow-hidden print:border-black">
                  <thead className="bg-white/5 print:bg-gray-100 text-[#C6A96B] print:text-black font-bold">
                    <tr>
                      <th className="p-3">ระดับพันธมิตร (Tier)</th>
                      <th className="p-3">ยอดผู้ใช้สะสม</th>
                      <th className="p-3">ส่วนแบ่งคอมมิชชัน</th>
                      <th className="p-3">การคิดรอบบิล</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 print:divide-gray-300">
                    <tr>
                      <td className="p-3 font-semibold text-[#F8F6F1] print:text-black">Silver Partner</td>
                      <td className="p-3">1 – 20 ราย</td>
                      <td className="p-3 text-emerald-400 font-mono font-bold print:text-black">20%</td>
                      <td className="p-3">ทุกรอบบิลตลอดอายุการใช้งาน</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-[#F8F6F1] print:text-black">Gold Partner</td>
                      <td className="p-3">21 – 50 ราย</td>
                      <td className="p-3 text-emerald-400 font-mono font-bold print:text-black">25%</td>
                      <td className="p-3">ทุกรอบบิลตลอดอายุการใช้งาน</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-[#F8F6F1] print:text-black">Platinum Master</td>
                      <td className="p-3">51 รายขึ้นไป</td>
                      <td className="p-3 text-emerald-400 font-mono font-bold print:text-black">30%</td>
                      <td className="p-3">ทุกรอบบิลตลอดอายุการใช้งาน</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* 4. การพักเงินและการเบิกจ่าย */}
            <section className="space-y-2">
              <h2 className="font-display font-bold text-lg text-[#F8F6F1] flex items-center gap-2 print:text-black">
                <span className="text-[#C6A96B] print:text-black">4.</span> ระยะเวลาพักเงิน (14-Day Holding) และการเบิกจ่าย
              </h2>
              <p>
                4.1 คอมมิชชันที่เกิดขึ้นจะอยู่ในสถานะ <em>Holding (รอครบกำหนด)</em> เป็นเวลา 14 วันนับจากวันที่ลูกค้าชำระเงินสำเร็จ เมื่อพ้นกำหนดแล้วยอดเงินจะถูกโอนเข้าสู่ <em>Available Balance (ยอดพร้อมเบิก)</em> โดยอัตโนมัติ
              </p>
              <p>
                4.2 การยื่นคำขอเบิกเงิน (Payout Request) มียอดขั้นต่ำ <strong>500.00 บาท</strong> โดยเงินจะถูกโอนเข้าบัญชีธนาคารในประเทศไทยที่ระบุไว้
              </p>
            </section>

            {/* 5. ภาษีหัก ณ ที่จ่าย และใบ 50 ทวิ */}
            <section className="space-y-2">
              <h2 className="font-display font-bold text-lg text-[#F8F6F1] flex items-center gap-2 print:text-black">
                <span className="text-[#C6A96B] print:text-black">5.</span> การหักภาษี ณ ที่จ่าย (Withholding Tax) และหนังสือรับรอง 50 ทวิ
              </h2>
              <p>
                ผู้ให้บริการจะดำเนินการหักภาษี ณ ที่จ่ายตามที่ประมวลรัษฎากรกำหนด:
              </p>
              <ul className="list-disc list-inside space-y-1 pl-2 text-xs sm:text-sm">
                <li><strong>บุคคลธรรมดา:</strong> หักภาษี ณ ที่จ่าย 3% (ประเภทเงินได้ตามมาตรา 40(2) หรือ 40(8))</li>
                <li><strong>นิติบุคคล:</strong> หักภาษี ณ ที่จ่าย 3% พร้อมออกหนังสือรับรองการหักภาษี ณ ที่จ่าย (ใบ 50 ทวิ) ในรูปแบบอิเล็กทรอนิกส์ (e-Withholding Tax)</li>
              </ul>
            </section>

            {/* 6. ข้อห้ามและจริยธรรม */}
            <section className="space-y-2">
              <h2 className="font-display font-bold text-lg text-[#F8F6F1] flex items-center gap-2 print:text-black">
                <span className="text-[#C6A96B] print:text-black">6.</span> ข้อห้ามและหลักจริยธรรมของพันธมิตร (Code of Conduct)
              </h2>
              <p>พันธมิตรตกลงที่จะไม่กระทำการดังต่อไปนี้:</p>
              <ul className="list-disc list-inside space-y-1 pl-2 text-xs sm:text-sm text-rose-300 print:text-black">
                <li>การส่งสแปม (Spamming) ในช่องทางที่ไม่ได้รับอนุญาต</li>
                <li>การโฆษณาชวนเชื่อที่เกินจริง หรือสัญญาผลลัพธ์ดวงชะตาที่ผิดหลักจริยธรรม</li>
                <li>การสร้างบัญชีปลอม หรือซื้อแพ็กเกจด้วยตนเองผ่านรหัสของตนเอง (Self-Referral Fraud)</li>
                <li>การเสนอขายตัดราคา หรืออ้างสิทธิ์ในเครื่องหมายการค้าโดยไม่ได้รับอนุญาต</li>
              </ul>
              <p className="text-xs text-slate-400 print:text-gray-700">
                * หากตรวจพบการฝ่าฝืน ผู้ให้บริการขอสงวนสิทธิ์ในการระงับบัญชีพันธมิตรและระงับการจ่ายผลประโยชน์ที่เกิดจากการทุจริตทันที
              </p>
            </section>

            {/* 7. การบอกเลิกสัญญา */}
            <section className="space-y-2">
              <h2 className="font-display font-bold text-lg text-[#F8F6F1] flex items-center gap-2 print:text-black">
                <span className="text-[#C6A96B] print:text-black">7.</span> การแก้ไขสัญญาและระยะเวลาบังคับใช้
              </h2>
              <p>
                สัญญานี้มีผลบังคับใช้นับแต่วันที่พันธมิตรกดยอมรับ จนกว่าจะมีการบอกเลิกสัญญาจากฝ่ายใดฝ่ายหนึ่ง โดยผู้ให้บริการขอสงวนสิทธิ์ในการปรับปรุงเงื่อนไขสัญญาตามความเหมาะสม ซึ่งจะแจ้งให้พันธมิตรทราบล่วงหน้าผ่านทางระบบแดชบอร์ด
              </p>
            </section>

          </div>

          {/* Signature / Certification Footer */}
          <div className="border-t border-white/10 pt-8 mt-10 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs text-[#94A3B8] print:border-black print:text-black">
            <div className="space-y-1">
              <p className="font-bold text-[#F8F6F1] print:text-black">ผู้ให้บริการ (Platform Provider):</p>
              <p>บริษัท แคป วิชั่น อินสติทิวท์ จำกัด (CAP Vision Institute)</p>
              <p>แพลตฟอร์ม PhopePhum Living Wisdom OS</p>
              <p>ระบบการเงินและภาษี: Electronic Partner Ledger v3</p>
            </div>
            <div className="space-y-1 sm:text-right">
              <p className="font-bold text-[#F8F6F1] print:text-black">การรับรองทางอิเล็กทรอนิกส์ (Electronic Consent):</p>
              <p>เอกสารฉบับนี้มีผลผูกพันทางกฎหมายตาม พ.ร.บ. ธุรกรรมทางอิเล็กทรอนิกส์</p>
              <p>บันทึกประทับเวลา (Timestamp) & IP Address อัตโนมัติเมื่อกดลงนาม</p>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
