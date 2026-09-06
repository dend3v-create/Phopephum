import { useState } from "react";
import { Link, useLocation } from "@remix-run/react";
import { ThemeToggle } from "~/components/ThemeToggle";
import { LanguageSwitcher } from "~/components/LanguageSwitcher";
import { AstralIcon } from "~/components/ui/AstralIcon";

interface PublicNavbarProps {
  isLoggedIn?: boolean;
}

export function PublicNavbar({ isLoggedIn = false }: PublicNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { label: "ฟีเจอร์", href: "/features" },
    { label: "วิธีใช้งาน", href: "/how-it-works" },
    { label: "ราคา & แพ็กเกจ", href: "/pricing" },
    { label: "ความปลอดภัย", href: "/security" },
    { label: "คำถามพบบ่อย", href: "/faq" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-xl border-b border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-[#020617]/85 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 sm:h-20 flex items-center justify-between gap-4">
        
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#C6A96B] to-[#9E824C] p-0.5 shadow-md shadow-[#C6A96B]/20 flex items-center justify-center transition-transform group-hover:scale-105 duration-300">
            <div className="w-full h-full rounded-[10px] bg-[#020617] flex items-center justify-center">
              <span className="font-display text-[#C6A96B] text-lg sm:text-xl font-bold">P</span>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-display font-bold text-lg sm:text-xl tracking-wide text-slate-900 dark:text-[#F8F6F1] group-hover:text-[#8C6D2D] dark:group-hover:text-[#C6A96B] transition-colors">
              PhopePhum
            </span>
            <span className="text-[10px] text-slate-700 dark:text-slate-400 font-medium tracking-wider -mt-0.5">
              ภพภูมิ • ปัญญาและกาลเวลาชีวิต
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.href;
            return (
              <Link
                key={link.href}
                to={link.href}
                className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "text-[#8C6D2D] dark:text-[#C6A96B] bg-slate-100 dark:bg-white/5 font-semibold"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Actions (Language, Theme, Auth CTAs) */}
        <div className="hidden sm:flex items-center gap-2.5">
          <LanguageSwitcher />
          <ThemeToggle />

          {isLoggedIn ? (
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] text-[#020617] shadow-md shadow-[#C6A96B]/20 hover:scale-102 active:scale-98 transition-all"
            >
              <AstralIcon name="portal" size="sm" />
              <span>เข้าสู่ Dashboard</span>
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-[#8C6D2D] dark:hover:text-[#C6A96B] transition-colors"
              >
                เข้าสู่ระบบ
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] text-[#020617] shadow-md shadow-[#C6A96B]/25 hover:shadow-lg hover:shadow-[#C6A96B]/35 hover:scale-102 active:scale-98 transition-all"
              >
                <span>เริ่มต้นใช้งานฟรี</span>
                <span className="text-xs">→</span>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger & Controls */}
        <div className="flex sm:hidden items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2.5 rounded-xl border border-slate-300/80 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-b border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#020617]/95 backdrop-blur-2xl px-5 py-6 space-y-4 animate-in fade-in slide-in-from-top-3 duration-200">
          <nav className="flex flex-col space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-3 rounded-xl text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-[#8C6D2D] dark:hover:text-[#C6A96B] transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
            <span className="text-xs text-slate-700 dark:text-slate-400">เลือกภาษา</span>
            <LanguageSwitcher />
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            {isLoggedIn ? (
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] text-[#020617] shadow-md shadow-[#C6A96B]/20"
              >
                เข้าสู่ Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] text-[#020617] shadow-lg shadow-[#C6A96B]/25"
                >
                  เริ่มต้นใช้งานฟรี (ไม่ต้องใช้บัตรเครดิต)
                </Link>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-3 rounded-xl font-semibold text-sm border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
                >
                  เข้าสู่ระบบ
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
