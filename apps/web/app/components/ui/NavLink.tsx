import { NavLink as RemixNavLink } from "@remix-run/react";

interface NavLinkProps {
  to: string;
  icon: React.ReactNode;
  label: React.ReactNode;
  exact?: boolean;
}

export function NavLink({ to, icon, label, exact }: NavLinkProps) {
  return (
    <RemixNavLink
      to={to}
      end={exact !== false}
      className={({ isActive }) =>
        `relative flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
        ${
          isActive
            ? "text-[#D9BC82]"
            : "text-[#94A3B8] hover:text-[#A68444] dark:hover:text-[#F8F6F1]"
        }`
      }
      style={({ isActive }) => ({
        background: isActive
          ? "rgba(198,169,107,0.10)"
          : undefined,
      })}
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#C9A96E] rounded-r-full" />
          )}
          <span className="w-5 h-5 flex items-center justify-center">{icon}</span>
          {label}
        </>
      )}
    </RemixNavLink>
  );
}
