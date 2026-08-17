import { useState, useEffect } from 'react';
import EmojiPicker from 'emoji-picker-react';
import useUIStore from '../../store/useUIStore';
import { X } from 'lucide-react';

export default function WhiteboardModal({ isOpen, onClose, onSave, editingWhiteboard = null }) {
  const isOffline = useUIStore((state) => state.isOffline);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🎨');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editingWhiteboard) {
        setName(editingWhiteboard.name || '');
        setIcon(editingWhiteboard.icon || '🎨');
      } else {
        setName('');
        setIcon('🎨');
      }
      setShowEmojiPicker(false);
    }
  }, [editingWhiteboard?.id, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isOffline || !name.trim()) return;

    setIsSubmitting(true);
    try {
      await onSave({
        name: name.trim(),
        icon: icon || '🎨'
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col"
        onClick={() => setShowEmojiPicker(false)}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            {editingWhiteboard ? 'Edit Whiteboard' : 'Create New Whiteboard'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Whiteboard Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Architecture Diagram, Sprint Retrospective"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Icon
            </label>
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <span className="text-2xl leading-none">{icon}</span>
                <span className="text-sm text-slate-500 dark:text-slate-400">Click to choose icon...</span>
              </button>

              {showEmojiPicker && (
                <div className="absolute left-0 bottom-full mb-2 z-50 shadow-2xl rounded-xl overflow-hidden">
                  <EmojiPicker
                    onEmojiClick={(emojiData) => {
                      setIcon(emojiData.emoji);
                      setShowEmojiPicker(false);
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isOffline || isSubmitting || !name.trim()}
              title={isOffline ? 'Not available offline' : 'Save Whiteboard'}
              className="px-5 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : editingWhiteboard ? 'Save Changes' : 'Create Whiteboard'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
