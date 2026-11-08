import { useState, useRef, useEffect } from 'react';
import { Clock, Pin, Palette, ChevronDown } from 'lucide-react';
import { parseUTCDate, timeAgo } from '../../utils/dateUtils';
import { linkify } from '../../utils/textUtils';
import { getKeepColorStyle } from '../../utils/thoughtUtils';
import MoveCollectionMenu from './MoveCollectionMenu';
import ColorPickerMenu from './ColorPickerMenu';

export default function ThoughtCard({
  thought,
  collections = [],
  orderNumber,
  isHighlighted,
  isTopInCollapsedPile,
  hasMultipleInPile,
  pileCount,
  onPileClick,
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
  onColorChange,
  onMoveToCollection,
  onCreateNewCollection
}) {
  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [isColorOpen, setIsColorOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const contentRef = useRef(null);

  useEffect(() => {
    const checkOverflow = () => {
      if (contentRef.current) {
        setIsOverflowing(contentRef.current.scrollHeight > 280);
      }
    };
    checkOverflow();

    if (typeof ResizeObserver !== 'undefined' && contentRef.current) {
      const ro = new ResizeObserver(checkOverflow);
      ro.observe(contentRef.current);
      return () => ro.disconnect();
    }
  }, [thought.content]);

  const colorStyle = getKeepColorStyle(thought.color);
  const assignedCollection = collections.find((c) => c.id === thought.collectionId);

  const cardContent = (
    <div
      id={`thought-${thought.id}`}
      className={`group relative z-10 p-4 rounded-xl border transition-all duration-200 dark:text-slate-100 flex flex-col ${
        colorStyle.bg
      } ${
        isHighlighted
          ? 'border-indigo-500 ring-2 ring-indigo-500/50 shadow-md'
          : hasMultipleInPile
          ? `${colorStyle.border} shadow-sm group-hover:shadow-md group-hover:border-indigo-300 dark:group-hover:border-indigo-600/70`
          : `${colorStyle.border} shadow-sm hover:shadow-md`
      }`}
    >
      {/* Top Header Row: Only Time on Left, Pin on Right */}
      <div className="flex items-center justify-between mb-2 gap-2">
        {/* Left: Time & Order # */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-medium min-w-0">
          {orderNumber && (
            <span className="font-semibold uppercase tracking-wider text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 px-1.5 py-0.5 rounded text-[10px] shrink-0">
              #{orderNumber}
            </span>
          )}
          <span
            className="flex items-center gap-1 truncate text-xs"
            title={parseUTCDate(thought.createdAt).toLocaleString()}
          >
            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="truncate">{timeAgo(thought.createdAt)}</span>
          </span>
        </div>

        {/* Right: Pin Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin(thought.id, !thought.isPinned);
          }}
          disabled={isOffline}
          title={thought.isPinned ? 'Unpin thought' : 'Pin thought'}
          aria-label={thought.isPinned ? 'Unpin thought' : 'Pin thought'}
          className={`p-1 rounded transition-all cursor-pointer disabled:opacity-50 shrink-0 ${
            thought.isPinned
              ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100'
          }`}
        >
          <Pin className={`w-3.5 h-3.5 ${thought.isPinned ? 'fill-current rotate-45' : ''}`} />
        </button>
      </div>

      {/* Main Content / Inline Editor */}
      {isEditing ? (
        <div className="flex flex-col gap-2.5 my-1">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full border border-slate-300 dark:border-slate-600 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white dark:bg-slate-700 dark:text-slate-100 text-slate-800 text-sm"
            rows="3"
            disabled={isSaving}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancelEdit}
              disabled={isSaving}
              className="px-2.5 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSaveEdit}
              disabled={isSaving || isOffline}
              title={isOffline ? 'Not available offline' : ''}
              className="px-3 py-1 text-xs bg-indigo-600 dark:bg-indigo-500 text-white rounded hover:bg-indigo-700 dark:hover:bg-indigo-600 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer font-medium"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 my-0.5">
          <div
            ref={contentRef}
            className={`relative transition-all duration-200 ${
              !isExpanded ? 'max-h-72 overflow-hidden' : 'max-h-none'
            }`}
          >
            <div
              dir="auto"
              className="text-slate-800 dark:text-slate-200 text-base leading-relaxed whitespace-pre-wrap break-words"
              dangerouslySetInnerHTML={{ __html: linkify(thought.content) }}
            />

            {/* Gradient fade overlay when truncated */}
            {isOverflowing && !isExpanded && (
              <div
                className={`absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t ${
                  colorStyle.fade || 'from-white dark:from-slate-800'
                } to-transparent pointer-events-none`}
              />
            )}
          </div>

          {/* See more / See less button */}
          {isOverflowing && (
            <div className="pt-1 flex items-center justify-start">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer py-0.5 hover:underline"
              >
                <span>{isExpanded ? 'See less' : 'See more'}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Bottom Row: Collection Chip on Left, Action Buttons (Color, Edit, Delete) on Right */}
      {!isEditing && (
        <div className="mt-2.5 flex items-center justify-between gap-2 min-h-[26px]">
          {/* Collection Chip */}
          <div className="relative inline-flex items-center min-w-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsMoveOpen(!isMoveOpen);
              }}
              disabled={isOffline}
              title={isOffline ? 'Not available offline' : 'Change collection'}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:bg-black/10 dark:hover:bg-white/15 transition-colors cursor-pointer disabled:opacity-50 max-w-[120px] truncate"
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: assignedCollection?.color || '#94A3B8' }}
              />
              <span className="truncate">
                {assignedCollection ? assignedCollection.name : 'Uncategorized'}
              </span>
            </button>

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

          {/* Action Buttons: Color, Edit, Delete (hover revealed on desktop) */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Color Palette Picker */}
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsColorOpen(!isColorOpen);
                }}
                disabled={isOffline}
                title={isOffline ? 'Not available offline' : 'Change color'}
                aria-label="Change color"
                className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer disabled:opacity-50"
              >
                <Palette className="w-3.5 h-3.5" />
              </button>

              <ColorPickerMenu
                isOpen={isColorOpen}
                onClose={() => setIsColorOpen(false)}
                currentColor={thought.color}
                onSelectColor={(colorId) => onColorChange(thought.id, colorId)}
                isOffline={isOffline}
              />
            </div>

            {/* Edit Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onStartEdit();
              }}
              disabled={isOffline}
              title={isOffline ? 'Not available offline' : ''}
              className="text-xs text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer px-1 py-0.5 rounded"
            >
              Edit
            </button>

            {/* Delete Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              disabled={isOffline}
              title={isOffline ? 'Not available offline' : ''}
              className="text-xs text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer px-1 py-0.5 rounded"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );

  if (isTopInCollapsedPile && hasMultipleInPile) {
    return (
      <div
        onClick={onPileClick}
        className="relative isolate group cursor-pointer transition-all duration-300 pb-3"
      >
        {pileCount >= 3 && (
          <div
            aria-hidden="true"
            className="absolute inset-0 translate-y-3.5 mx-3 rounded-xl bg-slate-100/90 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 shadow-xs -rotate-1 transition-all duration-300 ease-out group-hover:translate-y-5 group-hover:-rotate-2 group-hover:scale-[1.01] pointer-events-none -z-20"
          />
        )}
        {pileCount >= 2 && (
          <div
            aria-hidden="true"
            className="absolute inset-0 translate-y-1.5 mx-1.5 rounded-xl bg-slate-50/95 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs rotate-0.5 transition-all duration-300 ease-out group-hover:translate-y-2.5 group-hover:rotate-1.5 group-hover:scale-[1.005] pointer-events-none -z-10"
          />
        )}
        {cardContent}
      </div>
    );
  }

  return cardContent;
}
