import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { Link, useLoaderData } from "@remix-run/react";
import { getUser } from "~/services/auth.server";
import type { Env } from "~/env.server";
import { PublicLayout } from "~/components/public/PublicLayout";
import { AstralIcon } from "~/components/ui/AstralIcon";

export const meta: MetaFunction = () => [
  { title: "ข้อกำหนดและเงื่อนไขการให้บริการ — PhopePhum (ภพภูมิ)" },
  {
    name: "description",
    content: "ข้อกำหนดและเงื่อนไขการใช้บริการแพลตฟอร์ม PhopePhum (ภพภูมิ) สิทธิ์ ความรับผิดชอบ และหลักจริยธรรมของระบบ",
  },
  { property: "og:title", content: "ข้อกำหนดและเงื่อนไขการให้บริการ — PhopePhum" },
  { property: "og:url", content: "https://phopephum.com/terms" },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await getUser(request, env).catch(() => null);
  return json({ isLoggedIn: !!user });
}

export default function TermsPage() {
  const { isLoggedIn } = useLoaderData<typeof loader>();

  return (
    <PublicLayout isLoggedIn={isLoggedIn}>
      
      <section className="pt-16 pb-10 px-4 sm:px-6 max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-xs font-semibold uppercase tracking-wider mb-4">
          <AstralIcon name="balance" size="sm" />
          <span>LEGAL COMPLIANCE</span>
        </div>
        <h1 className="font-display text-3xl sm:text-5xl font-bold text-slate-900 dark:text-[#F8F6F1] mb-3">
          ข้อกำหนดและเงื่อนไขการใช้บริการ
        </h1>
        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-400">
          มีผลบังคับใช้ตั้งแต่วันที่ 1 มกราคม 2569 • ปรับปรุงล่าสุด กันยายน 2569
        </p>
      </section>

      <section className="pb-20 px-4 sm:px-6 max-w-4xl mx-auto">
        <div className="p-8 sm:p-12 rounded-3xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-white/[0.03] backdrop-blur-xl space-y-8 text-sm sm:text-base leading-relaxed text-slate-700 dark:text-slate-300">
          
          <div>
            <h2 className="font-display font-bold text-xl text-slate-900 dark:text-[#F8F6F1] mb-3">
              1. การยอมรับข้อกำหนด
            </h2>
            <p>
              ยินดีต้อนรับสู่ <strong>PhopePhum (ภพภูมิ)</strong> ดำเนินการโดยสถาบันปัญญาและกาลเวลาชีวิต เมื่อคุณสมัครสมาชิก ลงชื่อเข้าใช้ หรือเข้าถึงส่วนใดส่วนหนึ่งของเว็บไซต์หรือบริการของเรา ถือว่าคุณได้อ่าน เข้าใจ และตกลงที่จะผูกพันตามข้อกำหนดและเงื่อนไขเหล่านี้ หากคุณไม่ยอมรับข้อกำหนดเหล่านี้ โปรดระงับการใช้งานระบบทันที
            </p>
          </div>

          <div>
            <h2 className="font-display font-bold text-xl text-slate-900 dark:text-[#F8F6F1] mb-3">
              2. คำอธิบายบริการและเจตนารมณ์ของระบบ
            </h2>
            <p>
              PhopePhum เป็นระบบปฏิบัติการปัญญาและกาลเวลาชีวิต (Living Wisdom Operating System) ให้บริการเครื่องมือคำนวณปฏิทินจันทรคติไทยแท้ 100 ปี ยามอัฏฐกาล ผังเลข ๗ ตัว ๙ ฐาน และคำแนะนำจาก Wisdom AI เพื่อเป็นเข็มทิศส่งเสริมสติ สมาธิ และการตระหนักรู้ในการวางแผนชีวิต
            </p>
          </div>

          <div>
            <h2 className="font-display font-bold text-xl text-slate-900 dark:text-[#F8F6F1] mb-3">
              3. ข้อจำกัดความรับผิดและหลักจริยธรรม (Disclaimer of Warranties)
            </h2>
            <p className="mb-2">
              คำแนะนำ การวิเคราะห์ยาม หรือบทสนทนากับ Wisdom AI บนแพลตฟอร์มนี้ <strong>มิใช่การรับประกันผลลัพธ์ในอนาคต</strong> และไม่สามารถนำไปใช้ทดแทนคำแนะนำจากผู้เชี่ยวชาญเฉพาะทางได้ เช่น:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li><strong>การแพทย์และสุขภาพจิต</strong>: มิใช่การวินิจฉัยหรือบำบัดรักษาโรค</li>
              <li><strong>การเงินและการลงทุน</strong>: มิใช่คำแนะนำทางการเงินหรือการชักชวนให้ลงทุน</li>
              <li><strong>กฎหมายและคดีความ</strong>: มิใช่คำแนะนำทางกฎหมายจากทนายความ</li>
            </ul>
            <p className="mt-2">
              ผู้ใช้งานตกลงที่จะใช้ดุลยพินิจ สติปัญญา และความรับผิดชอบของตนเองอย่างเต็มที่ในการตัดสินใจใดๆ ทางธุรกิจหรือชีวิตส่วนบุคคล
            </p>
          </div>

          <div>
            <h2 className="font-display font-bold text-xl text-slate-900 dark:text-[#F8F6F1] mb-3">
              4. บัญชีผู้ใช้และความปลอดภัยของรหัสผ่าน
            </h2>
            <p>
              คุณมีหน้าที่รับผิดชอบในการรักษาความลับของรหัสผ่านและข้อมูลบัญชีของคุณ รวมถึงการกระทำใดๆ ที่เกิดขึ้นภายใต้บัญชีของคุณ หากพบการเข้าถึงโดยไม่ได้รับอนุญาต โปรดแจ้งทีมงานของเราทันที
            </p>
          </div>

          <div>
            <h2 className="font-display font-bold text-xl text-slate-900 dark:text-[#F8F6F1] mb-3">
              5. แผนสมาชิก การชำระเงิน และละอองทรายกาลเวลา (Sands of Time)
            </h2>
            <p>
              PhopePhum มีทั้งแผนบริการฟรีตลอดชีพและแผนพรีเมียม (Basic ฿89/เดือน, Pro ฿289/เดือน, Pro Annual ฿2,790/ปี, Imperial ฿789 ตลอดชีพ) รวมถึงชุดละอองทรายกาลเวลา (50 เม็ด = ฿59, 150 เม็ด = ฿149, 500 เม็ด = ฿399) ซึ่งมีราคาเป็นไปตามที่กำหนดไว้อย่างเป็นทางการบนหน้าเว็บไซต์ การชำระเงินทุกรายการมีความโปร่งใสและปลอดภัยผ่านผู้ให้บริการที่ได้มาตรฐานสากล
            </p>
          </div>

          <div>
            <h2 className="font-display font-bold text-xl text-slate-900 dark:text-[#F8F6F1] mb-3">
              6. ทรัพย์สินทางปัญญา
            </h2>
            <p>
              สูตรคำนวณปฏิทิน 100 ปี โค้ดโปรแกรม ฐานข้อมูลคำทำนายยาม กราฟิก และเนื้อหาบนเว็บไซต์นี้ เป็นทรัพย์สินทางปัญญาของ PhopePhum ห้ามมิให้ทำซ้ำ ดัดแปลง แจกจ่าย หรือนำไปใช้ในเชิงพาณิชย์โดยไม่ได้รับอนุญาตเป็นลายลักษณ์อักษร
            </p>
          </div>

          <div>
            <h2 className="font-display font-bold text-xl text-slate-900 dark:text-[#F8F6F1] mb-3">
              7. กฎหมายที่ใช้บังคับ
            </h2>
            <p>
              ข้อกำหนดและเงื่อนไขนี้อยู่ภายใต้การบังคับใช้และตีความตามกฎหมายแห่งราชอาณาจักรไทย ข้อพิพาทใดๆ ที่เกิดขึ้นจะต้องอยู่ภายใต้เขตอำนาจศาลแห่งประเทศไทย
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
