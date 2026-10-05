import { useState, useEffect } from 'react';
import { AlertTriangle, X, Trash2 } from 'lucide-react';
import useCalendarStore from '../../store/useCalendarStore';
import useUIStore from '../../store/useUIStore';

export default function DeleteCategoryModal({ isOpen, onClose, category }) {
  const { categories, deleteCategory, getCategoryEventCount, events } = useCalendarStore();
  const isOffline = useUIStore((state) => state.isOffline);
  const addToast = useUIStore((state) => state.addToast);

  const [loadingCount, setLoadingCount] = useState(true);
  const [eventCount, setEventCount] = useState(0);
  const [actionChoice, setActionChoice] = useState('unassign'); // 'unassign' | 'move'
  const [targetCategoryId, setTargetCategoryId] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Other available categories to move events into
  const otherCategories = categories.filter((c) => c.id !== category?.id);
  const defaultTargetId = otherCategories[0]?.id || '';

  useEffect(() => {
    if (!isOpen || !category) return;

    let isMounted = true;
    setLoadingCount(true);
    setActionChoice('unassign');
    setTargetCategoryId(defaultTargetId);

    getCategoryEventCount(category.id)
      .then((count) => {
        if (isMounted) {
          setEventCount(typeof count === 'number' ? count : 0);
          setLoadingCount(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          const fallback = events.filter((e) => e.categoryId === category.id).length;
          setEventCount(fallback);
          setLoadingCount(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, category, defaultTargetId, events, getCategoryEventCount]);


  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen || !category) return null;

  const handleDelete = async () => {
    if (isOffline || isDeleting || loadingCount) return;

    setIsDeleting(true);
    try {
      const shouldMove = actionChoice === 'move' && targetCategoryId && eventCount > 0;
      const moveToId = shouldMove ? targetCategoryId : null;

      await deleteCategory(category.id, moveToId);

      const targetCat = otherCategories.find((c) => c.id === moveToId);
      if (shouldMove && targetCat) {
        addToast(
          `Category "${category.name}" deleted. Moved ${eventCount} ${
            eventCount === 1 ? 'event' : 'events'
          } to "${targetCat.name}".`,
          'success'
        );
      } else {
        const uncategorisedMsg =
          eventCount > 0
            ? ` (${eventCount} ${eventCount === 1 ? 'event' : 'events'} uncategorised)`
            : '';
        addToast(`Category "${category.name}" deleted${uncategorisedMsg}.`, 'success');
      }

      onClose();
    } catch (error) {
      console.error('Failed to delete category:', error);
      addToast('Failed to delete category. Please try again.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const selectedTargetCat = otherCategories.find((c) => c.id === targetCategoryId);

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 animate-fadeIn"
      onClick={!isDeleting ? onClose : undefined}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col transform transition-all border border-slate-200 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 flex items-start gap-3 border-b border-slate-200 dark:border-slate-700">
          <div className="p-2.5 rounded-full shrink-0 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white leading-tight">
              Delete Category
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Confirm deletion and handle existing calendar events
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 flex flex-col gap-4">
          {/* Target category preview */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/70 rounded-lg border border-slate-200 dark:border-slate-700/80">
            <span
              className="w-4 h-4 rounded-full shrink-0 shadow-sm"
              style={{ backgroundColor: category.colorCode || '#3B82F6' }}
            />
            <span className="font-medium text-slate-800 dark:text-slate-100 text-sm truncate">
              {category.name}
            </span>
          </div>

          {/* Event count status */}
          {loadingCount ? (
            <div className="py-4 flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              <span>Checking associated events...</span>
            </div>
          ) : eventCount === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Are you sure you want to delete this category? There are currently no events assigned to it.
            </p>
          ) : (
            <div className="flex flex-col gap-3.5">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-lg">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  {eventCount === 1
                    ? '1 event has this category'
                    : `${eventCount} events have this category`}
                </p>
                <p className="text-xs text-amber-700/90 dark:text-amber-400 mt-1">
                  Any event with this category will be uncategorised unless you choose to move it to another category.
                </p>
              </div>

              {otherCategories.length > 0 ? (
                <div className="flex flex-col gap-2.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Would you like to move these events to another category?
                  </span>

                  <div className="flex flex-col gap-2">
                    {/* Unassign option */}
                    <label
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        actionChoice === 'unassign'
                          ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/20 ring-1 ring-blue-500/20'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/40'
                      }`}
                    >
                      <input
                        type="radio"
                        name="deleteCategoryChoice"
                        value="unassign"
                        checked={actionChoice === 'unassign'}
                        onChange={() => setActionChoice('unassign')}
                        className="mt-0.5 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                          Leave uncategorised
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {eventCount === 1 ? 'The event' : `All ${eventCount} events`} will have no category assigned.
                        </span>
                      </div>
                    </label>

                    {/* Move to another category option */}
                    <label
                      className={`flex flex-col gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                        actionChoice === 'move'
                          ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/20 ring-1 ring-blue-500/20'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/40'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="deleteCategoryChoice"
                          value="move"
                          checked={actionChoice === 'move'}
                          onChange={() => setActionChoice('move')}
                          className="mt-0.5 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                            Move events to another category
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Reassign {eventCount === 1 ? '1 event' : `all ${eventCount} events`} before deleting.
                          </span>
                        </div>
                      </div>

                      {actionChoice === 'move' && (
                        <div className="ml-7 pt-1">
                          <label className="text-xs text-slate-600 dark:text-slate-400 mb-1 block">
                            Select destination category:
                          </label>
                          <select
                            value={targetCategoryId}
                            onChange={(e) => setTargetCategoryId(e.target.value)}
                            className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          >
                            {otherCategories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>

                          {selectedTargetCat && (
                            <div className="flex items-center gap-2 mt-2 text-xs text-slate-500 dark:text-slate-400">
                              <span>Target color:</span>
                              <span
                                className="w-2.5 h-2.5 rounded-full inline-block"
                                style={{ backgroundColor: selectedTargetCat.colorCode || '#3B82F6' }}
                              />
                              <span className="font-medium text-slate-700 dark:text-slate-300">
                                {selectedTargetCat.name}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  There are no other existing categories to move events to. Events will become uncategorised.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-end gap-2.5 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={
              isOffline ||
              isDeleting ||
              loadingCount ||
              (actionChoice === 'move' && eventCount > 0 && !targetCategoryId)
            }
            title={isOffline ? 'Not available offline' : 'Delete Category'}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm"
          >
            <Trash2 className="w-4 h-4" />
            {isDeleting
              ? 'Deleting...'
              : actionChoice === 'move' && targetCategoryId && eventCount > 0
              ? 'Move & Delete'
              : 'Delete Category'}
          </button>
        </div>
      </div>
    </div>
  );
}
