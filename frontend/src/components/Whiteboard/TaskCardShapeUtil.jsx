import { BaseBoxShapeUtil, HTMLContainer, T } from 'tldraw';
import { CheckCircle2, Circle, Clock, Folder, ExternalLink } from 'lucide-react';
import { API_URL } from '../../config';

const STATUS_CONFIGS = [
  { status: 0, label: 'To Do', icon: Circle, color: 'text-slate-500', bgBadge: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200' },
  { status: 1, label: 'In Progress', icon: Clock, color: 'text-amber-500', bgBadge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' },
  { status: 2, label: 'Done', icon: CheckCircle2, color: 'text-emerald-500', bgBadge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' }
];

export class TaskCardShapeUtil extends BaseBoxShapeUtil {
  static type = 'sanad-task';
  static props = {
    w: T.number,
    h: T.number,
    taskId: T.string,
    title: T.string,
    status: T.number,
    project: T.string
  };

  getDefaultProps() {
    return {
      w: 280,
      h: 125,
      taskId: '',
      title: 'Task Title',
      status: 0,
      project: ''
    };
  }

  component(shape) {
    const { taskId, title, status = 0, project, w, h } = shape.props;
    const currentStatus = STATUS_CONFIGS[status] || STATUS_CONFIGS[0];
    const StatusIcon = currentStatus.icon;

    const handleCycleStatus = async (e) => {
      e.stopPropagation();
      const nextStatus = (status + 1) % 3;
      
      // Update local canvas shape
      this.editor.updateShape({
        id: shape.id,
        type: 'sanad-task',
        props: {
          ...shape.props,
          status: nextStatus
        }
      });

      // Update backend task in Sanad if taskId is present
      if (taskId) {
        try {
          await fetch(`${API_URL}/tasks/${taskId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: nextStatus })
          });
        } catch (err) {
          console.warn('Failed to sync task status to backend', err);
        }
      }
    };

    const handleOpenTask = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (taskId) {
        window.open(`/tasks/${taskId}`, '_blank');
      }
    };

    return (
      <HTMLContainer
        style={{
          width: w,
          height: h,
          boxSizing: 'border-box'
        }}
        className="pointer-events-auto select-none rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 shadow-lg p-3.5 flex flex-col justify-between overflow-hidden transition-shadow hover:shadow-xl font-sans"
      >
        {/* Header with Project and External Link */}
        <div className="flex items-center justify-between gap-2">
          {project ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-[11px] font-medium max-w-[170px] truncate">
              <Folder className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{project}</span>
            </span>
          ) : (
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Sanad Task
            </span>
          )}

          {taskId && (
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={handleOpenTask}
              className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title="Open in Tasks (New Tab)"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Task Title */}
        <div className={`text-sm font-semibold text-slate-800 dark:text-slate-100 line-clamp-2 leading-snug my-1 ${status === 2 ? 'line-through text-slate-400 dark:text-slate-500' : ''}`}>
          {title || 'Untitled Task'}
        </div>

        {/* Footer with Clickable Status Badge */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700/60">
          <button
            type="button"
            onClick={handleCycleStatus}
            onPointerDown={(e) => e.stopPropagation()}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all transform active:scale-95 ${currentStatus.bgBadge}`}
            title="Click to cycle task status"
          >
            <StatusIcon className={`w-3.5 h-3.5 ${currentStatus.color}`} />
            <span>{currentStatus.label}</span>
          </button>
          
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
            Click status to toggle
          </span>
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
