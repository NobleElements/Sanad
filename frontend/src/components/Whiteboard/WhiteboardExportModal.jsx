import { useState, useMemo } from 'react';
import { 
  Download, 
  X, 
  FileText, 
  Image as ImageIcon, 
  FileCode, 
  Layers, 
  Check, 
  Loader2,
  Sparkles,
  Printer
} from 'lucide-react';
import { exportWhiteboard } from './whiteboardExport';
import useUIStore from '../../store/useUIStore';

const FORMATS = [
  {
    id: 'png',
    name: 'PNG Image',
    desc: 'High-res raster image with transparency support. Ideal for presentations.',
    icon: ImageIcon,
    badge: 'Popular'
  },
  {
    id: 'pdf',
    name: 'PDF Document',
    desc: 'Crisp vector-sized document for printing, documentation, and reports.',
    icon: FileText,
    badge: 'High Quality'
  },
  {
    id: 'svg',
    name: 'SVG Vector',
    desc: 'Scalable vector graphic with infinite resolution. Perfect for designers.',
    icon: FileCode
  },
  {
    id: 'jpeg',
    name: 'JPEG Image',
    desc: 'Compressed raster image with solid background. Smaller file size.',
    icon: ImageIcon
  }
];

const QUALITY_OPTIONS = [
  { scale: 1, label: '1x', desc: 'Standard' },
  { scale: 2, label: '2x', desc: 'HD / Retina (Recommended)', default: true },
  { scale: 3, label: '3x', desc: 'Ultra HD (Print Quality)' }
];

export default function WhiteboardExportModal({
  isOpen,
  onClose,
  editor,
  whiteboardTitle = 'whiteboard',
  isDarkMode = false
}) {
  const addToast = useUIStore((state) => state.addToast);

  const [format, setFormat] = useState('png');
  const [scale, setScale] = useState(2);
  const [includeBackground, setIncludeBackground] = useState(true);
  const [pdfFormat, setPdfFormat] = useState('fit'); // 'fit' | 'a4'
  const [scope, setScope] = useState('all'); // 'all' | 'selection'
  const [customTitle, setCustomTitle] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Count shapes on page and in selection
  const shapeCounts = useMemo(() => {
    if (!editor) return { total: 0, selected: 0 };
    try {
      const all = editor.getCurrentPageShapeIds ? editor.getCurrentPageShapeIds().size : 0;
      const selected = editor.getSelectedShapeIds ? editor.getSelectedShapeIds().length : 0;
      return { total: all, selected };
    } catch {
      return { total: 0, selected: 0 };
    }
  }, [editor, isOpen]);

  if (!isOpen) return null;

  const currentTitle = customTitle.trim() || whiteboardTitle || 'whiteboard';

  const handleExport = async () => {
    if (!editor) return;
    setIsExporting(true);

    try {
      await exportWhiteboard(editor, {
        format,
        scope,
        scale,
        includeBackground,
        pdfFormat,
        title: currentTitle,
        isDarkMode
      });

      addToast(`Whiteboard exported successfully as ${format.toUpperCase()}`, 'success');
      onClose();
    } catch (err) {
      console.error('Export failed:', err);
      addToast(err.message || 'Failed to export whiteboard', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Export Whiteboard
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                High-quality visual export in multiple formats
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-130px)] space-y-5">
          {/* 1. Format Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Export Format
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {FORMATS.map((fmt) => {
                const Icon = fmt.icon;
                const isSelected = format === fmt.id;
                return (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setFormat(fmt.id)}
                    className={`relative flex flex-col items-start p-3 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`} />
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {fmt.name}
                        </span>
                      </div>
                      {fmt.badge && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                          {fmt.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {fmt.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Scope Selection (All vs Selection) */}
          {shapeCounts.selected > 0 && (
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Export Scope
              </label>
              <div className="flex items-center gap-2 bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setScope('all')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all ${
                    scope === 'all'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>All Content ({shapeCounts.total} shapes)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setScope('selection')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all ${
                    scope === 'selection'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Selected Shapes ({shapeCounts.selected})</span>
                </button>
              </div>
            </div>
          )}

          {/* 3. Resolution & Quality (for PNG, JPEG, PDF) */}
          {format !== 'svg' && (
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Resolution & Quality
              </label>
              <div className="grid grid-cols-3 gap-2">
                {QUALITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.scale}
                    type="button"
                    onClick={() => setScale(opt.scale)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all ${
                      scale === opt.scale
                        ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <span className="text-sm font-bold">{opt.label}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-full">
                      {opt.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 4. PDF Layout Option (for PDF only) */}
          {format === 'pdf' && (
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                PDF Page Format
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPdfFormat('fit')}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                    pdfFormat === 'fit'
                      ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500'
                      : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <FileText className="w-4 h-4 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-bold">Fit to Content</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Exact diagram dimensions</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setPdfFormat('a4')}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                    pdfFormat === 'a4'
                      ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500'
                      : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <Printer className="w-4 h-4 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-bold">Standard A4</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Print page format</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* 5. Background & Filename Settings */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
            {format !== 'jpeg' && (
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeBackground}
                  onChange={(e) => setIncludeBackground(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                  Include canvas background color
                </span>
              </label>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                File Name
              </label>
              <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-900/60 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500">
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder={whiteboardTitle || 'whiteboard'}
                  className="flex-1 px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 bg-transparent border-0 focus:outline-none"
                />
                <span className="px-3 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">
                  .{format}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50">
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting || shapeCounts.total === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-200 dark:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download {format.toUpperCase()}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
