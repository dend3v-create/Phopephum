import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { requireMinPlan } from "~/services/auth.server";
import type { Env } from "~/env.server";

export const meta: MetaFunction = () => [
  { title: "มหาภูติกำเนิด — PhopePhum" },
  { name: "description", content: "ดูธาตุกำเนิดด้วยระบบมหาภูติโบราณ" },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  await requireMinPlan("basic", request, env);
  return null;
}

export default function MahaPhuti() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center"
        style={{ background: "rgba(75,111,174,0.1)", border: "1px solid rgba(75,111,174,0.3)" }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="#4B6FAE" strokeWidth={1.5} className="w-10 h-10">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
          <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8 14s1 2 4 2 4-2 4-2" strokeLinecap="round" />
        </svg>
      </div>
      <div>
        <h1 className="font-display text-2xl text-[#D9BC82] mb-2">มหาภูติกำเนิด</h1>
        <p className="text-[#94A3B8] text-sm max-w-xs">
          ธาตุกำเนิดจากระบบมหาภูติโบราณ — กำลังพัฒนา
        </p>
      </div>
      <div
        className="px-4 py-2 rounded-full text-xs font-medium"
        style={{ background: "rgba(75,111,174,0.08)", border: "1px solid rgba(75,111,174,0.2)", color: "#4B6FAE" }}
      >
        ✦ เร็วๆ นี้
      </div>
    </div>
  );
}
