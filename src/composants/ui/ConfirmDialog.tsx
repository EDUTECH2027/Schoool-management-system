import { AlertTriangle } from 'lucide-react';

interface Props {
  title: string;
  message: string;
  sub?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export default function ConfirmDialog({
  title, message, sub, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  onConfirm, onCancel, danger = true,
}: Props) {
  return (
    <div
      className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
        onClick={e => e.stopPropagation()}
      >
        {/* Icon */}
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${danger ? 'bg-red-100' : 'bg-amber-100'}`}>
          <AlertTriangle size={22} className={danger ? 'text-red-500' : 'text-amber-500'} />
        </div>

        {/* Text */}
        <h3 className="text-slate-800 font-bold text-center text-base mb-1">{title}</h3>
        <p className="text-slate-600 text-sm text-center">{message}</p>
        {sub && <p className="text-slate-400 text-xs text-center mt-1">{sub}</p>}

        {/* Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 text-sm font-semibold text-white rounded-xl transition-colors ${
              danger ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
