import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppWindow, Plus, Trash2, Edit, ExternalLink, Settings, LayoutDashboard, Monitor } from 'lucide-react';
import useAppStore from '../../store/useAppStore';
import useUIStore from '../../store/useUIStore';
import useConfirmStore from '../../store/useConfirmStore';
import usePageTitle from '../../hooks/usePageTitle';

export default function AppsManager() {
  usePageTitle('Custom Apps');
  const { apps, isLoading, fetchApps, createApp, updateApp, deleteApp } = useAppStore();
  const isOffline = useUIStore(state => state.isOffline);
  const addToast = useUIStore(state => state.addToast);
  const { showConfirm } = useConfirmStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    icon: 'AppWindow',
    htmlContent: '',
    showInDashboard: true,
    isStandalone: false
  });

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  const handleOpenModal = (app = null) => {
    if (app) {
      setEditingApp(app);
      setFormData({
        name: app.name,
        icon: app.icon,
        htmlContent: app.htmlContent,
        showInDashboard: app.showInDashboard,
        isStandalone: app.isStandalone
      });
    } else {
      setEditingApp(null);
      setFormData({
        name: '',
        icon: 'AppWindow',
        htmlContent: '<!DOCTYPE html>\n<html>\n<head>\n<style>\n  body { font-family: sans-serif; padding: 20px; }\n</style>\n</head>\n<body>\n  <h1>Hello App</h1>\n  <p>Write your HTML/JS here.</p>\n</body>\n</html>',
        showInDashboard: true,
        isStandalone: false
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingApp(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isOffline) return;

    if (editingApp) {
      const updated = await updateApp(editingApp.id, formData);
      if (updated) {
        addToast('App updated successfully', 'success');
        handleCloseModal();
      } else {
        addToast('Failed to update app', 'error');
      }
    } else {
      const created = await createApp(formData);
      if (created) {
        addToast('App created successfully', 'success');
        handleCloseModal();
      } else {
        addToast('Failed to create app', 'error');
      }
    }
  };

  const handleDelete = (id) => {
    showConfirm({
      title: 'Delete App',
      message: 'Are you sure you want to delete this app?',
      onConfirm: async () => {
        const success = await deleteApp(id);
        if (success) {
          addToast('App deleted successfully', 'success');
        } else {
          addToast('Failed to delete app', 'error');
        }
      }
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-hidden">
      <div className="flex-none p-4 md:p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <AppWindow className="w-6 h-6 text-pink-500" /> Custom Apps
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Create and manage your private HTML applications</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          disabled={isOffline}
          title={isOffline ? "Not available offline" : "Create App"}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Create App</span>
        </button>
      </div>

      <div className="flex-1 p-4 md:p-6 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : apps.length === 0 ? (
          <div className="text-center py-20">
            <div className="bg-slate-100 dark:bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <AppWindow className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-1">No custom apps yet</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6">Create your first HTML application</p>
            <button
              onClick={() => handleOpenModal()}
              disabled={isOffline}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" /> Create App
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {apps.map(app => (
              <div key={app.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col group">
                <div className="p-5 flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 rounded-xl">
                      <AppWindow className="w-6 h-6" />
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenModal(app)}
                        disabled={isOffline}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded disabled:opacity-50"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(app.id)}
                        disabled={isOffline}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100 mb-2 truncate">{app.name}</h3>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {app.showInDashboard && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs rounded-md">
                        <LayoutDashboard className="w-3 h-3" /> Dashboard
                      </span>
                    )}
                    {app.isStandalone ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs rounded-md">
                        <Monitor className="w-3 h-3" /> Standalone
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs rounded-md">
                        <LayoutDashboard className="w-3 h-3" /> Integrated
                      </span>
                    )}
                  </div>
                </div>
                <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <Link 
                    to={app.isStandalone ? `/app-standalone/${app.id}` : `/apps/${app.id}`}
                    target={app.isStandalone ? "_blank" : undefined}
                    className="flex items-center justify-center gap-2 w-full py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                  >
                    Launch App <ExternalLink className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Editor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {editingApp ? 'Edit App' : 'Create New App'}
              </h2>
              <button onClick={handleCloseModal} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-2xl leading-none">&times;</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              <form id="appForm" onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">App Name</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Icon (Text or Emoji)</label>
                    <input
                      type="text"
                      value={formData.icon}
                      onChange={(e) => setFormData({...formData, icon: e.target.value})}
                      className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.showInDashboard}
                      onChange={(e) => setFormData({...formData, showInDashboard: e.target.checked})}
                      className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-700"
                    />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Show shortcut in Dashboard</span>
                  </label>
                  
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isStandalone}
                      onChange={(e) => setFormData({...formData, isStandalone: e.target.checked})}
                      className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-700"
                    />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Standalone Mode (No UI wrappers)</span>
                  </label>
                </div>

                <div className="flex-1 flex flex-col h-[50vh]">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">HTML Content</label>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                    Write your complete HTML here. It will be rendered in an iframe. You can access the API token via `localStorage.getItem('Sanad.Auth')` if needed.
                  </p>
                  <textarea
                    required
                    value={formData.htmlContent}
                    onChange={(e) => setFormData({...formData, htmlContent: e.target.value})}
                    className="w-full flex-1 p-4 font-mono text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  ></textarea>
                </div>
              </form>
            </div>
            
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                form="appForm"
                type="submit"
                disabled={isOffline}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {editingApp ? 'Save Changes' : 'Create App'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
