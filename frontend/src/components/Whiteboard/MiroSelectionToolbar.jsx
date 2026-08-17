import { useState, useEffect, useRef } from 'react';
import { 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Copy, 
  Trash2, 
  Type, 
  ChevronDown,
  StickyNote,
  Palette,
  MoveRight,
  Spline,
  CornerDownRight
} from 'lucide-react';
import { 
  DefaultColorStyle, 
  DefaultSizeStyle, 
  DefaultFontStyle, 
  DefaultTextAlignStyle,
  DefaultFillStyle,
  createShapeId
} from 'tldraw';

const MIRO_COLORS = [
  { id: 'yellow', label: 'Yellow', bg: 'bg-amber-300 border-amber-400' },
  { id: 'orange', label: 'Orange', bg: 'bg-orange-400 border-orange-500' },
  { id: 'light-violet', label: 'Pink', bg: 'bg-pink-300 border-pink-400' },
  { id: 'violet', label: 'Purple', bg: 'bg-purple-400 border-purple-500' },
  { id: 'light-blue', label: 'Sky Blue', bg: 'bg-sky-300 border-sky-400' },
  { id: 'blue', label: 'Blue', bg: 'bg-blue-500 border-blue-600' },
  { id: 'light-green', label: 'Light Green', bg: 'bg-emerald-300 border-emerald-400' },
  { id: 'green', label: 'Green', bg: 'bg-green-500 border-green-600' },
  { id: 'light-red', label: 'Coral', bg: 'bg-rose-300 border-rose-400' },
  { id: 'red', label: 'Red', bg: 'bg-red-500 border-red-600' },
  { id: 'grey', label: 'Gray', bg: 'bg-slate-400 border-slate-500' },
  { id: 'black', label: 'Dark', bg: 'bg-slate-900 border-slate-800' }
];

const FONT_SIZES = [
  { id: 's', label: 'S' },
  { id: 'm', label: 'M' },
  { id: 'l', label: 'L' },
  { id: 'xl', label: 'XL' }
];

const FONT_FAMILIES = [
  { id: 'sans', label: 'Sans' },
  { id: 'serif', label: 'Serif' },
  { id: 'draw', label: 'Draw' },
  { id: 'mono', label: 'Mono' }
];

const ALIGNMENTS = [
  { id: 'start', icon: AlignLeft, label: 'Left' },
  { id: 'middle', icon: AlignCenter, label: 'Center' },
  { id: 'end', icon: AlignRight, label: 'Right' }
];

const FILL_STYLES = [
  { id: 'none', label: 'None' },
  { id: 'semi', label: 'Semi' },
  { id: 'solid', label: 'Solid' },
  { id: 'pattern', label: 'Hatch' }
];

const ARROW_KINDS = [
  { id: 'straight', label: 'Straight', icon: MoveRight },
  { id: 'curved', label: 'Curved', icon: Spline },
  { id: 'squared', label: 'Squared', icon: CornerDownRight }
];

