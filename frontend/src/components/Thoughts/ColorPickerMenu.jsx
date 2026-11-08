import { useRef, useEffect } from 'react';
import { Check } from 'lucide-react';
import { KEEP_COLORS } from '../../utils/thoughtUtils';

export default function ColorPickerMenu({
  isOpen,
  onClose,
  currentColor,
  onSelectColor,
  isOffline
}) {
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="absolute left-0 bottom-full mb-2 p-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 flex items-center gap-1.5 flex-wrap max-w-[220px] animate-in fade-in zoom-in-95 duration-100"
    >
      {KEEP_COLORS.map((c) => {
        const isSelected = (currentColor || 'default') === c.id;
        return (
          <button
            key={c.id}
            type="button"
            title={c.name}
            onClick={() => {
              onSelectColor(c.id);
              onClose();
            }}
            disabled={isOffline}
            className="w-6 h-6 rounded-full border border-slate-300 dark:border-slate-600 flex items-center justify-center transition-transform hover:scale-110 cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: c.hex }}
          >
            {isSelected && (
              <Check className="w-3.5 h-3.5 text-slate-700 dark:text-slate-800 stroke-[3]" />
            )}
          </button>
        );
      })}
    </div>
  );
}
