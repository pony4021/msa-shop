// frontend/src/components/ui/Spinner.tsx
import { cn } from "@/lib/utils";

interface SpinnerProps {
  className?: string;
}

export default function Spinner({ className }: SpinnerProps): JSX.Element {
  return <div className={cn("h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700", className)} />;
}
