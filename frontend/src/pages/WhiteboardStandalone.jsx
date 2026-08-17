import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Presentation, Sparkles, Download } from 'lucide-react';
import useWhiteboardStore from '../store/useWhiteboardStore';
import useUIStore from '../store/useUIStore';
import usePageTitle from '../hooks/usePageTitle';
import WhiteboardCanvas from '../components/Whiteboard/WhiteboardCanvas';
import ResourceDrawer from '../components/Whiteboard/ResourceDrawer';
import WhiteboardPageSelector from '../components/Whiteboard/WhiteboardPageSelector';

export default function WhiteboardStandalone() {
  const { id } = useParams();
  const navigate = useNavigate();
  const addToast = useUIStore((state) => state.addToast);
  const isOffline = useUIStore((state) => state.isOffline);
  const { activeWhiteboard, fetchWhiteboardById } = useWhiteboardStore();
  const [isLoading, setIsLoading] = useState(!activeWhiteboard);
  const [isResourceDrawerOpen, setIsResourceDrawerOpen] = useState(false);
  const [editor, setEditor] = useState(null);
  const canvasRef = useRef(null);

  usePageTitle(activeWhiteboard ? `${activeWhiteboard.icon} ${activeWhiteboard.name}` : 'Whiteboard');

  useEffect(() => {
    let isMounted = true;
    if (id) {
      setIsLoading(true);
      fetchWhiteboardById(id).finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });
    } else {
      setIsLoading(false);
    }
    return () => {
      isMounted = false;
    };
  }, [id, fetchWhiteboardById]);

  const handleInsertResource = (type, data) => {
    if (canvasRef.current) {
      canvasRef.current.insertResource(type, data);
      addToast(`Added ${type === 'sanad-task' ? 'Task' : 'Note'} card to canvas`, 'success');
    }
  };

  if (isLoading || !activeWhiteboard || activeWhiteboard.documentJson === undefined) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!activeWhiteboard && !isLoading) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 p-4 text-center">
        <Presentation className="w-12 h-12 text-slate-400 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Whiteboard Not Found</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6">
          The requested whiteboard could not be found or you don't have access to it.
        </p>
        <button
          onClick={() => navigate('/whiteboard')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
        >
          Back to Whiteboards
        </button>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen fixed inset-0 overflow-hidden bg-slate-50 dark:bg-slate-900 z-50">
      {/* Floating Top Left Controls */}
      <div className="absolute top-3 left-3 z-30 flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-sm border border-slate-200/80 dark:border-slate-800">
          <button
            onClick={() => navigate(`/whiteboard/${activeWhiteboard.id}`)}
            className="p-1 -ml-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
            title="Back to Sanad"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-base leading-none">{activeWhiteboard.icon || '🎨'}</span>
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 max-w-[200px] truncate">
            {activeWhiteboard.name}
          </span>
        </div>

        {/* Floating Page Selector & Export */}
        {editor && (
          <div className="flex items-center gap-2">
            <WhiteboardPageSelector editor={editor} />
            <button
              onClick={() => canvasRef.current?.openExportModal?.()}
              title="Export Whiteboard (PDF, PNG, SVG)"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 dark:bg-slate-900/90 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 backdrop-blur-md shadow-sm border border-slate-200/80 dark:border-slate-800 text-xs font-semibold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          </div>
        )}
      </div>

      {/* Full-bleed Canvas */}
      {activeWhiteboard && (
        <>
          <WhiteboardCanvas 
            key={activeWhiteboard.id} 
            ref={canvasRef}
            whiteboard={activeWhiteboard} 
            readOnly={isOffline}
            className="w-full h-full"
            isResourceDrawerOpen={isResourceDrawerOpen}
            onToggleResourceDrawer={() => setIsResourceDrawerOpen(!isResourceDrawerOpen)}
            onEditorMount={setEditor}
          />

          {/* Sanad Resources Slide-out Drawer */}
          <ResourceDrawer
            isOpen={isResourceDrawerOpen}
            onClose={() => setIsResourceDrawerOpen(false)}
            onInsertResource={handleInsertResource}
          />
        </>
      )}
    </div>
  );
}
