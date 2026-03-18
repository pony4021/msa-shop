// frontend/src/components/ui/Badge.tsx
import { cn } from "@/lib/utils";

type BadgeVariant = "success" | "warning" | "danger" | "default";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

const styleMap: Record<BadgeVariant, string> = {
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-rose-100 text-rose-700",
  default: "bg-slate-200 text-slate-700",
};

export default function Badge({ variant = "default", children }: BadgeProps): JSX.Element {
  return <span className={cn("inline-flex rounded-full px-2 py-1 text-xs font-medium", styleMap[variant])}>{children}</span>;
}
