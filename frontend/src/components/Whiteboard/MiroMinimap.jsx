import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Plus, 
  Minus, 
  Maximize2, 
  Map, 
  ChevronDown
} from 'lucide-react';

const MINIMAP_WIDTH = 210;
const MINIMAP_HEIGHT = 140;
const PADDING = 150;

export default function MiroMinimap({ editor, isOpen = true, onToggle }) {
  const [internalOpen, setInternalOpen] = useState(isOpen);

  useEffect(() => {
    setInternalOpen(isOpen);
  }, [isOpen]);

  const handleToggle = () => {
    const next = !internalOpen;
    setInternalOpen(next);
    onToggle?.(next);
  };

  const [zoomLevel, setZoomLevel] = useState(1);
  const [minimapData, setMinimapData] = useState({
    shapes: [],
    viewport: { x: 0, y: 0, w: 0, h: 0 },
    bounds: { minX: -500, minY: -500, w: 1000, h: 1000 },
    scale: 0.1
  });

  const isDraggingRef = useRef(false);
  const svgRef = useRef(null);

  // Sync canvas state for minimap rendering
  const updateMinimap = useCallback(() => {
    if (!editor) return;

    try {
      const zoom = editor.getZoomLevel ? editor.getZoomLevel() : 1;
      setZoomLevel(zoom);

      const shapes = editor.getCurrentPageShapes ? editor.getCurrentPageShapes() : [];
      const viewport = editor.getViewportPageBounds ? editor.getViewportPageBounds() : null;

      if (!viewport) return;

      // Calculate total bounding box enclosing all shapes + viewport
      let minX = viewport.minX;
      let minY = viewport.minY;
      let maxX = viewport.maxX;
      let maxY = viewport.maxY;

      const renderedShapes = [];

      for (const shape of shapes) {
        const shapeBounds = editor.getShapePageBounds ? editor.getShapePageBounds(shape) : null;
        if (!shapeBounds) continue;

        minX = Math.min(minX, shapeBounds.minX);
        minY = Math.min(minY, shapeBounds.minY);
        maxX = Math.max(maxX, shapeBounds.maxX);
        maxY = Math.max(maxY, shapeBounds.maxY);

        renderedShapes.push({
          id: shape.id,
          type: shape.type,
          x: shapeBounds.minX,
          y: shapeBounds.minY,
          w: shapeBounds.width,
          h: shapeBounds.height,
          color: shape.props?.color || 'slate'
        });
      }

      // Add padding around overall bounds
      minX -= PADDING;
      minY -= PADDING;
      maxX += PADDING;
      maxY += PADDING;

      const totalW = Math.max(100, maxX - minX);
      const totalH = Math.max(100, maxY - minY);

      // Compute uniform scale to fit into minimap box
      const scaleX = MINIMAP_WIDTH / totalW;
      const scaleY = MINIMAP_HEIGHT / totalH;
      const scale = Math.min(scaleX, scaleY);

      // Center the content in the minimap box
      const scaledW = totalW * scale;
      const scaledH = totalH * scale;
      const offsetX = (MINIMAP_WIDTH - scaledW) / 2;
      const offsetY = (MINIMAP_HEIGHT - scaledH) / 2;

      setMinimapData({
        shapes: renderedShapes.map((s) => ({
          ...s,
          mx: offsetX + (s.x - minX) * scale,
          my: offsetY + (s.y - minY) * scale,
          mw: Math.max(2, s.w * scale),
          mh: Math.max(2, s.h * scale)
        })),
        viewport: {
          mx: offsetX + (viewport.minX - minX) * scale,
          my: offsetY + (viewport.minY - minY) * scale,
          mw: Math.max(6, viewport.width * scale),
          mh: Math.max(6, viewport.height * scale)
        },
        bounds: { minX, minY, totalW, totalH, offsetX, offsetY },
        scale
      });
    } catch (err) {
      console.warn('Error updating minimap', err);
    }
  }, [editor]);

  useEffect(() => {
    if (!editor) return;

    updateMinimap();

    // Listen to changes in camera or canvas store
    const unlisten = editor.store.listen(updateMinimap, { scope: 'all' });
    return () => unlisten();
  }, [editor, updateMinimap]);

  if (!editor) return null;

  // Handle clicking or dragging on minimap to pan viewport
  const handleMinimapPointer = (e) => {
    if (!svgRef.current || !editor || !minimapData.bounds) return;

    const rect = svgRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const { minX, minY, offsetX, offsetY } = minimapData.bounds;
    const { scale } = minimapData;

    if (scale <= 0) return;

    // Convert minimap pixel to canvas page coordinates
    const targetPageX = minX + (clickX - offsetX) / scale;
    const targetPageY = minY + (clickY - offsetY) / scale;

    try {
      const zoom = editor.getZoomLevel ? editor.getZoomLevel() : 1;
      const container = editor.getContainer ? editor.getContainer() : null;
      const viewW = container ? container.clientWidth : window.innerWidth;
      const viewH = container ? container.clientHeight : window.innerHeight;

      // Center the camera on the target point
      editor.setCamera({
        x: -targetPageX + viewW / (2 * zoom),
        y: -targetPageY + viewH / (2 * zoom),
        z: zoom
      });
    } catch (err) {
      console.warn('Failed to pan canvas from minimap', err);
    }
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    isDraggingRef.current = true;
    handleMinimapPointer(e);
  };

  const handlePointerMove = (e) => {
    if (isDraggingRef.current) {
      e.preventDefault();
      handleMinimapPointer(e);
    }
  };

  const handlePointerUp = () => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
    }
  };

  return (
    <div 
      className="absolute bottom-4 right-4 z-30 flex flex-col items-end gap-2 pointer-events-auto select-none font-sans"
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* 1. Minimap Canvas Box (Expandable) */}
      {internalOpen && (
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-800 p-2.5 flex flex-col gap-1.5 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              <Map className="w-3 h-3 text-indigo-500" />
              <span>Navigator</span>
            </div>
            <button
              type="button"
              onClick={handleToggle}
              className="p-0.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Hide Minimap"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Minimap SVG Area */}
          <div 
            className="relative rounded-xl overflow-hidden bg-slate-100/90 dark:bg-slate-950/90 border border-slate-200/60 dark:border-slate-800 cursor-crosshair"
            style={{ width: MINIMAP_WIDTH, height: MINIMAP_HEIGHT }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <svg
              ref={svgRef}
              width={MINIMAP_WIDTH}
              height={MINIMAP_HEIGHT}
              className="w-full h-full block"
            >
              {/* Shapes */}
              {minimapData.shapes.map((s) => (
                <rect
                  key={s.id}
                  x={s.mx}
                  y={s.my}
                  width={s.mw}
                  height={s.mh}
                  rx={2}
                  className="fill-indigo-400/60 dark:fill-indigo-500/50 stroke-indigo-500/40 dark:stroke-indigo-400/40"
                  strokeWidth="1"
                />
              ))}

              {/* Active Viewport Rectangle */}
              <rect
                x={minimapData.viewport.mx}
                y={minimapData.viewport.my}
                width={minimapData.viewport.mw}
                height={minimapData.viewport.mh}
                rx={4}
                fill="rgba(99, 102, 241, 0.15)"
                stroke="#6366f1"
                strokeWidth="1.5"
                strokeDasharray="3 2"
              />
            </svg>
          </div>
        </div>
      )}

      {/* 2. Floating Zoom Controls Pill */}
      <div className="flex items-center gap-1 p-1 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-2xl shadow-xl border border-slate-200/90 dark:border-slate-800">
        {/* Toggle Minimap Button */}
        <button
          type="button"
          onClick={handleToggle}
          className={`p-1.5 rounded-xl transition-all ${
            internalOpen
              ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title={internalOpen ? 'Hide Minimap' : 'Show Minimap'}
        >
          <Map className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

        {/* Zoom Out */}
        <button
          type="button"
          onClick={() => editor.zoomOut?.()}
          className="p-1.5 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          title="Zoom Out (Ctrl -)"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        {/* Zoom Level Label */}
        <button
          type="button"
          onClick={() => editor.resetZoom?.()}
          className="px-1.5 py-0.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-mono transition-all"
          title="Reset to 100%"
        >
          {Math.round(zoomLevel * 100)}%
        </button>

        {/* Zoom In */}
        <button
          type="button"
          onClick={() => editor.zoomIn?.()}
          className="p-1.5 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          title="Zoom In (Ctrl +)"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

        {/* Zoom to Fit */}
        <button
          type="button"
          onClick={() => editor.zoomToFit?.()}
          className="p-1.5 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          title="Fit to Screen (Shift 1)"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
