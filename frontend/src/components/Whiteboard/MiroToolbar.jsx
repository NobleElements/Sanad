import { useState, useEffect, useRef } from 'react';
import { 
  MousePointer2, 
  Hand, 
  Type, 
  StickyNote, 
  Shapes, 
  Square, 
  Circle, 
  Triangle, 
  Diamond, 
  Star, 
  Cloud, 
  Hexagon, 
  Heart, 
  CheckSquare, 
  ArrowUpRight, 
  Minus, 
  Pen, 
  Highlighter, 
  Eraser, 
  Zap, 
  Frame, 
  Image as ImageIcon, 
  Sparkles, 
  MoreHorizontal, 
  RotateCcw, 
  RotateCw, 
  Maximize, 
  Grid2X2,
  Palette,
  Check,
  Trash2
} from 'lucide-react';
import { DefaultColorStyle, GeoShapeGeoStyle } from 'tldraw';

const STICKY_COLORS = [
  { id: 'yellow', label: 'Yellow', bg: 'bg-amber-300 border-amber-400' },
  { id: 'orange', label: 'Orange', bg: 'bg-orange-300 border-orange-400' },
  { id: 'light-violet', label: 'Pink', bg: 'bg-pink-300 border-pink-400' },
  { id: 'violet', label: 'Purple', bg: 'bg-purple-300 border-purple-400' },
  { id: 'light-blue', label: 'Sky Blue', bg: 'bg-sky-300 border-sky-400' },
  { id: 'blue', label: 'Blue', bg: 'bg-blue-400 border-blue-500' },
  { id: 'light-green', label: 'Green', bg: 'bg-emerald-300 border-emerald-400' },
  { id: 'grey', label: 'Gray', bg: 'bg-slate-300 border-slate-400' }
];

const SHAPES_LIST = [
  { id: 'rectangle', label: 'Rectangle', icon: Square },
  { id: 'ellipse', label: 'Circle', icon: Circle },
  { id: 'diamond', label: 'Diamond', icon: Diamond },
  { id: 'triangle', label: 'Triangle', icon: Triangle },
  { id: 'star', label: 'Star', icon: Star },
  { id: 'cloud', label: 'Cloud', icon: Cloud },
  { id: 'hexagon', label: 'Hexagon', icon: Hexagon },
  { id: 'heart', label: 'Heart', icon: Heart },
  { id: 'check-box', label: 'Check Box', icon: CheckSquare }
];

const DRAW_TOOLS = [
  { id: 'draw', label: 'Pen', icon: Pen, kbd: 'P' },
  { id: 'highlight', label: 'Highlighter', icon: Highlighter, kbd: 'Shift+H' },
  { id: 'eraser', label: 'Eraser', icon: Eraser, kbd: 'E' },
  { id: 'laser', label: 'Laser Pointer', icon: Zap, kbd: 'L' }
];

const CONNECTOR_TOOLS = [
  { id: 'arrow', label: 'Arrow', icon: ArrowUpRight, kbd: 'A' },
  { id: 'line', label: 'Straight Line', icon: Minus, kbd: 'L' }
];

const CANVAS_BACKGROUNDS = [
  { id: 'auto', label: 'Adaptive Auto', color: 'transparent', border: 'border-dashed border-slate-400' },
  { id: '#0f172a', label: 'Slate Dark', color: '#0f172a', border: 'border-slate-700 bg-slate-900' },
  { id: '#18181b', label: 'Charcoal', color: '#18181b', border: 'border-zinc-700 bg-zinc-900' },
  { id: '#0c192c', label: 'Midnight Navy', color: '#0c192c', border: 'border-blue-900 bg-[#0c192c]' },
  { id: '#f8fafc', label: 'Slate Light', color: '#f8fafc', border: 'border-slate-300 bg-slate-50' },
  { id: '#ffffff', label: 'Pure White', color: '#ffffff', border: 'border-slate-300 bg-white' },
  { id: '#faf8f5', label: 'Warm Cream', color: '#faf8f5', border: 'border-amber-200 bg-[#faf8f5]' }
];

