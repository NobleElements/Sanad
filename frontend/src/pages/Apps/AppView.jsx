import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Monitor } from 'lucide-react';
import { API_URL } from '../../config';
import usePageTitle from '../../hooks/usePageTitle';

export default function AppView({ standalone = false }) {
  const { appId } = useParams();
  const navigate = useNavigate();
  const [app, setApp] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  usePageTitle(app ? app.name : 'Loading App...');

  useEffect(() => {
    const fetchApp = async () => {
      try {
        const res = await fetch(`${API_URL}/apps/${appId}`);
        if (res.ok) {
          const data = await res.json();
          setApp(data);
        } else {
          // Handle 404 or other errors
          setApp(null);
        }
      } catch (err) {
        console.error('Failed to load custom app', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (appId) {
      fetchApp();
    }
  }, [appId]);

  if (isLoading) {
    return (
      <div className="flex-1 h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="flex-1 h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 p-4 text-center">
        <Monitor className="w-12 h-12 text-slate-400 mb-4" />
        <h2 className="text-2xl font-bold mb-2">App Not Found</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6">The requested application could not be found or you don't have access to it.</p>
        <button 
          onClick={() => navigate('/apps')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Back to Apps
        </button>
      </div>
    );
  }

  if (standalone) {
    // Standalone mode renders ONLY the iframe, taking up the entire viewport
    return (
      <iframe
        srcDoc={app.htmlContent}
        title={app.name}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        className="w-screen h-screen border-none block m-0 p-0 bg-white"
      />
    );
  }

  // Integrated mode renders within the Sanad layout wrapper, but iframe takes full height
  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-hidden relative">
      <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 z-10 flex-none shrink-0 shadow-sm">
        <button 
          onClick={() => navigate('/apps')}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700 transition-colors"
          title="Back to Apps"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-slate-800 dark:text-slate-200 truncate">{app.name}</h1>
      </div>
      <div className="flex-1 w-full bg-white relative">
        <iframe
          srcDoc={app.htmlContent}
          title={app.name}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          className="absolute inset-0 w-full h-full border-none"
        />
      </div>
    </div>
  );
}
