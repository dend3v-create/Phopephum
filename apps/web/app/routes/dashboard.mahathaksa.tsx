import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { requireMinPlan } from "~/services/auth.server";
import type { Env } from "~/env.server";

export const meta: MetaFunction = () => [
  { title: "มหาทักษาพยากรณ์ — PhopePhum" },
  { name: "description", content: "พยากรณ์ด้วยระบบมหาทักษาโบราณ" },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  await requireMinPlan("basic", request, env);
  return null;
}

export default function MahaThaksaPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center"
        style={{ background: "rgba(198,169,107,0.1)", border: "1px solid rgba(198,169,107,0.3)" }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="#C6A96B" strokeWidth={1.5} className="w-10 h-10">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3v9l5 3" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="2" fill="#C6A96B" />
        </svg>
      </div>
      <div>
        <h1 className="font-display text-2xl text-[#D9BC82] mb-2">มหาทักษาพยากรณ์</h1>
        <p className="text-[#94A3B8] text-sm max-w-xs">
          ระบบพยากรณ์มหาทักษาโบราณ — กำลังพัฒนา
        </p>
      </div>
      <div
        className="px-4 py-2 rounded-full text-xs font-medium"
        style={{ background: "rgba(198,169,107,0.08)", border: "1px solid rgba(198,169,107,0.2)", color: "#C6A96B" }}
      >
        ✦ เร็วๆ นี้
      </div>
    </div>
  );
}
