import { useState, useEffect, useRef, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Tldraw, getSnapshot, createShapeId } from 'tldraw';
import 'tldraw/tldraw.css';
import './miroTheme.css';
import useWhiteboardStore from '../../store/useWhiteboardStore';
import useUIStore from '../../store/useUIStore';
import { Check, CloudOff, RefreshCw } from 'lucide-react';
import { TaskCardShapeUtil } from './TaskCardShapeUtil';
import { NoteCardShapeUtil } from './NoteCardShapeUtil';
import { CustomNoteShapeUtil } from './CustomNoteShapeUtil';
import MiroToolbar from './MiroToolbar';
import MiroSelectionToolbar from './MiroSelectionToolbar';
import MiroMinimap from './MiroMinimap';

const customShapeUtils = [TaskCardShapeUtil, NoteCardShapeUtil, CustomNoteShapeUtil];

// Disable all default tldraw chrome to achieve clean Miro UI
const tldrawComponents = {
  Toolbar: null,
  MainMenu: null,
  PageMenu: null,
  StylePanel: null,
  NavigationPanel: null,
  HelpMenu: null,
  QuickActions: null,
  ActionsMenu: null,
};

function stripHtml(html) {
  if (!html) return '';
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

function createResourceShape(editor, type, data, point) {
  if (!editor) return;

  if (type === 'sanad-task') {
    const shapeId = createShapeId();
    editor.createShape({
      id: shapeId,
      type: 'sanad-task',
      x: point.x,
      y: point.y,
      props: {
        w: 280,
        h: 125,
        taskId: data.id || '',
        title: data.title || 'Untitled Task',
        status: typeof data.status === 'number' ? data.status : 0,
        project: data.project || ''
      }
    });
    editor.select(shapeId);
  } else if (type === 'sanad-note') {
    const shapeId = createShapeId();
    editor.createShape({
      id: shapeId,
      type: 'sanad-note',
      x: point.x,
      y: point.y,
      props: {
        w: 300,
        h: 155,
        noteId: data.id || '',
        title: data.title || 'Untitled Note',
        snippet: stripHtml(data.content),
        notebookName: data.notebookName || 'Notebook'
      }
    });
    editor.select(shapeId);
  }
}

const WhiteboardCanvas = forwardRef(function WhiteboardCanvas(
  { whiteboard, readOnly = false, className = '', isResourceDrawerOpen, onToggleResourceDrawer, onEditorMount },
  ref
) {
  const isOffline = useUIStore((state) => state.isOffline);
  const saveWhiteboardState = useWhiteboardStore((state) => state.saveWhiteboardState);
  
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving' | 'unsaved' | 'error'
  const [editorInstance, setEditorInstance] = useState(null);
  const [isMinimapOpen, setIsMinimapOpen] = useState(whiteboard?.isMinimapOpen ?? true);
  const isMinimapOpenRef = useRef(whiteboard?.isMinimapOpen ?? true);
  isMinimapOpenRef.current = isMinimapOpen;

  const debounceTimerRef = useRef(null);
  const cameraDebounceTimerRef = useRef(null);
  const editorRef = useRef(null);
  const isInitialMountRef = useRef(true);
  const containerRef = useRef(null);
  const whiteboardIdRef = useRef(whiteboard?.id);
  whiteboardIdRef.current = whiteboard?.id;

  // Sync minimap state if whiteboard prop changes
  useEffect(() => {
    if (typeof whiteboard?.isMinimapOpen === 'boolean') {
      setIsMinimapOpen(whiteboard.isMinimapOpen);
      isMinimapOpenRef.current = whiteboard.isMinimapOpen;
    }
  }, [whiteboard?.id, whiteboard?.isMinimapOpen]);

  // Expose insertion method to parent
  useImperativeHandle(ref, () => ({
    insertResource: (type, data) => {
      if (!editorRef.current) return;
      const bounds = editorRef.current.getViewportPageBounds();
      const center = bounds ? bounds.center : { x: 200, y: 200 };
      createResourceShape(editorRef.current, type, data, {
        x: center.x - 140,
        y: center.y - 65
      });
    }
  }));

  // Parse initial snapshot ONLY when whiteboard ID changes
  const initialSnapshot = useMemo(() => {
    if (!whiteboard?.documentJson) return undefined;
    try {
      return JSON.parse(whiteboard.documentJson);
    } catch (e) {
      console.warn('Failed to parse whiteboard snapshot JSON', e);
      return undefined;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [whiteboard?.id]);

  // Clean up debounce timers on unmount or board change
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (cameraDebounceTimerRef.current) {
        clearTimeout(cameraDebounceTimerRef.current);
      }
    };
  }, [whiteboard?.id]);

  const handleMount = useCallback((editor) => {
    editorRef.current = editor;
    setEditorInstance(editor);
    onEditorMount?.(editor);
    isInitialMountRef.current = true;

    // Deselect any selected shapes so tldraw doesn't auto-scroll/snap to them
    editor.selectNone?.();

    // 1. Restore saved camera position & zoom level from database fields or snapshot
    let targetCamera = null;
    if (
      whiteboard &&
      typeof whiteboard.cameraX === 'number' &&
      typeof whiteboard.cameraY === 'number'
    ) {
      targetCamera = { 
        x: whiteboard.cameraX, 
        y: whiteboard.cameraY, 
        z: typeof whiteboard.cameraZ === 'number' ? whiteboard.cameraZ : 1 
      };
    } else if (initialSnapshot?.store) {
      // Fallback: extract camera from tldraw snapshot store records
      const camRecord = Object.values(initialSnapshot.store).find(
        (r) => r && r.typeName === 'camera'
      );
      if (camRecord && typeof camRecord.x === 'number' && typeof camRecord.y === 'number') {
        targetCamera = {
          x: camRecord.x,
          y: camRecord.y,
          z: typeof camRecord.z === 'number' ? camRecord.z : 1
        };
      }
    }

    if (targetCamera) {
      try {
        editor.setCamera(targetCamera, { force: true });
        
        requestAnimationFrame(() => {
          if (editorRef.current) {
            editorRef.current.setCamera(targetCamera, { force: true });
            editorRef.current.selectNone?.();
          }
        });

        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.setCamera(targetCamera, { force: true });
            editorRef.current.selectNone?.();
          }
        }, 150);
      } catch (err) {
        console.warn('Failed to restore camera position', err);
      }
    }

    // Persist camera view position & zoom level to database when camera moves (800ms debounce)
    const saveCameraState = () => {
      if (isInitialMountRef.current || readOnly || isOffline) return;

      if (cameraDebounceTimerRef.current) {
        clearTimeout(cameraDebounceTimerRef.current);
      }
      cameraDebounceTimerRef.current = setTimeout(() => {
        const activeId = whiteboardIdRef.current;
        if (!activeId || !editorRef.current || isInitialMountRef.current) return;
        try {
          const camera = editorRef.current.getCamera?.();
          if (camera && typeof camera.x === 'number' && typeof camera.y === 'number' && typeof camera.z === 'number') {
            saveWhiteboardState(activeId, {
              cameraX: camera.x,
              cameraY: camera.y,
              cameraZ: camera.z
            });
          }
        } catch (err) {
          console.warn('Failed to persist camera state', err);
        }
      }, 800);
    };

    // Unified store listener: Fast 400ms debounce for element edits, 800ms for camera
    const unlistenStore = editor.store.listen(
      (entry) => {
        if (isInitialMountRef.current || readOnly || isOffline) return;

        // Persist camera whenever viewport shifts
        saveCameraState();

        setSaveStatus('unsaved');

        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        // Fast 400ms debounce for shape edits & text changes
        debounceTimerRef.current = setTimeout(async () => {
          const activeId = whiteboardIdRef.current;
          if (!activeId) return;

          try {
            setSaveStatus('saving');
            const snapshot = getSnapshot(editor.store);
            const jsonString = JSON.stringify(snapshot);
            const camera = editor.getCamera?.();
            const success = await saveWhiteboardState(activeId, {
              documentJson: jsonString,
              cameraX: camera?.x,
              cameraY: camera?.y,
              cameraZ: camera?.z,
              isMinimapOpen: isMinimapOpenRef.current
            });
            if (success) {
              setSaveStatus('saved');
            } else {
              setSaveStatus('error');
            }
          } catch (err) {
            console.error('Error auto-saving whiteboard canvas:', err);
            setSaveStatus('error');
          }
        }, 400);
      },
      { scope: 'all' }
    );

    // Synchronous flush to localStorage if user leaves or refreshes the page
    const handleBeforeUnload = () => {
      const activeId = whiteboardIdRef.current;
      if (!activeId || !editorRef.current || isInitialMountRef.current) return;
      try {
        const snapshot = getSnapshot(editorRef.current.store);
        const jsonString = JSON.stringify(snapshot);
        const camera = editorRef.current.getCamera?.();
        saveWhiteboardState(activeId, {
          documentJson: jsonString,
          cameraX: camera?.x,
          cameraY: camera?.y,
          cameraZ: camera?.z,
          isMinimapOpen: isMinimapOpenRef.current
        });
      } catch (e) {
        console.warn('Failed to flush whiteboard state on unload', e);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // After slight delay, mark initialization complete
    const timeout = setTimeout(() => {
      isInitialMountRef.current = false;
    }, 600);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      unlistenStore();
      clearTimeout(timeout);
    };
  }, [whiteboard, initialSnapshot, saveWhiteboardState, readOnly, isOffline, onEditorMount]);

  const handleToggleMinimap = (nextOpen) => {
    setIsMinimapOpen(nextOpen);
    isMinimapOpenRef.current = nextOpen;
    const currentId = whiteboardIdRef.current;
    if (currentId && !readOnly && !isOffline) {
      saveWhiteboardState(currentId, { isMinimapOpen: nextOpen });
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const rawData = e.dataTransfer.getData('application/json');
    if (!rawData || !editorRef.current) return;

    try {
      const { type, data } = JSON.parse(rawData);
      // Convert mouse screen coordinates to canvas page coordinates
      const pagePoint = editorRef.current.screenToPage({
        x: e.clientX,
        y: e.clientY
      });

      createResourceShape(editorRef.current, type, data, {
        x: pagePoint.x - 140,
        y: pagePoint.y - 60
      });
    } catch (err) {
      console.warn('Failed to parse dropped resource', err);
    }
  };

  return (
    <div 
      ref={containerRef}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`miro-whiteboard relative w-full h-full overflow-hidden ${className}`}
    >
      {/* Floating Miro Left Vertical Toolbar, Contextual Style Bar & Minimap */}
      {!readOnly && editorInstance && (
        <>
          <MiroToolbar
            editor={editorInstance}
            onToggleResourceDrawer={onToggleResourceDrawer}
            isResourceDrawerOpen={isResourceDrawerOpen}
          />
          <MiroSelectionToolbar editor={editorInstance} />
          <MiroMinimap 
            editor={editorInstance} 
            isOpen={isMinimapOpen} 
            onToggle={handleToggleMinimap} 
          />
        </>
      )}

      {/* Floating Save Status Mini Indicator */}
      <div 
        className="absolute top-3 right-3 z-20 pointer-events-auto select-none"
        title={
          isOffline 
            ? 'Offline (Read Only)' 
            : saveStatus === 'saving' 
            ? 'Saving...' 
            : saveStatus === 'unsaved' 
            ? 'Unsaved changes' 
            : saveStatus === 'error' 
            ? 'Save failed' 
            : 'All changes saved'
        }
      >
        <div className="w-7 h-7 rounded-full bg-white/90 dark:bg-slate-850/90 backdrop-blur-md shadow-sm border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center transition-all">
          {isOffline ? (
            <CloudOff className="w-3.5 h-3.5 text-amber-500" />
          ) : saveStatus === 'saving' ? (
            <RefreshCw className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
          ) : saveStatus === 'unsaved' ? (
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          ) : saveStatus === 'error' ? (
            <div className="w-2 h-2 rounded-full bg-rose-500" />
          ) : (
            <Check className="w-3.5 h-3.5 text-emerald-500" />
          )}
        </div>
      </div>

      {/* Tldraw Canvas Component with Custom Shapes & Clean Miro Chrome */}
      <Tldraw
        key={whiteboard.id}
        snapshot={initialSnapshot}
        shapeUtils={customShapeUtils}
        components={tldrawComponents}
        onMount={handleMount}
        className="w-full h-full"
      />
    </div>
  );
});

export default WhiteboardCanvas;
