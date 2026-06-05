interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost";
  loading?: boolean;
}

export function Button({
  variant = "primary",
  loading = false,
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 font-bold rounded-full px-8 py-3.5 text-base sm:text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shadow-sm";

  const variants = {
    primary:
      "bg-[#C9A96E] text-[#0A0806] hover:bg-[#E8D4A8] hover:shadow-lg hover:shadow-[#C9A96E]/20",
    outline:
      "border border-[#C9A96E] text-[#C9A96E] hover:bg-[#C9A96E]/10",
    ghost: "text-[#8A8070] hover:text-[#F3EFE8] hover:bg-[#15120F]",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}
