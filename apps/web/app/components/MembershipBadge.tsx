import { Crown, CheckCircle2, User } from "lucide-react";
import { cn } from "~/lib/utils";

type MembershipType = "free" | "premium" | "vip" | string | null;

interface MembershipBadgeProps {
  type?: MembershipType;
  className?: string;
  showIcon?: boolean;
}

export function MembershipBadge({
  type = "free",
  className,
  showIcon = true,
}: MembershipBadgeProps) {
  const normalizedType = (type || "free").toLowerCase();

  switch (normalizedType) {
    case "vip":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full",
            "bg-gradient-to-r from-purple-500/20 to-fuchsia-500/20",
            "border border-purple-500/30 text-purple-200",
            "shadow-[0_0_10px_rgba(168,85,247,0.2)]",
            className
          )}
        >
          {showIcon && <Crown className="w-3.5 h-3.5 text-purple-400" />}
          VIP Member
        </span>
      );
    case "premium":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full",
            "bg-gradient-to-r from-amber-500/20 to-yellow-500/20",
            "border border-amber-500/30 text-amber-200",
            "shadow-[0_0_10px_rgba(245,158,11,0.2)]",
            className
          )}
        >
          {showIcon && <Crown className="w-3.5 h-3.5 text-amber-400" />}
          Premium
        </span>
      );
    case "free":
    default:
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full",
            "bg-slate-800/50 border border-slate-700/50 text-slate-300",
            className
          )}
        >
          {showIcon && <User className="w-3.5 h-3.5" />}
          Free Member
        </span>
      );
  }
}

export function MembershipStatusBadge({
  status = "active",
}: {
  status?: string | null;
}) {
  const normalizedStatus = (status || "active").toLowerCase();

  if (normalizedStatus === "active") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
        <CheckCircle2 className="w-3.5 h-3.5" /> Active
      </span>
    );
  }

  if (normalizedStatus === "pending") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-400">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" /> Pending
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-400">
      <span className="w-2 h-2 rounded-full bg-rose-400" /> Expired
    </span>
  );
}
