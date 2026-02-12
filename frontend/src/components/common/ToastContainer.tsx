import { useEffect, useState } from "react";
import { useToastStore } from "../../stores/toast";
import type { Toast } from "../../stores/toast";
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from "lucide-react";

const icons = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const colors = {
  success: "border-green-800/60 bg-green-950/80 text-green-300",
  error: "border-red-800/60 bg-red-950/80 text-red-300",
  info: "border-brand-800/60 bg-brand-950/80 text-brand-300",
  warning: "border-yellow-800/60 bg-yellow-950/80 text-yellow-300",
};

const iconColors = {
  success: "text-green-400",
  error: "text-red-400",
  info: "text-brand-400",
  warning: "text-yellow-400",
};

function ToastItem({ toast: t, onRemove }: { toast: Toast; onRemove: () => void }) {
  const [exiting, setExiting] = useState(false);
  const Icon = icons[t.type];

  useEffect(() => {
    if (t.duration && t.duration > 0) {
      const timer = setTimeout(() => setExiting(true), t.duration - 300);
      return () => clearTimeout(timer);
    }
  }, [t.duration]);

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm transition-all duration-300 ${
        colors[t.type]
      } ${exiting ? "translate-x-full opacity-0" : "translate-x-0 opacity-100"}`}
    >
      <Icon size={18} className={`mt-0.5 shrink-0 ${iconColors[t.type]}`} />
      <p className="flex-1 text-sm">{t.message}</p>
      <button
        onClick={onRemove}
        className="shrink-0 rounded p-0.5 opacity-60 transition-opacity hover:opacity-100"
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={() => removeToast(t.id)} />
      ))}
    </div>
  );
}
