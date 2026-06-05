import { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", ...props }, ref) => (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-sm text-[#C9A96E] font-medium ml-1">{label}</label>
      )}
      <input
        ref={ref}
        className={`w-full bg-cosmic-950/50 backdrop-blur-md border ${
          error ? "border-red-500/50" : "border-gold-500/20"
        } rounded-xl px-4 py-3 text-text-primary placeholder:text-text-muted/40
        focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20
        transition-all text-base sm:text-sm ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-400 mt-0.5 ml-1">{error}</p>}
    </div>
  )
);
Input.displayName = "Input";
