import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { Link, useLoaderData } from "@remix-run/react";
import { getUser } from "~/services/auth.server";
import type { Env } from "~/env.server";
import { PublicLayout } from "~/components/public/PublicLayout";
import { AstralIcon } from "~/components/ui/AstralIcon";

export const meta: MetaFunction = () => [
  { title: "นโยบายการคืนเงิน & การยกเลิกสมาชิก — PhopePhum (ภพภูมิ)" },
  {
    name: "description",
    content: "นโยบายการคืนเงินและการยกเลิกการเป็นสมาชิกของ PhopePhum โปร่งใส เป็นธรรม และคุ้มครองผู้บริโภค",
  },
  { property: "og:title", content: "นโยบายการคืนเงิน & การยกเลิกสมาชิก — PhopePhum" },
  { property: "og:url", content: "https://phopephum.com/refund" },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await getUser(request, env).catch(() => null);
  return json({ isLoggedIn: !!user });
}

export default function RefundPage() {
  const { isLoggedIn } = useLoaderData<typeof loader>();

  return (
    <PublicLayout isLoggedIn={isLoggedIn}>
      
      <section className="pt-16 pb-10 px-4 sm:px-6 max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-[#8C6D2D] dark:text-[#D9BC82] text-xs font-semibold uppercase tracking-wider mb-4">
          <AstralIcon name="balance" size="sm" />
          <span>CONSUMER PROTECTION</span>
        </div>
        <h1 className="font-display text-3xl sm:text-5xl font-bold text-slate-900 dark:text-[#F8F6F1] mb-3">
          นโยบายการคืนเงินและการยกเลิกสมาชิก
        </h1>
        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-400">
          ความโปร่งใสและเป็นธรรมต่อผู้ใช้งานคือหลักการทำงานของเรา
        </p>
      </section>

      <section className="pb-20 px-4 sm:px-6 max-w-4xl mx-auto">
        <div className="p-8 sm:p-12 rounded-3xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-white/[0.03] backdrop-blur-xl space-y-8 text-sm sm:text-base leading-relaxed text-slate-700 dark:text-slate-300">
          
          <div>
            <h2 className="font-display font-bold text-xl text-slate-900 dark:text-[#F8F6F1] mb-3">
              1. การยกเลิกแพ็กเกจสมาชิกรายเดือน (Monthly Plans)
            </h2>
            <p>
              คุณสามารถยกเลิกการต่ออายุแพ็กเกจสมาชิกรายเดือน (Basic ฿89 หรือ Pro ฿289) ได้ตลอดเวลาผ่านหน้า <strong>ตั้งค่าโปรไฟล์ (Settings)</strong> โดยไม่มีค่าธรรมเนียมหรือข้อผูกมัดใดๆ เมื่อยกเลิกแล้ว บัญชีของคุณจะยังคงรักษาสิทธิ์ของแพ็กเกจนั้นๆ ต่อไปจนกระทั่งสิ้นสุดรอบบิลที่คุณได้ชำระเงินไว้แล้ว และจะไม่มีการเรียกเก็บเงินในรอบบิลถัดไป
            </p>
          </div>

          <div>
            <h2 className="font-display font-bold text-xl text-slate-900 dark:text-[#F8F6F1] mb-3">
              2. การคืนเงินสำหรับแพ็กเกจรายปี (Annual Plans)
            </h2>
            <p>
              สำหรับแพ็กเกจ Pro Master รายปี (฿2,790/ปี) หากคุณพบปัญหาทางเทคนิคที่ไม่สามารถเข้าใช้งานฟีเจอร์หลักได้ และแจ้งให้เราทราบภายใน <strong>7 วัน นับจากวันที่ชำระเงิน</strong> ทีมงานยินดีพิจารณาคืนเงินให้เต็มจำนวน หรือตามสัดส่วนที่ยังไม่ได้ใช้งาน
            </p>
          </div>

          <div>
            <h2 className="font-display font-bold text-xl text-slate-900 dark:text-[#F8F6F1] mb-3">
              3. ละอองทรายกาลเวลา (Sands of Time)
            </h2>
            <p>
              เนื่องจากละอองทรายกาลเวลาเป็นสินค้าดิจิทัล (Digital Consumables) ที่จัดสรรเข้าสู่กระเป๋าของคุณทันทีเมื่อชำระเงิน จึงไม่สามารถขอคืนเงินในส่วนของทรายที่ถูกใช้สร้างรายงานไปแล้วได้ <strong>อย่างไรก็ตาม</strong> หากระบบเกิดความขัดข้องทางเทคนิคขณะสร้างรายงานจนทำให้สูญเสียทรายโดยไม่ได้รับเนื้อหารายงาน ระบบหรือทีมสนับสนุนจะทำการคืนละอองทราย (Credit Refund) เข้าสู่บัญชีของคุณทันที 100%
            </p>
          </div>

          <div>
            <h2 className="font-display font-bold text-xl text-slate-900 dark:text-[#F8F6F1] mb-3">
              4. กรณีตัดเงินซ้ำซ้อนหรือข้อผิดพลาดจากระบบชำระเงิน
            </h2>
            <p>
              หากเกิดกรณีที่มีการตัดเงินซ้ำซ้อน หรือระบบชำระเงินขัดข้องแต่บัญชีไม่ได้รับการอัปเกรด โปรดส่งหลักฐานสลิปการโอนเงินหรือเลขอ้างอิงคำสั่งซื้อมาที่ทีมงาน เราจะทำการตรวจสอบและดำเนินการคืนเงินหรือปรับสถานะบัญชีให้ถูกต้องภายใน 1 - 3 วันทำการ
            </p>
          </div>

          <div>
            <h2 className="font-display font-bold text-xl text-slate-900 dark:text-[#F8F6F1] mb-3">
              5. วิธีการขอรับการช่วยเหลือหรือยื่นคำร้องขอคืนเงิน
            </h2>
            <p>
              สามารถติดต่อทีมงานฝ่ายดูแลลูกค้าได้ที่อีเมล: <a href="mailto:support@phopephum.com" className="text-[#8C6D2D] dark:text-[#C6A96B] underline font-semibold">support@phopephum.com</a> โดยระบุ:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2 mt-2">
              <li>อีเมลที่ใช้สมัครบัญชี PhopePhum</li>
              <li>วันที่และเวลาที่ทำรายการ</li>
              <li>เลขอ้างอิงคำสั่งซื้อหรือสลิปการชำระเงิน</li>
              <li>รายละเอียดของปัญหาที่พบ</li>
            </ul>
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
