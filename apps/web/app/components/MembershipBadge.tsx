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
    case "master":
    case "imperial":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full",
            "bg-gradient-to-r from-indigo-500/15 to-purple-500/15 dark:from-purple-500/20 dark:to-fuchsia-500/20",
            "border border-indigo-400/30 dark:border-purple-500/30 text-indigo-700 dark:text-purple-200",
            "shadow-sm",
            className
          )}
        >
          {showIcon && <Crown className="w-3.5 h-3.5 text-indigo-600 dark:text-purple-400" />}
          Master (โหราจารย์)
        </span>
      );
    case "pro":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full",
            "bg-amber-500/15 dark:bg-amber-500/20",
            "border border-amber-500/30 text-amber-800 dark:text-amber-200",
            "shadow-sm",
            className
          )}
        >
          {showIcon && <Crown className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
          Pro (มืออาชีพ)
        </span>
      );
    case "premium":
    case "basic":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full",
            "bg-sky-500/15 dark:bg-sky-500/20",
            "border border-sky-500/30 text-sky-800 dark:text-sky-200",
            "shadow-sm",
            className
          )}
        >
          {showIcon && <Crown className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />}
          Premium (ยกระดับ)
        </span>
      );
    case "free":
    default:
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full",
            "bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 text-slate-700 dark:text-slate-300",
            className
          )}
        >
          {showIcon && <User className="w-3.5 h-3.5" />}
          Free (เริ่มต้น)
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
