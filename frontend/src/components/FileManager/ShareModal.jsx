import React, { useState } from 'react';
import { X, Copy, Check, Globe } from 'lucide-react';
import useUIStore from '../../store/useUIStore';

const ShareModal = ({ item, onClose }) => {
  const [permission, setPermission] = useState(0); // 0 = View, 1 = Edit
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  const addToast = useUIStore(state => state.addToast);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const endpoint = item.type === 'folder' 
        ? `/api/share/folder/${item.id}` 
        : `/api/share/file/${item.id}`;
        
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permission })
      });
      if (!response.ok) throw new Error('Failed to generate share link');
      const data = await response.json();
      const link = `${window.location.origin}/share/${data.token}`;
      setShareLink(link);
    } catch (error) {
      console.error('Error generating share link', error);
      addToast('Failed to generate share link', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Globe size={20} className="text-blue-500" />
            Share {item.type === 'folder' ? 'Folder' : 'File'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-6">
          <div>
            <p className="text-sm font-medium mb-1">Sharing: <span className="font-semibold text-blue-600 dark:text-blue-400">{item.name}</span></p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Anyone with the link can access this item based on the permissions below.</p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Permissions</label>
            <select 
              value={permission} 
              onChange={e => setPermission(parseInt(e.target.value, 10))}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              disabled={!!shareLink}
            >
              <option value={0}>View Only (Can download)</option>
              <option value={1}>Can Edit (Can upload/delete)</option>
            </select>
          </div>

          {shareLink ? (
            <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2">
              <label className="text-sm font-medium text-green-600 dark:text-green-400">Link Generated!</label>
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  readOnly 
                  value={shareLink} 
                  className="flex-1 border border-gray-300 dark:border-gray-600 rounded-md p-2 bg-gray-50 dark:bg-gray-900 text-sm"
                />
                <button 
                  onClick={handleCopy}
                  className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm transition-colors"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          ) : (
            <button 
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md font-medium transition-colors disabled:opacity-50"
            >
              {isGenerating ? 'Generating...' : 'Create Share Link'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
