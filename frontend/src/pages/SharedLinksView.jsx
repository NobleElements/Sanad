import React, { useEffect, useState } from 'react';
import { Globe, Trash2, Folder as FolderIcon, File as FileIcon, ExternalLink } from 'lucide-react';
import usePageTitle from '../hooks/usePageTitle';
import useUIStore from '../store/useUIStore';

const SharedLinksView = () => {
  usePageTitle('Shared Links');
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const addToast = useUIStore(state => state.addToast);

  useEffect(() => {
    loadLinks();
  }, []);

  const loadLinks = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/share');
      if (!res.ok) throw new Error('Failed to load shared links');
      const data = await res.json();
      setLinks(data);
    } catch (err) {
      addToast('Failed to load shared links', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (token) => {
    if (!window.confirm('Are you sure you want to revoke this link? Anyone with the link will lose access immediately.')) return;
    try {
      const res = await fetch(`/api/share/${token}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to revoke link');
      setLinks(prev => prev.filter(l => l.token !== token));
      addToast('Link revoked successfully', 'success');
    } catch (err) {
      addToast('Failed to revoke link', 'error');
    }
  };

  const updatePermission = async (token, newPermission) => {
    try {
      const res = await fetch(`/api/share/${token}`, { 
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permission: parseInt(newPermission) })
      });
      if (!res.ok) throw new Error('Failed to update permission');
      setLinks(prev => prev.map(l => l.token === token ? { ...l, permission: parseInt(newPermission) } : l));
      addToast('Permission updated successfully', 'success');
    } catch (err) {
      addToast('Failed to update permission', 'error');
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center text-gray-500">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="text-blue-500" />
            Shared Links
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage public links you've created for your files and folders.</p>
        </div>
      </div>

      {links.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Globe size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium mb-2">No Active Links</h3>
          <p className="text-gray-500 dark:text-gray-400">You haven't shared any files or folders yet. Use the Share button in the File Manager to create links.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-6 py-4 font-medium">Item</th>
                <th className="px-6 py-4 font-medium">Permission</th>
                <th className="px-6 py-4 font-medium">Link</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {links.map(link => (
                <tr key={link.token} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${link.type === 'folder' ? 'bg-blue-50 text-blue-500 dark:bg-blue-900/30' : 'bg-gray-100 text-gray-500 dark:bg-gray-700'}`}>
                        {link.type === 'folder' ? <FolderIcon size={18} /> : <FileIcon size={18} />}
                      </div>
                      <span className="font-medium max-w-[200px] truncate" title={link.name}>{link.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select 
                      value={link.permission}
                      onChange={(e) => updatePermission(link.token, e.target.value)}
                      className={`text-xs font-medium rounded-full px-2.5 py-1 border-0 cursor-pointer focus:ring-2 focus:ring-blue-500 outline-none ${
                        link.permission === 1 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <option value={0} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">View Only</option>
                      <option value={1} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Edit</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <a 
                      href={`/share/${link.token}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 hover:underline"
                    >
                      /share/{link.token.substring(0, 8)}...
                      <ExternalLink size={14} />
                    </a>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleRevoke(link.token)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors flex items-center gap-2 ml-auto text-xs font-medium border border-transparent hover:border-red-200 dark:hover:border-red-800"
                    >
                      <Trash2 size={16} />
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SharedLinksView;