export default function MiroToolbar({ editor, onToggleResourceDrawer, isResourceDrawerOpen, customBgColor, onSelectBgColor }) {
  const [currentTool, setCurrentTool] = useState('select');
  const [activeFlyout, setActiveFlyout] = useState(null); // 'select' | 'sticky' | 'shapes' | 'draw' | 'connectors' | 'more' | 'bg' | null
  const [isGridOn, setIsGridOn] = useState(false);
  const flyoutRef = useRef(null);
  const fileInputRef = useRef(null);

  // Sync active tool and grid from tldraw editor
  useEffect(() => {
    if (!editor) return;

    const updateTool = () => {
      const toolId = editor.getCurrentToolId();
      setCurrentTool(toolId);
      if (editor.getGridMode) {
        setIsGridOn(editor.getGridMode());
      }
    };

    updateTool();
    const unlisten = editor.store.listen(updateTool, { scope: 'session' });
    return () => unlisten();
  }, [editor]);

  // Close flyouts when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (flyoutRef.current && !flyoutRef.current.contains(e.target)) {
        setActiveFlyout(null);
      }
    };
    document.addEventListener('pointerdown', handleOutsideClick);
    return () => document.removeEventListener('pointerdown', handleOutsideClick);
  }, []);

  if (!editor) return null;

  const selectTool = (toolId, extraAction = null) => {
    try {
      editor.setCurrentTool(toolId);
      if (extraAction) extraAction();
      setActiveFlyout(null);
    } catch (e) {
      console.warn(`Failed to set tool to ${toolId}`, e);
    }
  };

  const handleSelectShape = (shapeId) => {
    try {
      editor.setStyleForNextShapes(GeoShapeGeoStyle, shapeId);
      editor.setCurrentTool('geo');
      setActiveFlyout(null);
    } catch (e) {
      console.warn(`Failed to select shape ${shapeId}`, e);
    }
  };

  const handleSelectStickyColor = (colorId) => {
    try {
      editor.setStyleForNextShapes(DefaultColorStyle, colorId);
      editor.setCurrentTool('note');
      setActiveFlyout(null);
    } catch (e) {
      console.warn(`Failed to set sticky color ${colorId}`, e);
    }
  };

  const handleToggleGrid = () => {
    try {
      if (editor.setGridMode && editor.getGridMode) {
        const next = !editor.getGridMode();
        editor.setGridMode(next);
        setIsGridOn(next);
      }
      setActiveFlyout(null);
    } catch (e) {
      console.warn('Failed to toggle grid mode', e);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    try {
      const bounds = editor.getViewportPageBounds();
      const center = bounds ? bounds.center : { x: 200, y: 200 };

      if (typeof editor.putExternalContent === 'function') {
        await editor.putExternalContent({
          type: 'files',
          files: [file],
          point: center
        });
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            const naturalW = img.naturalWidth || 600;
            const naturalH = img.naturalHeight || 400;

            const maxDimension = 600;
            let displayW = naturalW;
            let displayH = naturalH;
            if (displayW > maxDimension || displayH > maxDimension) {
              if (displayW > displayH) {
                displayH = Math.round((maxDimension / displayW) * displayH);
                displayW = maxDimension;
              } else {
                displayW = Math.round((maxDimension / displayH) * displayW);
                displayH = maxDimension;
              }
            }

            const assetId = `asset:${Date.now()}`;
            editor.createAssets([
              {
                id: assetId,
                type: 'image',
                typeName: 'asset',
                props: {
                  name: file.name,
                  src: reader.result,
                  w: naturalW,
                  h: naturalH,
                  mimeType: file.type,
                  isAnimated: false
                },
                meta: {}
              }
            ]);

            editor.createShape({
              type: 'image',
              x: center.x - displayW / 2,
              y: center.y - displayH / 2,
              props: {
                assetId,
                w: displayW,
                h: displayH
              }
            });
          };
          img.src = reader.result;
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error('Failed to insert image:', err);
    } finally {
      e.target.value = '';
      setActiveFlyout(null);
    }
  };

  const isShapeTool = currentTool === 'geo';
  const isDrawTool = ['draw', 'highlight', 'eraser', 'laser'].includes(currentTool);
  const isConnectorTool = ['arrow', 'line'].includes(currentTool);

  return (
    <div 
      ref={flyoutRef}
      className="absolute left-4 top-1/2 -translate-y-1/2 z-30 flex items-center pointer-events-auto font-sans"
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Hidden File Input for Image Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      {/* Main Vertical Toolbar Capsule */}
      <div className="flex flex-col items-center gap-1.5 p-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-800">
        
        {/* 1. Pointer / Select / Hand Tool */}
        <div className="relative group">
          <button
            type="button"
            onClick={() => {
              if (currentTool === 'select' || currentTool === 'hand') {
                setActiveFlyout(activeFlyout === 'select' ? null : 'select');
              } else {
                selectTool('select');
              }
            }}
            className={`p-2.5 rounded-xl transition-all ${
              currentTool === 'select' || currentTool === 'hand'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Select (V) / Hand (H)"
          >
            {currentTool === 'hand' ? <Hand className="w-5 h-5" /> : <MousePointer2 className="w-5 h-5" />}
          </button>

          {/* Flyout: Select / Hand */}
          {activeFlyout === 'select' && (
            <div className="absolute left-full ml-3 top-0 w-40 p-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-100 z-50">
              <button
                onClick={() => selectTool('select')}
                className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  currentTool === 'select' ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <MousePointer2 className="w-4 h-4" />
                <span>Select (V)</span>
              </button>
              <button
                onClick={() => selectTool('hand')}
                className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  currentTool === 'hand' ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Hand className="w-4 h-4" />
                <span>Hand / Pan (H)</span>
              </button>
            </div>
          )}
        </div>

        {/* 2. Sanad Cards / Resources Inserter */}
        <button
          type="button"
          onClick={() => {
            onToggleResourceDrawer();
            setActiveFlyout(null);
          }}
          className={`p-2.5 rounded-xl transition-all ${
            isResourceDrawerOpen
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none'
              : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50'
          }`}
          title="Sanad Task & Note Cards"
        >
          <Sparkles className="w-5 h-5" />
        </button>

        <div className="w-6 h-px bg-slate-200/80 dark:bg-slate-800 my-0.5" />

        {/* 3. Text Tool */}
        <button
          type="button"
          onClick={() => selectTool('text')}
          className={`p-2.5 rounded-xl transition-all ${
            currentTool === 'text'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Text (T)"
        >
          <Type className="w-5 h-5" />
        </button>

        {/* 4. Sticky Note with Color Picker Flyout */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              if (currentTool === 'note') {
                setActiveFlyout(activeFlyout === 'sticky' ? null : 'sticky');
              } else {
                selectTool('note');
                setActiveFlyout('sticky');
              }
            }}
            className={`p-2.5 rounded-xl transition-all ${
              currentTool === 'note'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Sticky Note (N)"
          >
            <StickyNote className="w-5 h-5" />
          </button>

          {/* Flyout: Sticky Note Colors */}
          {activeFlyout === 'sticky' && (
            <div className="absolute left-full ml-3 top-0 w-44 p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-100 z-50">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
                Sticky Colors
              </div>
              <div className="grid grid-cols-4 gap-2">
                {STICKY_COLORS.map((col) => (
                  <button
                    key={col.id}
                    onClick={() => handleSelectStickyColor(col.id)}
                    className={`w-7 h-7 rounded-lg border shadow-sm transition-transform hover:scale-110 active:scale-95 ${col.bg}`}
                    title={col.label}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 5. Shapes with Shape Grid Flyout */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setActiveFlyout(activeFlyout === 'shapes' ? null : 'shapes');
            }}
            className={`p-2.5 rounded-xl transition-all ${
              isShapeTool
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Shapes (R / C)"
          >
            <Shapes className="w-5 h-5" />
          </button>

          {/* Flyout: Shapes Grid */}
          {activeFlyout === 'shapes' && (
            <div className="absolute left-full ml-3 top-0 w-52 p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-100 z-50">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
                Shapes
              </div>
              <div className="grid grid-cols-3 gap-2">
                {SHAPES_LIST.map((shp) => {
                  const Icon = shp.icon;
                  return (
                    <button
                      key={shp.id}
                      onClick={() => handleSelectShape(shp.id)}
                      className="flex flex-col items-center justify-center p-2 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-200 transition-all group"
                      title={shp.label}
                    >
                      <Icon className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                      <span className="text-[10px] mt-1 font-medium text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate max-w-full">
                        {shp.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 6. Connectors (Arrow, Line) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              if (isConnectorTool) {
                setActiveFlyout(activeFlyout === 'connectors' ? null : 'connectors');
              } else {
                selectTool('arrow');
                setActiveFlyout('connectors');
              }
            }}
            className={`p-2.5 rounded-xl transition-all ${
              isConnectorTool
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Connection Lines & Arrows (A / L)"
          >
            <ArrowUpRight className="w-5 h-5" />
          </button>

          {/* Flyout: Connectors */}
          {activeFlyout === 'connectors' && (
            <div className="absolute left-full ml-3 top-0 w-44 p-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-100 z-50">
              {CONNECTOR_TOOLS.map((t) => {
                const Icon = t.icon;
                const isSelected = currentTool === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => selectTool(t.id)}
                    className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{t.label} ({t.kbd})</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 7. Pen / Draw / Laser Flyout */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              if (isDrawTool) {
                setActiveFlyout(activeFlyout === 'draw' ? null : 'draw');
              } else {
                selectTool('draw');
                setActiveFlyout('draw');
              }
            }}
            className={`p-2.5 rounded-xl transition-all ${
              isDrawTool
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Drawing Tools (P / E / L)"
          >
            <Pen className="w-5 h-5" />
          </button>

          {/* Flyout: Drawing Tools */}
          {activeFlyout === 'draw' && (
            <div className="absolute left-full ml-3 top-0 w-48 p-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-100 z-50">
              {DRAW_TOOLS.map((t) => {
                const Icon = t.icon;
                const isSelected = currentTool === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => selectTool(t.id)}
                    className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{t.label} ({t.kbd})</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 8. Frame / Section Tool */}
        <button
          type="button"
          onClick={() => selectTool('frame')}
          className={`p-2.5 rounded-xl transition-all ${
            currentTool === 'frame'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Frame / Presentation Section (F)"
        >
          <Frame className="w-5 h-5" />
        </button>

        {/* 9. Upload Image */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          title="Upload Image / Media"
        >
          <ImageIcon className="w-5 h-5" />
        </button>

        <div className="w-6 h-px bg-slate-200/80 dark:bg-slate-800 my-0.5" />

        {/* 10. Canvas Background & Grid Settings */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setActiveFlyout(activeFlyout === 'bg' ? null : 'bg')}
            className={`p-2.5 rounded-xl transition-all ${
              activeFlyout === 'bg'
                ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Canvas Background & Grid"
          >
            <Palette className="w-5 h-5" />
          </button>

          {/* Flyout: Canvas Background & Grid */}
          {activeFlyout === 'bg' && (
            <div className="absolute left-full ml-3 bottom-0 w-52 p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-100 z-50">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Canvas Background
              </div>
              <div className="grid grid-cols-4 gap-2">
                {CANVAS_BACKGROUNDS.map((bg) => (
                  <button
                    key={bg.id}
                    onClick={() => {
                      onSelectBgColor?.(bg.id === 'auto' ? '' : bg.id);
                      setActiveFlyout(null);
                    }}
                    className={`w-8 h-8 rounded-xl border shadow-sm flex items-center justify-center transition-transform hover:scale-110 active:scale-95 ${bg.border} ${
                      (customBgColor === bg.id || (!customBgColor && bg.id === 'auto')) ? 'ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-slate-900' : ''
                    }`}
                    style={bg.id !== 'auto' ? { backgroundColor: bg.color } : {}}
                    title={bg.label}
                  >
                    {(customBgColor === bg.id || (!customBgColor && bg.id === 'auto')) && (
                      <Check className={`w-3.5 h-3.5 ${bg.id === '#ffffff' || bg.id === '#f8fafc' || bg.id === '#faf8f5' ? 'text-slate-800' : 'text-white'}`} />
                    )}
                  </button>
                ))}
              </div>

              <div className="h-px bg-slate-100 dark:bg-slate-800 my-0.5" />

              <button
                onClick={handleToggleGrid}
                className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Grid2X2 className="w-4 h-4 text-slate-400" />
                  <span>Grid Lines</span>
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${isGridOn ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                  {isGridOn ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* 11. More Actions Flyout (...) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setActiveFlyout(activeFlyout === 'more' ? null : 'more')}
            className={`p-2.5 rounded-xl transition-all ${
              activeFlyout === 'more'
                ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="More Options"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>

          {/* Flyout: More Actions */}
          {activeFlyout === 'more' && (
            <div className="absolute left-full ml-3 bottom-0 w-48 p-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-100 z-50">
              <button
                onClick={() => {
                  editor.undo();
                  setActiveFlyout(null);
                }}
                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <RotateCcw className="w-4 h-4 text-slate-400" />
                <span>Undo (Ctrl+Z)</span>
              </button>
              <button
                onClick={() => {
                  editor.redo();
                  setActiveFlyout(null);
                }}
                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <RotateCw className="w-4 h-4 text-slate-400" />
                <span>Redo (Ctrl+Y)</span>
              </button>
              <button
                onClick={() => {
                  editor.zoomToFit();
                  setActiveFlyout(null);
                }}
                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Maximize className="w-4 h-4 text-slate-400" />
                <span>Zoom to Fit (Shift+1)</span>
              </button>
              <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
              <button
                onClick={() => {
                  editor.selectAll();
                  editor.deleteShapes(editor.getSelectedShapeIds());
                  setActiveFlyout(null);
                }}
                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              >
                <Trash2 className="w-4 h-4 text-rose-500" />
                <span>Clear All Canvas</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
