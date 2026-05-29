import { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm text-[#C9A96E] font-medium">{label}</label>
      )}
      <input
        ref={ref}
        className={`w-full bg-cosmic-950/50 backdrop-blur-md border ${
          error ? "border-red-500/50" : "border-gold-500/20"
        } rounded-xl px-4 py-3 text-text-primary placeholder-text-muted
        focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20
        transition-all text-sm ${className}`}
        {...props
}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
);
Input.displayName = "Input";
