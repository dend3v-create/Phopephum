import { Outlet, Link } from "@remix-run/react";
import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { redirectIfAuthed } from "~/services/auth.server";
import type { Env } from "~/env.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  await redirectIfAuthed(request, env);
  return null;
}

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      {/* Background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#C9A96E]/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-10 flex flex-col items-center">
          <Link to="/" className="group inline-flex flex-col items-center">
            <div className="relative w-16 h-16 mb-4 flex items-center justify-center transition-transform group-hover:scale-105 duration-500">
              <div className="absolute inset-0 rounded-full border border-[#C6A96B]/30 bg-[#C6A96B]/5" />
              <span className="text-[#C6A96B] text-2xl font-bold z-10 font-display">P</span>
              <div className="absolute inset-0 opacity-20">
                 <svg viewBox="0 0 40 40" fill="none">
                   <circle cx="20" cy="20" r="18" stroke="#C6A96B" strokeWidth="0.5" strokeDasharray="2 2" />
                 </svg>
              </div>
            </div>
            <p className="text-[#C9A96E] text-[10px] tracking-[0.4em] uppercase mb-1.5 opacity-80">
              Living Wisdom OS
            </p>
            <h1 className="font-display text-4xl font-bold text-[#F3EFE8] glow-gold">
              PhopePhum
            </h1>
          </Link>
        </div>

        <Outlet />
      </div>
    </div>
  );
}
