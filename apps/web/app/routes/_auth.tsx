import { Outlet } from "@remix-run/react";
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
        <div className="text-center mb-10">
          <p className="text-[#C9A96E] text-xs tracking-widest uppercase mb-2">
            Living Wisdom OS
          </p>
          <h1 className="font-display text-4xl font-bold text-[#F3EFE8]">
            PhopePhum
          </h1>
        </div>

        <Outlet />
      </div>
    </div>
  );
}
