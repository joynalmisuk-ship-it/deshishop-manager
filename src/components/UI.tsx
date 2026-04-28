import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

export function ToastContainer({ toasts, removeToast }: { toasts: Toast[], removeToast: (id: string) => void }) {
  return (
    <div className="fixed bottom-6 left-6 z-[100] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: -20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.95 }}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg border min-w-[300px] max-w-md ${
              toast.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' :
              toast.type === 'error' ? 'bg-red-50 border-red-100 text-red-800' :
              toast.type === 'warning' ? 'bg-amber-50 border-amber-100 text-amber-800' :
              'bg-blue-50 border-blue-100 text-blue-800'
            }`}
          >
            {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-500" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
            {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-500" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-blue-500" />}
            
            <p className="text-sm font-medium flex-1">{toast.message}</p>
            
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 hover:bg-black/5 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 opacity-50" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function ConfirmDialog({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmText = "Confirm", 
  cancelText = "Cancel",
  type = "danger"
}: { 
  isOpen: boolean; 
  title: string; 
  message: string; 
  onConfirm: () => void; 
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "primary" | "warning";
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden"
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-xl ${
              type === 'danger' ? 'bg-red-50 text-red-600' :
              type === 'warning' ? 'bg-amber-50 text-amber-600' :
              'bg-emerald-50 text-emerald-600'
            }`}>
              {type === 'danger' ? <AlertCircle className="w-6 h-6" /> :
               type === 'warning' ? <AlertTriangle className="w-6 h-6" /> :
               <CheckCircle className="w-6 h-6" />}
            </div>
            <h3 className="text-xl font-bold text-slate-900">{title}</h3>
          </div>
          <p className="text-slate-600 leading-relaxed">{message}</p>
        </div>
        
        <div className="bg-slate-50 p-4 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-all"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-6 py-2.5 text-white font-bold rounded-xl transition-all shadow-md ${
              type === 'danger' ? 'bg-red-600 hover:bg-red-700 shadow-red-200' :
              type === 'warning' ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200' :
              'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
