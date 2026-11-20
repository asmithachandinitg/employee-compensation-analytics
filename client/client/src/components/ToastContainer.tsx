
import { useEffect } from "react";
import { useToast } from "../context/ToastContext";
import type { Toast } from "../context/ToastContext";
import "./ToastContainer.css";

function ToastMessage({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: number) => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      onDismiss(toast.id);
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const icon = {
    success: "✓",
    error: "!",
    info: "i",
  }[toast.type];

  return (
    <div
      className={`toast toast-${toast.type}`}
      role={toast.type === "error" ? "alert" : "status"}
    >
      <span className="toast-icon" aria-hidden="true">
        {icon}
      </span>

      <span className="toast-message">{toast.message}</span>

      <button
        type="button"
        className="toast-close"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <ToastMessage
          key={toast.id}
          toast={toast}
          onDismiss={dismissToast}
        />
      ))}
    </div>
  );
}
