import { BaseBoxShapeUtil, HTMLContainer, T } from 'tldraw';
import { BookOpen, ExternalLink, FileText } from 'lucide-react';

export class NoteCardShapeUtil extends BaseBoxShapeUtil {
  static type = 'sanad-note';
  static props = {
    w: T.number,
    h: T.number,
    noteId: T.string,
    title: T.string,
    snippet: T.string,
    notebookName: T.string
  };

  getDefaultProps() {
    return {
      w: 300,
      h: 155,
      noteId: '',
      title: 'Note Title',
      snippet: 'Note content snippet...',
      notebookName: 'Notebook'
    };
  }

  component(shape) {
    const { noteId, title, snippet, notebookName, w, h } = shape.props;

    const handleOpenNote = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (noteId) {
        window.open(`/notebook/${noteId}`, '_blank');
      }
    };

    return (
      <HTMLContainer
        style={{
          width: w,
          height: h,
          boxSizing: 'border-box'
        }}
        className="pointer-events-auto select-none rounded-2xl bg-amber-50/90 dark:bg-slate-800 border-2 border-amber-200 dark:border-amber-900/50 shadow-lg p-4 flex flex-col justify-between overflow-hidden transition-shadow hover:shadow-xl font-sans"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-amber-200/60 dark:border-slate-700/60 pb-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="p-1 rounded-md bg-amber-200/60 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-semibold text-amber-900 dark:text-amber-300 truncate">
              {notebookName || 'Notebook'}
            </span>
          </div>

          {noteId && (
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={handleOpenNote}
              className="p-1 rounded-md text-amber-700/70 hover:text-amber-900 hover:bg-amber-200/50 dark:text-amber-400 dark:hover:text-amber-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title="Open in Notebook (New Tab)"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Note Title */}
        <div className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate mt-1">
          {title || 'Untitled Note'}
        </div>

        {/* Note Snippet */}
        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed flex-1 overflow-hidden my-1">
          {snippet || 'No preview available.'}
        </p>

        {/* Footer Tag */}
        <div className="flex items-center gap-1 text-[10px] text-amber-700/80 dark:text-amber-400/80 font-medium">
          <BookOpen className="w-3 h-3" />
          <span>Sanad Rich Note</span>
        </div>
      </HTMLContainer>
    );
  }

  getIndicatorPath(shape) {
    const path = new Path2D();
    if (typeof path.roundRect === 'function') {
      path.roundRect(0, 0, shape.props.w, shape.props.h, 16);
    } else {
      path.rect(0, 0, shape.props.w, shape.props.h);
    }
    return path;
  }
}
