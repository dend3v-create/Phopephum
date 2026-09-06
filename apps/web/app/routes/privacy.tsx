import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { Link, useLoaderData } from "@remix-run/react";
import { getUser } from "~/services/auth.server";
import type { Env } from "~/env.server";
import { PublicLayout } from "~/components/public/PublicLayout";
import { AstralIcon } from "~/components/ui/AstralIcon";

export const meta: MetaFunction = () => [
  { title: "นโยบายความเป็นส่วนตัว (PDPA) — PhopePhum (ภพภูมิ)" },
  {
    name: "description",
    content: "นโยบายความเป็นส่วนตัวและการคุ้มครองข้อมูลส่วนบุคคลตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA) ของ PhopePhum",
  },
  { property: "og:title", content: "นโยบายความเป็นส่วนตัว (PDPA) — PhopePhum" },
  { property: "og:url", content: "https://phopephum.com/privacy" },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await getUser(request, env).catch(() => null);
  return json({ isLoggedIn: !!user });
}

export default function PrivacyPage() {
  const { isLoggedIn } = useLoaderData<typeof loader>();

  return (
    <PublicLayout isLoggedIn={isLoggedIn}>
      
      <section className="pt-16 pb-10 px-4 sm:px-6 max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-4">
          <AstralIcon name="balance" size="sm" />
          <span>PDPA COMPLIANT</span>
        </div>
        <h1 className="font-display text-3xl sm:text-5xl font-bold text-slate-900 dark:text-[#F8F6F1] mb-3">
          นโยบายความเป็นส่วนตัว (Privacy Policy)
        </h1>
        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-400">
          สอดคล้องตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)
        </p>
      </section>

      <section className="pb-20 px-4 sm:px-6 max-w-4xl mx-auto">
        <div className="p-8 sm:p-12 rounded-3xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-white/[0.03] backdrop-blur-xl space-y-8 text-sm sm:text-base leading-relaxed text-slate-700 dark:text-slate-300">
          
          <div>
            <h2 className="font-display font-bold text-xl text-slate-900 dark:text-[#F8F6F1] mb-3">
              1. บทนำและคำมั่นสัญญาของเรา
            </h2>
            <p>
              PhopePhum ตระหนักดีว่าข้อมูลวันเดือนปีเกิด เวลาตกฟาก และคำถามในชีวิตของคุณเป็นข้อมูลที่มีความละเอียดอ่อนยิ่ง เราจึงยึดมั่นในหลักการ <strong>Zero-Knowledge Personal Privacy</strong> โดยจะเก็บรวบรวมและประมวลผลข้อมูลเท่าที่จำเป็นเพื่อการคำนวณผังดวงชะตาและส่งมอบคำแนะนำตามที่คุณร้องขอเท่านั้น
            </p>
          </div>

          <div>
            <h2 className="font-display font-bold text-xl text-slate-900 dark:text-[#F8F6F1] mb-3">
              2. ข้อมูลส่วนบุคคลที่เราจัดเก็บ
            </h2>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li><strong>ข้อมูลบัญชี</strong>: ชื่อ, อีเมล, รหัสผ่านที่ผ่านการแฮช (Hashed Password)</li>
              <li><strong>ข้อมูลทางดาราศาสตร์ตกฟาก</strong>: วัน เดือน ปีเกิด, เวลาเกิด, สถานที่เกิด (ใช้คำนวณพิกัดพระอาทิตย์ขึ้น-ตก)</li>
              <li><strong>ข้อมูลการใช้งาน</strong>: บันทึกเจตจำนงรายวัน (TQM Planner), ประวัติคำถามใน Wisdom Chat, บันทึกการใช้ละอองทรายกาลเวลา</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display font-bold text-xl text-slate-900 dark:text-[#F8F6F1] mb-3">
              3. วัตถุประสงค์ในการประมวลผลข้อมูล
            </h2>
            <p>
              เราใช้ข้อมูลของคุณเพื่อ:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2 mt-2">
              <li>คำนวณผังดวง ๗ ตัว ๙ ฐาน, ผังจักรพรรดิ, มหาทักษา, และยามอัฏฐกาลส่วนบุคคล</li>
              <li>ส่งมอบคำแนะนำที่สอดคล้องกับพื้นดวงชะตาผ่าน Wisdom AI</li>
              <li>จัดการสิทธิ์สมาชิกและบันทึกประวัติการทำธุรกรรม</li>
              <li>พัฒนาเสถียรภาพและความปลอดภัยของระบบ</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display font-bold text-xl text-slate-900 dark:text-[#F8F6F1] mb-3">
              4. การไม่เปิดเผยข้อมูลและการไม่นำไปเทรน AI สาธารณะ
            </h2>
            <p>
              PhopePhum <strong>ไม่มีนโยบายขาย ให้เช่า หรือเปิดเผยข้อมูลส่วนบุคคลของคุณแก่บุคคลภายนอกหรือนายหน้าข้อมูลเด็ดขาด</strong> และเรามีพันธสัญญาว่าจะไม่นำข้อมูลวันตกฟากหรือบทสนทนาของคุณไปใช้เพื่อการฝึกอบรม (Training) โมเดล AI สาธารณะใดๆ ทั้งสิ้น
            </p>
          </div>

          <div>
            <h2 className="font-display font-bold text-xl text-slate-900 dark:text-[#F8F6F1] mb-3">
              5. มาตรการรักษาความปลอดภัยของข้อมูล
            </h2>
            <p>
              เราใช้ระบบ Supabase Row Level Security (RLS) ที่ทำให้ข้อมูลดวงชะตาของคุณเข้าถึงได้เฉพาะบัญชีของคุณเท่านั้น พร้อมการเข้ารหัสการสื่อสารผ่านเครือข่ายด้วยมาตรฐาน TLS 1.3 และจัดเก็บในศูนย์ข้อมูลที่ได้มาตรฐานความปลอดภัยระดับโลก
            </p>
          </div>

          <div>
            <h2 className="font-display font-bold text-xl text-slate-900 dark:text-[#F8F6F1] mb-3">
              6. สิทธิของคุณตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA)
            </h2>
            <p>
              คุณมีสิทธิในการขอเข้าถึง ขอรับสำเนา ขอแก้ไข ขอระงับการใช้ หรือขอลบข้อมูลส่วนบุคคลของคุณทั้งหมดออกจากระบบของเราได้อย่างถาวรผ่านทางหน้าตั้งค่าโปรไฟล์ หรือติดต่อเจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคลของเราที่: <a href="mailto:privacy@phopephum.com" className="text-[#8C6D2D] dark:text-[#C6A96B] underline">privacy@phopephum.com</a>
            </p>
          </div>

        </div>

        <div className="mt-8 text-center">
          <Link to="/" className="text-sm font-semibold text-[#8C6D2D] dark:text-[#C6A96B] hover:underline">
            ← กลับสู่หน้าหลัก PhopePhum
          </Link>
        </div>
      </section>

    </PublicLayout>
  );
}
