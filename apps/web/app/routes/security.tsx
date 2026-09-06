import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { Link, useLoaderData } from "@remix-run/react";
import { getUser } from "~/services/auth.server";
import type { Env } from "~/env.server";
import { PublicLayout } from "~/components/public/PublicLayout";
import { AstralIcon } from "~/components/ui/AstralIcon";

export const meta: MetaFunction = () => [
  { title: "ความปลอดภัย & ความเป็นส่วนตัว — PhopePhum (ภพภูมิ)" },
  {
    name: "description",
    content: "มาตรฐานความปลอดภัยและสถาปัตยกรรมปกป้องข้อมูลส่วนบุคคลของ PhopePhum: Supabase RLS, เข้ารหัส TLS 1.3, สอดคล้องตามมาตรฐาน PDPA, และไม่นำข้อมูลไปเทรน AI",
  },
  { property: "og:title", content: "ความปลอดภัย & ความเป็นส่วนตัว — PhopePhum" },
  {
    property: "og:description",
    content: "ความปลอดภัยและความเป็นส่วนตัวในข้อมูลดวงชะตาของคุณคือพันธสัญญาสำคัญที่สุดของเรา",
  },
  { property: "og:url", content: "https://phopephum.com/security" },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await getUser(request, env).catch(() => null);
  return json({ isLoggedIn: !!user });
}

export default function SecurityPage() {
  const { isLoggedIn } = useLoaderData<typeof loader>();

  const securityFeatures = [
    {
      title: "Row Level Security (RLS) 100%",
      desc: "ทุกตารางในฐานข้อมูลถูกจำกัดสิทธิ์ในระดับแถว ทำให้มีเพียงตัวคุณเท่านั้นที่สามารถอ่านและแก้ไขข้อมูลดวงชะตาของตนเองได้ แม้กระทั่ง API ภายนอกก็ไม่สามารถเข้าถึงได้",
      icon: "balance" as const,
    },
    {
      title: "การเข้ารหัสข้อมูลมาตรฐานสากล",
      desc: "ข้อมูลทุกชุดที่ส่งผ่านเครือข่ายได้รับการเข้ารหัสด้วย TLS 1.3 (Bank-Grade 256-Bit SSL) และข้อมูลที่บันทึกในฐานข้อมูลถูกจัดเก็บด้วยการเข้ารหัสอย่างปลอดภัย (Encryption at Rest)",
      icon: "portal" as const,
    },
    {
      title: "AI Privacy Guarantee (ไม่นำไปเทรน AI)",
      desc: "ข้อมูลวันเกิด เวลาตกฟาก และบทสนทนากับ Wisdom AI ของคุณจะถูกส่งผ่าน Gateway ปลอดภัย และจะไม่ถูกนำไปใช้ฝึก (train) หรือปรับแต่งโมเดล AI สาธารณะเด็ดขาด",
      icon: "wisdom" as const,
    },
    {
      title: "ระบบชำระเงินมาตรฐาน PCI-DSS",
      desc: "ธุรกรรมการเงินดำเนินการผ่านผู้ให้บริการเกตเวย์ชั้นนำ (Stripe / Omise) ที่ได้รับมาตรฐาน PCI-DSS Level 1 ระบบของ PhopePhum ไม่มีการบันทึกหมายเลขบัตรเครดิตของคุณ",
      icon: "finance" as const,
    },
    {
      title: "สอดคล้องตามกฎหมาย PDPA ของไทย",
      desc: "เราปฏิบัติตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 อย่างเคร่งครัด ให้คุณมั่นใจในสิทธิความเป็นเจ้าของข้อมูลอย่างแท้จริง",
      icon: "balance" as const,
    },
    {
      title: "สิทธิในการลบข้อมูลบัญชีถาวร",
      desc: "คุณสามารถขอลบข้อมูลโปรไฟล์ วันเดือนปีเกิด และประวัติการใช้งานทั้งหมดออกจากระบบอย่างถาวรได้ตลอดเวลาผ่านหน้าตั้งค่าบัญชี",
      icon: "sandglass" as const,
    },
  ];

  return (
    <PublicLayout isLoggedIn={isLoggedIn}>
      
      {/* Header */}
      <section className="pt-16 pb-12 px-4 sm:px-6 max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-4">
          <AstralIcon name="balance" size="sm" />
          <span>ZERO-KNOWLEDGE PRIVACY & TRUST</span>
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold text-slate-900 dark:text-[#F8F6F1] mb-4">
          ความปลอดภัยและความเป็นส่วนตัว
        </h1>
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300">
          ข้อมูลวันเดือนปีเกิดและคำถามในชีวิตของคุณคือเรื่องส่วนบุคคลอย่างที่สุด เราจึงออกแบบระบบความปลอดภัยตั้งแต่บรรทัดแรกของโค้ด
        </p>
      </section>

      {/* Grid Features */}
      <section className="pb-20 px-4 sm:px-6 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {securityFeatures.map((sec, idx) => (
            <div
              key={idx}
              className="p-6 rounded-3xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-white/[0.03] backdrop-blur-xl"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-[#8C6D2D] dark:text-[#C6A96B] flex items-center justify-center mb-4">
                <AstralIcon name={sec.icon} size="md" />
              </div>
              <h2 className="font-display font-bold text-lg text-slate-900 dark:text-[#F8F6F1] mb-2">
                {sec.title}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {sec.desc}
              </p>
            </div>
          ))}
        </div>

        {/* User Rights Section */}
        <div className="mt-12 p-8 rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.02]">
          <h2 className="font-display font-bold text-xl text-slate-900 dark:text-[#F8F6F1] mb-4">
            สิทธิของคุณภายใต้ พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA)
          </h2>
          <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            <p>
              ในฐานะเจ้าของข้อมูลส่วนบุคคล คุณมีสิทธิในการ:
            </p>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li><strong>สิทธิในการเข้าถึง</strong>: ตรวจสอบและดาวน์โหลดสำเนาข้อมูลดวงชะตาและประวัติการใช้งานของคุณ</li>
              <li><strong>สิทธิในการแก้ไข</strong>: แก้ไขวันเดือนปีเกิด เวลาเกิด หรือข้อมูลส่วนบุคคลให้ถูกต้องเป็นปัจจุบัน</li>
              <li><strong>สิทธิในการระงับหรือเพิกถอนความยินยอม</strong>: สามารถยกเลิกการเชื่อมต่อหรือลบบัญชีผู้ใช้ได้ตลอดเวลา</li>
              <li><strong>สิทธิในการลบข้อมูล (Right to Erasure)</strong>: ร้องขอให้ลบข้อมูลส่วนบุคคลทั้งหมดออกจากฐานข้อมูลของเรา</li>
            </ul>
            <p className="pt-2 text-xs text-slate-700 dark:text-slate-400">
              หากมีข้อสงสัยหรือต้องการใช้สิทธิของเจ้าของข้อมูล สามารถติดต่อเจ้าหน้าที่คุ้มครองข้อมูลได้ที่ <a href="mailto:privacy@phopephum.com" className="text-[#8C6D2D] dark:text-[#C6A96B] underline">privacy@phopephum.com</a>
            </p>
          </div>
        </div>

      </section>

      {/* CTA Bottom */}
      <section className="py-16 text-center px-4 max-w-3xl mx-auto border-t border-slate-200/80 dark:border-white/10">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-[#F8F6F1] mb-3">
          เริ่มต้นใช้งานด้วยความมั่นใจ 100%
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
          สมัครฟรีใน 1 นาที โดยไม่ต้องกรอกข้อมูลบัตรเครดิต
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
