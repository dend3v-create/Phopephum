import { Link } from "@remix-run/react";

interface UpgradePaywallProps {
  featureName: string;
  description?: string;
}

export function UpgradePaywall({ featureName, description }: UpgradePaywallProps) {
  return (
    <div className="relative min-h-[500px] flex items-center justify-center rounded-[2.5rem] border border-white/5 overflow-hidden"
      style={{ background: "rgba(10,34,64,0.3)", backdropFilter: "blur(8px)" }}>
      
      {/* Blurred background preview effect */}
      <div className="absolute inset-0 opacity-20 pointer-events-none select-none overflow-hidden">
        <div className="grid grid-cols-2 gap-4 p-8 blur-md">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-40 rounded-3xl bg-white/10 border border-white/10" />
          ))}
        </div>
      </div>

      <div className="relative z-10 max-w-md w-full px-8 py-12 text-center">
        <div className="w-20 h-20 bg-[#C6A96B]/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-[#C6A96B]/20">
          <svg className="w-10 h-10 text-[#C6A96B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        <h2 className="font-display text-2xl font-bold text-[#F8F6F1] mb-3 uppercase tracking-wider">
          {featureName} ถูกล็อกไว้
        </h2>
        <p className="text-[#94A3B8] text-sm leading-relaxed mb-8">
          {description || `ฟีเจอร์นี้สงวนสิทธิ์สำหรับสมาชิกระดับ Professional Master ขึ้นไป เพื่อรับการพยากรณ์ที่แม่นยำและเจาะลึกยิ่งขึ้น`}
        </p>

        <div className="space-y-4">
          <Link
            to="/dashboard/upgrade"
            className="block w-full py-4 rounded-2xl font-bold text-[#020617] transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, #C6A96B, #D9BC82)" }}
          >
            อัปเกรดเพื่อปลดล็อกตอนนี้ →
          </Link>
          
          <Link
            to="/dashboard"
            className="block text-[#94A3B8] text-xs hover:text-[#F8F6F1] transition-colors"
          >
            กลับไปหน้าภาพรวม
          </Link>
        </div>

        {/* Price tip */}
        <p className="mt-8 text-[10px] text-[#C6A96B]/60 tracking-widest uppercase font-bold">
          เริ่มต้นเพียง 9 บาทต่อเดือน
        </p>
      </div>
    </div>
  );
}
