import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { Link, useLoaderData } from "@remix-run/react";
import { getUser } from "~/services/auth.server";
import type { Env } from "~/env.server";
import { PublicLayout } from "~/components/public/PublicLayout";
import { AstralIcon } from "~/components/ui/AstralIcon";

export const meta: MetaFunction = () => [
  { title: "วิธีการทำงาน & กลไกคำนวณ — PhopePhum (ภพภูมิ)" },
  {
    name: "description",
    content: "เข้าใจวิธีการทำงานเบื้องหลัง PhopePhum: ปฏิทินจันทรคติไทย 100 ปีแท้, กฎตัดวัน 06:00 น., ระบบยามอัฏฐกาลตามแดดจริง, และการสังเคราะห์ปัญญาด้วย Wisdom AI",
  },
  { property: "og:title", content: "วิธีการทำงาน & กลไกคำนวณ — PhopePhum (ภพภูมิ)" },
  {
    property: "og:description",
    content: "ผสานดาราศาสตร์ไทยโบราณแท้เข้ากับปัญญาประดิษฐ์ AI ยุคใหม่",
  },
  { property: "og:url", content: "https://phopephum.com/how-it-works" },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await getUser(request, env).catch(() => null);
  return json({ isLoggedIn: !!user });
}

export default function HowItWorksPage() {
  const { isLoggedIn } = useLoaderData<typeof loader>();

  return (
    <PublicLayout isLoggedIn={isLoggedIn}>
      
      {/* Header */}
      <section className="pt-16 pb-12 px-4 sm:px-6 max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-[#8C6D2D] dark:text-[#D9BC82] text-xs font-semibold uppercase tracking-wider mb-4">
          <AstralIcon name="timeline" size="sm" />
          <span>AUTHENTIC ASTRONOMY & AI ENGINE</span>
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold text-slate-900 dark:text-[#F8F6F1] mb-4">
          วิธีการทำงานของ PhopePhum
        </h1>
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300">
          ผสานสูตรคำนวณดาราศาสตร์ตามคัมภีร์สุริยยาตร์ไทยแท้ 100 ปี เข้ากับโครงข่ายประสาทเทียม Wisdom AI เพื่อผลลัพธ์ที่แม่นยำและนำไปใช้ได้จริง
        </p>
      </section>

      {/* 3 Main Pillars of Engine */}
      <section className="pb-20 px-4 sm:px-6 max-w-4xl mx-auto space-y-12">
        
        {/* Step 1: Authentic Thai Lunar Calendar */}
        <div className="p-8 sm:p-10 rounded-3xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-white/[0.03] backdrop-blur-xl">
          <div className="flex items-center gap-3 text-[#8C6D2D] dark:text-[#C6A96B] font-bold text-sm uppercase tracking-wider mb-3">
            <AstralIcon name="portal" size="md" />
            <span>01 • ปฏิทินจันทรคติไทยแท้ 100 ปี (Thai Lunar Astronomical Table)</span>
          </div>
          <h2 className="font-display font-bold text-2xl text-slate-900 dark:text-[#F8F6F1] mb-4">
            ถูกต้องตามคัมภีร์สุริยยาตร์ ไม่ใช้วิธีปัดเศษสากล
          </h2>
          <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            <p>
              แอปพลิเคชันดูดวงทั่วไปมักใช้ปฏิทินสากลหรือแปลงวันแบบง่ายๆ ทำให้เกิดข้อผิดพลาดในการคำนวณขึ้น-แรม และเดือนแปดสองหน (อธิกมาส) แต่ใน PhopePhum:
            </p>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li><strong>กฎตัดวัน 06:00 น.</strong>: ยึดถือคติไทยโบราณที่เปลี่ยนวันใหม่เมื่อพระอาทิตย์ขึ้น (06:00 น.) ไม่ใช่เที่ยงคืนสากล ทำให้คนเกิดหลังเที่ยงคืนถึงเช้าตรู่ได้รหัสวันเกิดที่ถูกต้อง</li>
              <li><strong>ตารางอธิกมาส & อธิกวาร 100 ปี</strong>: ระบุปีที่มีเดือน ๘ สองหน และปีที่มีแรม ๑๕ ค่ำ เดือน ๗ อย่างแม่นยำตลอดช่วง 100 ปี (พ.ศ. 2480 - 2580)</li>
              <li><strong>ระบบเลข ๗ ตัว Modulo-7 แท้</strong>: คำนวณฐาน 1 ถึง 7 ตามหลักโหราศาสตร์ไทยโบราณ ไม่ใช่การบวกเลขเป็นหลักเดียว (Digit Root) แบบตะวันตก</li>
            </ul>
          </div>
        </div>

        {/* Step 2: Solar Yam Calculation */}
        <div className="p-8 sm:p-10 rounded-3xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-white/[0.03] backdrop-blur-xl">
          <div className="flex items-center gap-3 text-[#8C6D2D] dark:text-[#C6A96B] font-bold text-sm uppercase tracking-wider mb-3">
            <AstralIcon name="sandglass" size="md" />
            <span>02 • ยามอัฏฐกาล ๑๖ ยามตามแดดจริง (Real Solar Altitude)</span>
          </div>
          <h2 className="font-display font-bold text-2xl text-slate-900 dark:text-[#F8F6F1] mb-4">
            คำนวณตามเวลาอาทิตย์ขึ้น-ตกจริงในแต่ละวัน
          </h2>
          <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            <p>
              ยามอัฏฐกาลโบราณแบ่งเวลากลางวันเป็น 8 ยาม และกลางคืนเป็น 8 ยาม โดยแต่ละยามไม่ได้ยาว 90 นาทีเท่ากันทุกวัน แต่ขึ้นอยู่กับความยาวของเวลากลางวันและกลางคืนตามฤดูกาล:
            </p>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li>ระบบจะคำนวณเวลาพระอาทิตย์ขึ้นและพระอาทิตย์ตกจริงในแต่ละวัน แล้วจึงแบ่งยามอย่างสมมาตร</li>
              <li>ตรวจจับและจัดระดับ "ยามศุภโชค", "ยามอุบาทว์", "ยามกาลกิณี" อย่างละเอียด</li>
              <li>มาพร้อมนาฬิกา Real-time Countdown ช่วยให้คุณรู้ว่าเหลือเวลาอีกกี่นาทีในยามมงคลปัจจุบัน</li>
            </ul>
          </div>
        </div>

        {/* Step 3: Wisdom AI Architecture */}
        <div className="p-8 sm:p-10 rounded-3xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-white/[0.03] backdrop-blur-xl">
          <div className="flex items-center gap-3 text-[#8C6D2D] dark:text-[#C6A96B] font-bold text-sm uppercase tracking-wider mb-3">
            <AstralIcon name="wisdom" size="md" />
            <span>03 • ปัญญาประดิษฐ์เชิงสัจธรรม (Wisdom AI Engine)</span>
          </div>
          <h2 className="font-display font-bold text-2xl text-slate-900 dark:text-[#F8F6F1] mb-4">
            สังเคราะห์จากดวงชะตาส่วนบุคคล ไม่ใช่อ่านดวงรวม
          </h2>
          <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            <p>
              เมื่อคุณตั้งคำถามหรือเปิดหน้าแดชบอร์ด Wisdom AI จะทำงานในกระบวนการ 4 ขั้นตอน:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                <p className="font-bold text-slate-900 dark:text-[#F8F6F1] text-xs mb-1">1. ถอดรหัสโครงสร้างดวง</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">ดึงตำแหน่งดาวเสวยอายุ ฐานพลังงาน และทักษาจร</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                <p className="font-bold text-slate-900 dark:text-[#F8F6F1] text-xs mb-1">2. ตรวจสอบกาลเวลาปัจจุบัน</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">วิเคราะห์ยามสดและพลังงานของวันที่ตั้งคำถาม</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                <p className="font-bold text-slate-900 dark:text-[#F8F6F1] text-xs mb-1">3. กรองด้วยหลักสติปัฏฐาน</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">คัดกรองคำตอบไม่ให้เกิดความตระหนก มุ่งเน้นการมีสติ</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                <p className="font-bold text-slate-900 dark:text-[#F8F6F1] text-xs mb-1">4. ส่งมอบคำแนะนำเชิงกลยุทธ์</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">เสนอทางเลือกและการตัดสินใจที่นำไปทำได้จริง</p>
              </div>
            </div>
          </div>
        </div>

      </section>

      {/* CTA Bottom */}
      <section className="py-16 text-center px-4 max-w-3xl mx-auto border-t border-slate-200/80 dark:border-white/10">
        <h2 className="font-display text-3xl font-bold text-slate-900 dark:text-[#F8F6F1] mb-3">
          สัมผัสความแม่นยำแห่งปัญญาด้วยตัวคุณเอง
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
          สมัครสมาชิกฟรี 1 นาทีเพื่อเริ่มต้นสำรวจผังดวงและยามของคุณ
        </p>
        <Link
          to="/register"
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] text-[#020617] shadow-lg shadow-[#C6A96B]/25 hover:scale-102 transition-all"
        >
          <span>เริ่มต้นใช้งานฟรี</span>
          <span>→</span>
        </Link>
      </section>

    </PublicLayout>
  );
}
