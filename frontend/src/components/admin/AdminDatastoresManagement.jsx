import { useState } from 'react';
import useAdminStore from '../../store/useAdminStore';
import { formatBytes } from '../../utils/formatUtils';
import { Edit2, Trash2, CheckCircle, Save, X } from 'lucide-react';

export default function AdminDatastoresManagement({ queryParamsStr }) {
  const datastores = useAdminStore(state => state.datastores);
  const createDatastore = useAdminStore(state => state.createDatastore);
  const setDatastoreDefault = useAdminStore(state => state.setDatastoreDefault);
  const saveDatastoreEditAction = useAdminStore(state => state.saveDatastoreEdit);
  const deleteDatastore = useAdminStore(state => state.deleteDatastore);

  // Form state
  const [newDsName, setNewDsName] = useState('');
  const [newDsPath, setNewDsPath] = useState('');
  const [newDsDefault, setNewDsDefault] = useState(false);

  // Inline edit state
  const [editingDsId, setEditingDsId] = useState(null);
  const [editDsName, setEditDsName] = useState('');
  const [editDsPath, setEditDsPath] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newDsName || !newDsPath) return;
    const success = await createDatastore(newDsName, newDsPath, newDsDefault, queryParamsStr);
    if (success) {
      setNewDsName('');
      setNewDsPath('');
      setNewDsDefault(false);
    }
  };

  const startEdit = (ds) => {
    setEditingDsId(ds.id);
    setEditDsName(ds.name);
    setEditDsPath(ds.path);
  };

  const cancelEdit = () => {
    setEditingDsId(null);
    setEditDsName('');
    setEditDsPath('');
  };

  const saveEdit = async (id) => {
    const success = await saveDatastoreEditAction(id, editDsName, editDsPath, queryParamsStr);
    if (success) {
      cancelEdit();
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 mb-8 border border-slate-200 dark:border-slate-700 dark:text-slate-100">
      <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-6">Datastores Management</h2>
      
      <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-4 mb-6 items-end bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-100 dark:text-slate-100">
        <div className="flex-1 w-full">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name</label>
          <input 
            type="text" 
            required
            placeholder="e.g. HDD Array 1"
            value={newDsName}
            onChange={e => setNewDsName(e.target.value)}
            className="w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none dark:bg-slate-700 dark:text-slate-100"
          />
        </div>
        <div className="flex-1 w-full">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Absolute Path</label>
          <input 
            type="text" 
            required
            placeholder="e.g. /mnt/hdd1/sanad-data"
            value={newDsPath}
            onChange={e => setNewDsPath(e.target.value)}
            className="w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none dark:bg-slate-700 dark:text-slate-100"
          />
        </div>
        <div className="flex items-center h-10">
          <label className="flex items-center space-x-2 text-sm cursor-pointer">
            <input 
              type="checkbox" 
              checked={newDsDefault}
              onChange={e => setNewDsDefault(e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-600 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 dark:bg-slate-700"
            />
            <span className="font-medium text-slate-700 dark:text-slate-300">Set Default</span>
          </label>
        </div>
        <button type="submit" className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors shadow-sm text-sm font-medium h-10">
          Add Datastore
        </button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              <th className="p-3">Name</th>
              <th className="p-3">Path</th>
              <th className="p-3">Disk Usage</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {datastores.map(ds => (
              <tr key={ds.id} className="border-b border-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900">
                {editingDsId === ds.id ? (
                  <>
                    <td className="p-3">
                      <input 
                        type="text" 
                        value={editDsName} 
                        onChange={e => setEditDsName(e.target.value)}
                        className="w-full border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-indigo-500 outline-none dark:bg-slate-700 dark:text-slate-100"
                      />
                    </td>
                    <td className="p-3">
                      <input 
                        type="text" 
                        value={editDsPath} 
                        onChange={e => setEditDsPath(e.target.value)}
                        disabled={ds.usersCount > 0}
                        className={`w-full border rounded px-2 py-1 text-sm outline-none ${ds.usersCount > 0 ? 'bg-slate-100 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 dark:text-slate-500 cursor-not-allowed' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 focus:ring-1 focus:ring-indigo-500'}`}
                        title={ds.usersCount > 0 ? "Cannot edit path while users belong to this datastore" : ""}
                      />
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-400 dark:text-slate-500">
                      <span className="text-xs italic text-slate-400 dark:text-slate-500">Editing...</span>
                    </td>
                    <td className="p-3">
                      {ds.isDefault ? <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-semibold">Default</span> : null}
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button 
                        onClick={() => saveEdit(ds.id)}
                        title="Save Changes"
                        className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 p-1.5 border border-emerald-200 rounded hover:bg-emerald-50 dark:bg-emerald-500/10 transition-colors inline-flex"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={cancelEdit}
                        title="Cancel"
                        className="text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:text-slate-300 p-1.5 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900 transition-colors inline-flex"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="p-3 font-medium text-slate-800 dark:text-slate-200">{ds.name}</td>
                    <td className="p-3 text-slate-500 dark:text-slate-400 dark:text-slate-500 font-mono text-xs">{ds.path}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-400 dark:text-slate-500 w-48">
                      {ds.totalDiskSpace > 0 ? (
                        <div 
                          className="w-full bg-slate-200 rounded-full h-2.5 dark:bg-slate-700 overflow-hidden cursor-help flex items-center"
                          title={`${formatBytes(ds.totalDiskSpace - ds.freeDiskSpace)} / ${formatBytes(ds.totalDiskSpace)} (${formatBytes(ds.freeDiskSpace)} free)`}
                        >
                          <div 
                            className={`h-full rounded-full ${((ds.totalDiskSpace - ds.freeDiskSpace) / ds.totalDiskSpace) > 0.9 ? 'bg-red-500' : ((ds.totalDiskSpace - ds.freeDiskSpace) / ds.totalDiskSpace) > 0.75 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min(100, Math.max(0, ((ds.totalDiskSpace - ds.freeDiskSpace) / ds.totalDiskSpace) * 100))}%` }}
                          ></div>
                        </div>
                      ) : (
                        <span className="text-red-500 dark:text-red-400 text-xs">Path not accessible</span>
                      )}
                    </td>
                    <td className="p-3">
                      {ds.isDefault ? (
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-semibold">Default</span>
                      ) : null}
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button 
                        onClick={() => startEdit(ds)}
                        title="Edit Datastore"
                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 p-1.5 border border-indigo-200 rounded hover:bg-indigo-50 dark:bg-indigo-500/10 transition-colors inline-flex"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {!ds.isDefault && (
                        <button 
                          onClick={() => setDatastoreDefault(ds.id, queryParamsStr)}
                          title="Make Default"
                          className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 p-1.5 border border-emerald-200 rounded hover:bg-emerald-50 dark:bg-emerald-500/10 transition-colors inline-flex"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button 
                        onClick={() => deleteDatastore(ds.id, queryParamsStr)}
                        disabled={ds.isDefault || ds.usersCount > 0}
                        title={ds.isDefault ? "Cannot delete default datastore" : (ds.usersCount > 0 ? "Cannot delete datastore with assigned users" : "Delete Datastore")}
                        className="text-red-500 dark:text-red-400 hover:text-red-700 p-1.5 border border-red-200 rounded hover:bg-red-50 dark:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {datastores.length === 0 && (
              <tr>
                <td colSpan="5" className="p-6 text-center text-slate-500 dark:text-slate-400 dark:text-slate-500">No datastores defined.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
