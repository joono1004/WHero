import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

// app/globals.css (Codex's territory) has a bare, unlayered `button { ... }`
// rule (gradient background, bold text, fixed padding/radius/border). Tailwind
// v4 puts all of its utility classes inside `@layer utilities`, and by the
// CSS cascade layers spec, ANY unlayered rule beats ANY layered rule
// regardless of selector specificity - so no amount of Tailwind classes here
// can out-rank that plain `button` selector. Inline styles sit above the
// cascade entirely, so every property the legacy rule touches is set inline
// instead of via a class, guaranteeing this component looks the same
// regardless of what globals.css does elsewhere.
type ButtonVariant = "primary" | "secondary" | "danger" | "link";
type ButtonSize = "md" | "sm";

const VARIANT_STYLE: Record<ButtonVariant, CSSProperties> = {
  primary: {
    border: "1px solid #bd9b4c",
    backgroundColor: "transparent",
    backgroundImage: "linear-gradient(#d1b362, #9d7a31)",
    color: "#102027",
    fontWeight: 700,
  },
  secondary: {
    border: "1px solid #43606a",
    backgroundColor: "#17343e",
    backgroundImage: "none",
    color: "#d6ded9",
    fontWeight: 400,
  },
  danger: {
    border: "1px solid #6a4343",
    backgroundColor: "#3e1717",
    backgroundImage: "none",
    color: "#d9b6b6",
    fontWeight: 400,
  },
  link: {
    border: "none",
    backgroundColor: "transparent",
    backgroundImage: "none",
    color: "#8fa6a8",
    fontWeight: 400,
    textDecoration: "underline",
    padding: 0,
  },
};

const SIZE_STYLE: Record<ButtonSize, CSSProperties> = {
  md: { borderRadius: 6, padding: "0.75rem 1.5rem" },
  sm: { borderRadius: 4, padding: "0.375rem 0.75rem", fontSize: "0.875rem" },
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  style,
  disabled,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}) {
  const sizeStyle = variant === "link" ? {} : SIZE_STYLE[size];
  return (
    <button
      {...props}
      disabled={disabled}
      className={className}
      style={{
        ...sizeStyle,
        ...VARIANT_STYLE[variant],
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        ...style,
      }}
    >
      {children}
    </button>
  );
}