export default function MiroSelectionToolbar({ editor }) {
  const [selectedShapes, setSelectedShapes] = useState([]);
  const [position, setPosition] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null); // 'noteColor' | 'textColor' | 'shapeColor' | 'font' | 'fill' | 'arrowKind' | null
  const menuRef = useRef(null);

  // Read current styles from selected shapes
  const [currentStyles, setCurrentStyles] = useState({
    noteColor: 'yellow',
    textColor: 'black',
    shapeColor: 'black',
    size: 'm',
    font: 'draw',
    align: 'start',
    fill: 'none',
    arrowKind: 'straight'
  });

  useEffect(() => {
    if (!editor) return;

    const updateSelection = () => {
      try {
        const shapes = editor.getSelectedShapes ? editor.getSelectedShapes() : [];
        setSelectedShapes(shapes);

        if (shapes.length > 0) {
          const bounds = editor.getSelectionRotatedPageBounds 
            ? editor.getSelectionRotatedPageBounds() 
            : editor.getSelectionPageBounds?.();

          if (bounds) {
            const topCenter = editor.pageToScreen({
              x: bounds.minX + bounds.width / 2,
              y: bounds.minY
            });
            const bottomCenter = editor.pageToScreen({
              x: bounds.minX + bounds.width / 2,
              y: bounds.maxY
            });

            setPosition({
              topX: topCenter.x,
              topY: topCenter.y,
              bottomY: bottomCenter.y
            });
          }

          // Extract current styles
          const shared = editor.getSharedStyles ? editor.getSharedStyles() : null;
          const noteShape = shapes.find((s) => s.type === 'note');
          const textShape = shapes.find((s) => s.type === 'text');
          const geoShape = shapes.find((s) => s.type === 'geo');
          const arrowShape = shapes.find((s) => s.type === 'arrow');
          const firstShape = shapes[0];

          const noteColor = noteShape?.props?.color || 'yellow';
          const noteTextColor = noteShape?.props?.labelColor || 'black';
          const textColor = textShape 
            ? (textShape.props?.color || 'black') 
            : (noteShape?.props?.labelColor || geoShape?.props?.labelColor || arrowShape?.props?.labelColor || 'black');
          const shapeColor = geoShape 
            ? (geoShape.props?.color || 'black') 
            : (arrowShape?.props?.color || firstShape?.props?.color || 'black');

          // Detect arrow shape kind (straight / curved / squared)
          let arrowKind = 'straight';
          if (arrowShape) {
            if (arrowShape.props?.kind === 'elbow') {
              arrowKind = 'squared';
            } else if (Math.abs(arrowShape.props?.bend || 0) > 2) {
              arrowKind = 'curved';
            } else {
              arrowKind = 'straight';
            }
          }

          setCurrentStyles({
            noteColor,
            textColor,
            shapeColor,
            arrowKind,
            size: shared?.getAsKnownValue(DefaultSizeStyle) || firstShape?.props?.size || 'm',
            font: shared?.getAsKnownValue(DefaultFontStyle) || firstShape?.props?.font || 'draw',
            align: shared?.getAsKnownValue(DefaultTextAlignStyle) || firstShape?.props?.align || 'start',
            fill: shared?.getAsKnownValue(DefaultFillStyle) || firstShape?.props?.fill || 'none'
          });
        } else {
          setPosition(null);
          setActiveMenu(null);
        }
      } catch (e) {
        console.warn('Error reading selection', e);
      }
    };

    updateSelection();

    const unlisten = editor.store.listen(updateSelection, { scope: 'all' });
    window.addEventListener('resize', updateSelection);

    let resizeObserver = null;
    const container = editor.getContainer?.();
    if (container && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        updateSelection();
      });
      resizeObserver.observe(container);
    }

    return () => {
      unlisten();
      window.removeEventListener('resize', updateSelection);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [editor]);

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('pointerdown', handleOutsideClick);
    return () => document.removeEventListener('pointerdown', handleOutsideClick);
  }, []);

  if (!editor || selectedShapes.length === 0 || !position) return null;

  // Determine what controls to display based on selected shape types
  const hasNotes = selectedShapes.some((s) => s.type === 'note');
  const hasText = selectedShapes.some((s) => s.type === 'text');
  const hasGeo = selectedShapes.some((s) => s.type === 'geo');
  const hasArrows = selectedShapes.some((s) => s.type === 'arrow');
  const hasDraw = selectedShapes.some((s) => ['draw', 'highlight', 'line'].includes(s.type));
  const isCustomCard = selectedShapes.some((s) => ['sanad-task', 'sanad-note'].includes(s.type));

  // Custom cards have their own UI
  if (isCustomCard && selectedShapes.length === 1) return null;

  // Apply Sticky Note Background Color
  const handleApplyNoteColor = (colorId) => {
    try {
      const notes = selectedShapes.filter((s) => s.type === 'note');
      if (notes.length > 0) {
        editor.updateShapes(notes.map((n) => ({
          id: n.id,
          type: 'note',
          props: { color: colorId }
        })));
      }
      editor.setStyleForNextShapes(DefaultColorStyle, colorId);
      setCurrentStyles((s) => ({ ...s, noteColor: colorId }));
      setActiveMenu(null);
    } catch (e) {
      console.warn('Failed to apply note color', e);
    }
  };

  // Apply Font / Text / Label Color (Sticky Notes, Text, Shapes, and Arrows)
  const handleApplyTextColor = (colorId) => {
    try {
      const updates = [];
      for (const shape of selectedShapes) {
        if (shape.type === 'note') {
          updates.push({
            id: shape.id,
            type: 'note',
            props: { labelColor: colorId }
          });
        } else if (shape.type === 'text') {
          updates.push({
            id: shape.id,
            type: 'text',
            props: { color: colorId }
          });
        } else if (shape.type === 'geo') {
          updates.push({
            id: shape.id,
            type: 'geo',
            props: { labelColor: colorId }
          });
        } else if (shape.type === 'arrow') {
          updates.push({
            id: shape.id,
            type: 'arrow',
            props: { labelColor: colorId }
          });
        }
      }
      if (updates.length > 0) {
        editor.updateShapes(updates);
      }
      if (hasText) {
        editor.setStyleForSelectedShapes(DefaultColorStyle, colorId);
        editor.setStyleForNextShapes(DefaultColorStyle, colorId);
      }
      setCurrentStyles((s) => ({ ...s, textColor: colorId }));
      setActiveMenu(null);
    } catch (e) {
      console.warn('Failed to apply text color', e);
    }
  };

  // Apply Shape / Stroke Color (for Geo shapes, Drawings, Lines, Arrows)
  const handleApplyShapeColor = (colorId) => {
    try {
      editor.setStyleForSelectedShapes(DefaultColorStyle, colorId);
      editor.setStyleForNextShapes(DefaultColorStyle, colorId);
      setCurrentStyles((s) => ({ ...s, shapeColor: colorId }));
      setActiveMenu(null);
    } catch (e) {
      console.warn('Failed to apply shape color', e);
    }
  };

  // Apply Arrow Shape Routing (Straight / Curved / Squared)
  const handleSetArrowKind = (kindType) => {
    try {
      const arrows = selectedShapes.filter((s) => s.type === 'arrow');
      if (arrows.length === 0) return;

      const updates = arrows.map((arrow) => {
        if (kindType === 'straight') {
          return {
            id: arrow.id,
            type: 'arrow',
            props: {
              kind: 'arc',
              bend: 0
            }
          };
        } else if (kindType === 'curved') {
          const currentBend = arrow.props?.bend;
          return {
            id: arrow.id,
            type: 'arrow',
            props: {
              kind: 'arc',
              bend: (currentBend && Math.abs(currentBend) > 2) ? currentBend : 25
            }
          };
        } else if (kindType === 'squared') {
          return {
            id: arrow.id,
            type: 'arrow',
            props: {
              kind: 'elbow'
            }
          };
        }
        return null;
      }).filter(Boolean);

      if (updates.length > 0) {
        editor.updateShapes(updates);
      }
      setCurrentStyles((s) => ({ ...s, arrowKind: kindType }));
    } catch (e) {
      console.warn('Failed to update arrow kind', e);
    }
  };

  // Trigger Inline Text / Label Editing on Arrow
  const handleAddOrEditArrowText = () => {
    try {
      const arrow = selectedShapes.find((s) => s.type === 'arrow');
      if (arrow) {
        editor.setEditingShape(arrow.id);
      }
    } catch (e) {
      console.warn('Failed to edit arrow text', e);
    }
  };

  const handleApplySize = (sizeId) => {
    try {
      editor.setStyleForSelectedShapes(DefaultSizeStyle, sizeId);
      editor.setStyleForNextShapes(DefaultSizeStyle, sizeId);
      setCurrentStyles((s) => ({ ...s, size: sizeId }));
    } catch (e) {
      console.warn('Failed to apply size', e);
    }
  };

  const handleApplyFont = (fontId) => {
    try {
      editor.setStyleForSelectedShapes(DefaultFontStyle, fontId);
      editor.setStyleForNextShapes(DefaultFontStyle, fontId);
      setCurrentStyles((s) => ({ ...s, font: fontId }));
      setActiveMenu(null);
    } catch (e) {
      console.warn('Failed to apply font', e);
    }
  };

  const handleApplyAlign = (alignId) => {
    try {
      editor.setStyleForSelectedShapes(DefaultTextAlignStyle, alignId);
      editor.setStyleForNextShapes(DefaultTextAlignStyle, alignId);
      setCurrentStyles((s) => ({ ...s, align: alignId }));
    } catch (e) {
      console.warn('Failed to apply align', e);
    }
  };

  const handleApplyFill = (fillId) => {
    try {
      editor.setStyleForSelectedShapes(DefaultFillStyle, fillId);
      editor.setStyleForNextShapes(DefaultFillStyle, fillId);
      setCurrentStyles((s) => ({ ...s, fill: fillId }));
      setActiveMenu(null);
    } catch (e) {
      console.warn('Failed to apply fill', e);
    }
  };

  const handleDuplicate = () => {
    try {
      const selected = editor.getSelectedShapes ? editor.getSelectedShapes() : [];
      if (!selected || selected.length === 0) return;

      const bounds = editor.getSelectionRotatedPageBounds 
        ? editor.getSelectionRotatedPageBounds() 
        : editor.getSelectionPageBounds?.();

      const shapeIds = selected.map((s) => s.id);
      const content = editor.getContentFromCurrentPage ? editor.getContentFromCurrentPage(shapeIds) : null;

      if (content && bounds && editor.putContentOntoCurrentPage) {
        // Position duplicated content cleanly to the right with a 20px margin
        const targetCenter = {
          x: bounds.maxX + 20 + bounds.width / 2,
          y: bounds.minY + bounds.height / 2
        };

        editor.putContentOntoCurrentPage(content, {
          point: targetCenter,
          select: true
        });
      } else {
        // Fallback: manually clone shapes offset to the right
        const newShapes = selected.map((shape) => {
          const shapeBounds = editor.getShapePageBounds ? editor.getShapePageBounds(shape) : null;
          const width = shapeBounds ? shapeBounds.width : (shape.props?.w || 200);
          return {
            ...structuredClone(shape),
            id: createShapeId(),
            x: shape.x + width + 20,
            y: shape.y
          };
        });
        editor.createShapes?.(newShapes);
        if (editor.setSelectedShapes) {
          editor.setSelectedShapes(newShapes.map((s) => s.id));
        }
      }
    } catch (e) {
      console.warn('Failed to duplicate shapes', e);
    }
  };

  const handleDelete = () => {
    try {
      const ids = editor.getSelectedShapeIds();
      if (ids.length > 0) {
        editor.deleteShapes(ids);
      }
    } catch (e) {
      console.warn('Failed to delete shapes', e);
    }
  };

  const currentNoteColorObj = MIRO_COLORS.find((c) => c.id === currentStyles.noteColor) || MIRO_COLORS[0];
  const currentTextColorObj = MIRO_COLORS.find((c) => c.id === currentStyles.textColor) || MIRO_COLORS[11];
  const currentShapeColorObj = MIRO_COLORS.find((c) => c.id === currentStyles.shapeColor) || MIRO_COLORS[11];

  // Dynamic container boundary positioning calculations (accounts for Sanad navigation sidebar):
  const container = menuRef.current?.parentElement || editor?.getContainer?.();
  const containerRect = container?.getBoundingClientRect();
  const containerWidth = containerRect?.width || (typeof window !== 'undefined' ? window.innerWidth : 1200);
  const containerHeight = containerRect?.height || (typeof window !== 'undefined' ? window.innerHeight : 800);
  const margin = 16;
  const toolbarWidth = menuRef.current?.offsetWidth || 460;
  const approxToolbarHalfWidth = toolbarWidth / 2;

  // Horizontal clamping: keep toolbar bounded within the whiteboard container
  // 72px accounts for the floating left Miro toolbar inside the whiteboard
  const minLeft = Math.min(72 + approxToolbarHalfWidth, containerWidth / 2);
  const maxLeft = Math.max(minLeft, containerWidth - margin - approxToolbarHalfWidth);
  const clampedX = Math.max(minLeft, Math.min(maxLeft, position.topX));

  // Vertical placement: place 54px above the shape.
  // If placing above would clip past the top edge of the whiteboard container, place below the shape.
  const shouldPlaceBelow = position.topY - 54 < 60;
  const clampedY = shouldPlaceBelow
    ? Math.min(containerHeight - 64 - margin, (position.bottomY || position.topY) + 12)
    : Math.max(16, position.topY - 54);

  // Directional popover alignment relative to whiteboard container bounds
  const isNearRightEdge = clampedX > containerWidth - 240;
  const isNearBottomEdge = clampedY > containerHeight - 240;
  const popoverAlignClass = `${isNearRightEdge ? 'right-0' : 'left-0'} ${
    isNearBottomEdge ? 'bottom-full mb-2' : 'top-full mt-2'
  }`;

  return (
    <div
      ref={menuRef}
      style={{
        position: 'absolute',
        top: `${clampedY}px`,
        left: `${clampedX}px`,
        transform: 'translateX(-50%)',
        zIndex: 100
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className="pointer-events-auto select-none flex items-center gap-1.5 p-1.5 bg-white/95 dark:bg-slate-850/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-700/90 animate-in fade-in zoom-in-95 duration-100 font-sans"
    >
      {/* 1. Arrow Shape Dropdown (Straight / Curved / Squared) */}
      {hasArrows && (
        <>
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveMenu(activeMenu === 'arrowKind' ? null : 'arrowKind')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-750 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
              title="Arrow Shape"
            >
              {(() => {
                const currentKindObj = ARROW_KINDS.find((k) => k.id === currentStyles.arrowKind) || ARROW_KINDS[0];
                const Icon = currentKindObj.icon;
                return (
                  <>
                    <Icon className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{currentKindObj.label}</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </>
                );
              })()}
            </button>

            {/* Arrow Shape Dropdown Menu */}
            {activeMenu === 'arrowKind' && (
              <div className={`absolute ${popoverAlignClass} p-1.5 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 flex flex-col gap-1 w-36 z-50 animate-in fade-in zoom-in-95`}>
                {ARROW_KINDS.map((ak) => {
                  const Icon = ak.icon;
                  const isSelected = currentStyles.arrowKind === ak.id;
                  return (
                    <button
                      key={ak.id}
                      onClick={() => {
                        handleSetArrowKind(ak.id);
                        setActiveMenu(null);
                      }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-medium transition-colors ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{ak.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add / Edit Text Button for Arrow */}
          <button
            type="button"
            onClick={handleAddOrEditArrowText}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
            title="Add or edit text on arrow (Double-click arrow to edit)"
          >
            <Type className="w-3.5 h-3.5 text-indigo-500" />
            <span>Text</span>
          </button>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
        </>
      )}

      {/* 2. Sticky Note Background Color (When Note is Selected) */}
      {hasNotes && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setActiveMenu(activeMenu === 'noteColor' ? null : 'noteColor')}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors"
            title="Sticky Note Color"
          >
            <StickyNote className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span className={`w-3.5 h-3.5 rounded-md border shadow-sm ${currentNoteColorObj.bg}`} />
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {/* Note Color Palette Popover */}
          {activeMenu === 'noteColor' && (
            <div className={`absolute ${popoverAlignClass} p-2.5 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 grid grid-cols-4 gap-2 w-44 z-50 animate-in fade-in zoom-in-95`}>
              {MIRO_COLORS.map((col) => (
                <button
                  key={col.id}
                  onClick={() => handleApplyNoteColor(col.id)}
                  className={`w-7 h-7 rounded-lg border shadow-sm transition-transform hover:scale-110 active:scale-95 ${col.bg} ${
                    currentStyles.noteColor === col.id ? 'ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-slate-800' : ''
                  }`}
                  title={col.label}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. Shape / Line / Stroke Color (for Geo shapes, Drawings, Lines, Arrows) */}
      {(hasGeo || hasArrows || (hasDraw && !hasNotes && !hasText)) && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setActiveMenu(activeMenu === 'shapeColor' ? null : 'shapeColor')}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors"
            title={hasArrows ? "Arrow Color" : "Shape / Border Color"}
          >
            <Palette className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span className={`w-3.5 h-3.5 rounded-full border shadow-sm ${currentShapeColorObj.bg}`} />
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {/* Shape Color Palette Popover */}
          {activeMenu === 'shapeColor' && (
            <div className={`absolute ${popoverAlignClass} p-2.5 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 grid grid-cols-4 gap-2 w-44 z-50 animate-in fade-in zoom-in-95`}>
              {MIRO_COLORS.map((col) => (
                <button
                  key={col.id}
                  onClick={() => handleApplyShapeColor(col.id)}
                  className={`w-7 h-7 rounded-lg border shadow-sm transition-transform hover:scale-110 active:scale-95 ${col.bg} ${
                    currentStyles.shapeColor === col.id ? 'ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-slate-800' : ''
                  }`}
                  title={col.label}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. Text / Font Color (for Sticky Notes, Text blocks, Geo shapes, and Arrows) */}
      {(hasNotes || hasText || hasGeo || hasArrows) && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setActiveMenu(activeMenu === 'textColor' ? null : 'textColor')}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors"
            title={hasArrows ? "Arrow Text Color" : "Text / Font Color"}
          >
            <div className="flex flex-col items-center justify-center -space-y-0.5">
              <span className="text-[13px] font-black text-slate-700 dark:text-slate-200 leading-tight">A</span>
              <span className={`w-3.5 h-1 rounded-full ${currentTextColorObj.bg}`} />
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {/* Text Color Palette Popover */}
          {activeMenu === 'textColor' && (
            <div className={`absolute ${popoverAlignClass} p-2.5 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 grid grid-cols-4 gap-2 w-44 z-50 animate-in fade-in zoom-in-95`}>
              {MIRO_COLORS.map((col) => (
                <button
                  key={col.id}
                  onClick={() => handleApplyTextColor(col.id)}
                  className={`w-7 h-7 rounded-lg border shadow-sm transition-transform hover:scale-110 active:scale-95 ${col.bg} ${
                    currentStyles.textColor === col.id ? 'ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-slate-800' : ''
                  }`}
                  title={col.label}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. Font Size (S / M / L / XL) */}
      {(hasNotes || hasText || hasGeo || hasArrows || hasDraw) && (
        <>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
          <div className="flex items-center bg-slate-100/80 dark:bg-slate-800/80 p-0.5 rounded-xl">
            {FONT_SIZES.map((sz) => (
              <button
                key={sz.id}
                type="button"
                onClick={() => handleApplySize(sz.id)}
                className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all ${
                  currentStyles.size === sz.id
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                title={`Size ${sz.label}`}
              >
                {sz.label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* 6. Font Family (Sans / Serif / Draw / Mono) */}
      {(hasNotes || hasText || hasGeo || hasArrows) && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setActiveMenu(activeMenu === 'font' ? null : 'font')}
            className="flex items-center gap-1 px-2 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-750 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
            title="Font Style"
          >
            <Type className="w-3.5 h-3.5 text-slate-500" />
            <span className="capitalize">{currentStyles.font}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {/* Font Family Popover */}
          {activeMenu === 'font' && (
            <div className={`absolute ${popoverAlignClass} p-1.5 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 flex flex-col gap-1 w-32 z-50 animate-in fade-in zoom-in-95`}>
              {FONT_FAMILIES.map((f) => (
                <button
                  key={f.id}
                  onClick={() => handleApplyFont(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-left text-xs font-medium transition-colors ${
                    currentStyles.font === f.id
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 7. Text Alignment (Left / Center / Right) */}
      {(hasNotes || hasText || hasGeo) && (
        <>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
          <div className="flex items-center gap-0.5">
            {ALIGNMENTS.map((al) => {
              const Icon = al.icon;
              const isSelected = currentStyles.align === al.id;
              return (
                <button
                  key={al.id}
                  type="button"
                  onClick={() => handleApplyAlign(al.id)}
                  className={`p-1.5 rounded-lg text-xs transition-colors ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-750'
                  }`}
                  title={al.label}
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* 8. Fill Style (for Geo shapes) */}
      {hasGeo && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setActiveMenu(activeMenu === 'fill' ? null : 'fill')}
            className="flex items-center gap-1 px-2 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-750 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
            title="Fill Style"
          >
            <span className="capitalize">{currentStyles.fill}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {/* Fill Popover */}
          {activeMenu === 'fill' && (
            <div className={`absolute ${popoverAlignClass} p-1.5 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 flex flex-col gap-1 w-28 z-50 animate-in fade-in zoom-in-95`}>
              {FILL_STYLES.map((fil) => (
                <button
                  key={fil.id}
                  onClick={() => handleApplyFill(fil.id)}
                  className={`px-3 py-1.5 rounded-xl text-left text-xs font-medium transition-colors ${
                    currentStyles.fill === fil.id
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {fil.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

      {/* 9. Quick Duplicate & Delete */}
      <button
        type="button"
        onClick={handleDuplicate}
        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors"
        title="Duplicate (places copy to the right)"
      >
        <Copy className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={handleDelete}
        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
        title="Delete (Del)"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
