interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  glow?: boolean;
  variant?: "glass" | "solid";
}

export function Card({
  children,
  className = "",
  style,
  glow = false,
  variant = "glass",
}: CardProps) {
  const base =
    variant === "glass"
      ? "card-glass"
      : "bg-[#0A2240]/80 border border-[rgba(217,188,130,0.18)] rounded-[1.25rem]";

  return (
    <div
      style={style}
      className={`${base} p-6
        ${glow ? "shadow-[0_0_40px_rgba(232,196,106,0.12)]" : ""}
        ${className}`}
    >
      {children}
    </div>
  );
}
