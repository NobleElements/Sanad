import { useState } from 'react';
import { Pin, Clock, Edit2, Trash2, Tag, ChevronDown, ChevronUp } from 'lucide-react';
import { timeAgo, parseUTCDate } from '../../utils/dateUtils';
import { getKeepColorStyle } from '../../utils/thoughtUtils';
import { linkify } from '../../utils/textUtils';
import MoveCollectionMenu from './MoveCollectionMenu';

export default function CompactThoughtRow({
  thought,
  collections = [],
  isEditing,
  editContent,
  setEditContent,
  isSaving,
  isOffline,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onTogglePin,
  onMoveToCollection,
  onCreateNewCollection
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMoveOpen, setIsMoveOpen] = useState(false);

  const colorStyle = getKeepColorStyle(thought.color);
  const assignedCollection = collections.find((c) => c.id === thought.collectionId);

  // Extract first snippet for single-line display
  const snippet = thought.content.replace(/<[^>]*>?/gm, '').split('\n')[0] || 'Empty thought';

  if (isEditing) {
    return (
      <div
        id={`thought-${thought.id}`}
        className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-indigo-400 dark:border-indigo-600 shadow-sm flex flex-col gap-3 my-1.5"
      >
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          className="w-full border border-slate-300 dark:border-slate-600 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:bg-slate-700 dark:text-slate-100 text-sm"
          rows="3"
          disabled={isSaving}
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancelEdit}
            disabled={isSaving}
            className="px-3 py-1 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSaveEdit}
            disabled={isSaving || isOffline}
            title={isOffline ? 'Not available offline' : ''}
            className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 transition disabled:opacity-50 cursor-pointer font-medium"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      id={`thought-${thought.id}`}
      className={`group relative bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-2xs hover:shadow-xs transition-all duration-150 overflow-hidden ${
        thought.isPinned ? 'ring-1 ring-indigo-400/40 dark:ring-indigo-500/30' : ''
      }`}
    >
      {/* Dense Row */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-3 px-3.5 py-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/40 select-none text-xs"
      >
        {/* Color Strip Indicator */}
        <div
          className="w-1.5 h-6 rounded-full shrink-0"
          style={{ backgroundColor: colorStyle.hex !== '#FFFFFF' ? colorStyle.hex : '#94A3B8' }}
        />

        {/* Pin button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin(thought.id, !thought.isPinned);
          }}
          disabled={isOffline}
          title={thought.isPinned ? 'Unpin' : 'Pin to top'}
          className={`p-1 rounded-full shrink-0 transition-opacity cursor-pointer ${
            thought.isPinned
              ? 'text-indigo-600 dark:text-indigo-400 opacity-100'
              : 'text-slate-300 dark:text-slate-600 hover:text-slate-500 opacity-60 sm:opacity-0 sm:group-hover:opacity-100'
          }`}
        >
          <Pin className={`w-3.5 h-3.5 ${thought.isPinned ? 'fill-current rotate-45' : ''}`} />
        </button>

        {/* Snippet */}
        <div className="flex-1 truncate font-medium text-slate-800 dark:text-slate-200 text-sm">
          {snippet}
        </div>

        {/* Collection Pill */}
        <div className="relative shrink-0">
          <span
            onClick={(e) => {
              e.stopPropagation();
              setIsMoveOpen(!isMoveOpen);
            }}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: assignedCollection?.color || '#94A3B8' }}
            />
            <span className="truncate max-w-[100px]">
              {assignedCollection ? assignedCollection.name : 'Uncategorized'}
            </span>
          </span>

          <MoveCollectionMenu
            isOpen={isMoveOpen}
            onClose={() => setIsMoveOpen(false)}
            collections={collections}
            currentCollectionId={thought.collectionId}
            onMoveToCollection={(colId) => onMoveToCollection(thought.id, colId)}
            onCreateNewCollection={onCreateNewCollection}
            isOffline={isOffline}
          />
        </div>

        {/* Timestamp */}
        <span
          className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0 whitespace-nowrap hidden sm:inline"
          title={parseUTCDate(thought.createdAt).toLocaleString()}
        >
          {timeAgo(thought.createdAt)}
        </span>

        {/* Quick Action Buttons on Hover */}
        <div className="flex items-center gap-1 shrink-0 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStartEdit();
            }}
            disabled={isOffline}
            title={isOffline ? 'Not available offline' : 'Edit'}
            className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded transition cursor-pointer disabled:opacity-50"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            disabled={isOffline}
            title={isOffline ? 'Not available offline' : 'Delete'}
            className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded transition cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Expand/Collapse chevron */}
        <button
          type="button"
          className="p-0.5 text-slate-400 shrink-0"
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Expanded full text view */}
      {isExpanded && (
        <div className="px-4 pb-3.5 pt-1 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/40">
          <div
            dir="auto"
            className="text-slate-800 dark:text-slate-200 text-sm leading-relaxed whitespace-pre-wrap break-words py-1"
            dangerouslySetInnerHTML={{ __html: linkify(thought.content) }}
          />
        </div>
      )}
    </div>
  );
}
