import { create } from 'zustand';
import { API_URL } from '../config';
import useConfirmStore from './useConfirmStore';

const useAdminStore = create((set, get) => ({
  dashboardData: {
    users: [],
    totalCount: 0,
    totalDiskUsage: 0,
    monthlyRevenue: 0,
    usersByTier: {}
  },
  tiers: [],
  datastores: [],
  loading: true,
  error: null,
  
  fetchData: async (queryParamsStr) => {
    set({ loading: true, error: null });
    try {
      const [usersRes, tiersRes, dsRes] = await Promise.all([
        fetch(`${API_URL}/admin/users?${queryParamsStr || ''}`),
        fetch(`${API_URL}/storage/tiers`),
        fetch(`${API_URL}/admin/datastores`)
      ]);
      
      const usersData = await usersRes.json();
      const tiersData = await tiersRes.json();
      const dsData = await dsRes.json();
      
      set({
        dashboardData: usersData,
        tiers: tiersData,
        datastores: dsData,
        loading: false
      });
    } catch {
      set({ error: 'Failed to load admin data', loading: false });
    }
  },

  updateUser: async (id, updates, queryParamsStr) => {
    try {
      const res = await fetch(`${API_URL}/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        get().fetchData(queryParamsStr);
      }
    } catch (e) {
      console.error(e);
    }
  },

  deleteUser: async (id, queryParamsStr) => {
    useConfirmStore.getState().showConfirm({
      title: 'Delete User',
      message: 'Are you sure you want to delete this user and ALL their data?',
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_URL}/admin/users/${id}`, {
            method: 'DELETE'
          });
          if (res.ok) {
            get().fetchData(queryParamsStr);
          }
        } catch (e) {
          console.error(e);
        }
      }
    });
  },

  resetPassword: async (id) => {
    const newPassword = window.prompt("Enter new password for this user:");
    if (!newPassword) return;

    try {
      const res = await fetch(`${API_URL}/admin/users/${id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword })
      });
      if (res.ok) {
        alert("Password reset successfully.");
      } else {
        alert("Failed to reset password.");
      }
    } catch (e) {
      console.error(e);
      alert("Error resetting password.");
    }
  },

  recalculateStorage: async (username, queryParamsStr) => {
    try {
      const res = await fetch(`${API_URL}/admin/users/${username}/recalculate-storage`, {
        method: 'POST'
      });
      if (res.ok) {
        get().fetchData(queryParamsStr);
        alert(`Storage recalculated for ${username}.`);
      } else {
        alert("Failed to recalculate storage.");
      }
    } catch (e) {
      console.error(e);
      alert("Error recalculating storage.");
    }
  },

  recalculateAllStorage: async (queryParamsStr) => {
    useConfirmStore.getState().showConfirm({
      title: 'Recalculate All Storage',
      message: 'Are you sure you want to recalculate storage for all users? This might take a while.',
      confirmText: 'Recalculate',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_URL}/admin/recalculate-storage`, {
            method: 'POST'
          });
          if (res.ok) {
            get().fetchData(queryParamsStr);
            alert("Storage recalculated for all users.");
          } else {
            alert("Failed to recalculate storage for all users.");
          }
        } catch (e) {
          console.error(e);
          alert("Error recalculating storage.");
        }
      }
    });
  },

  migrateUser: async (userId, targetDsId, queryParamsStr) => {
    if (!targetDsId) return;
    useConfirmStore.getState().showConfirm({
      title: 'Migrate User',
      message: 'Are you sure you want to migrate this user to a new datastore? They won\'t be able to log in during the process.',
      confirmText: 'Migrate',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_URL}/admin/users/${userId}/migrate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetDatastoreId: parseInt(targetDsId) })
          });
          if (res.ok) {
            alert("Migration started successfully. It will run in the background.");
            get().fetchData(queryParamsStr);
          } else {
            const error = await res.text();
            alert("Migration failed: " + error);
          }
        } catch (e) {
          console.error(e);
          alert("Error triggering migration.");
        }
      }
    });
  },

  createDatastore: async (newDsName, newDsPath, newDsDefault, queryParamsStr) => {
    try {
      const res = await fetch(`${API_URL}/admin/datastores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newDsName, path: newDsPath, isDefault: newDsDefault })
      });
      if (res.ok) {
        get().fetchData(queryParamsStr);
        return true;
      } else {
        const error = await res.text();
        alert("Failed to create datastore: " + error);
        return false;
      }
    } catch (e) {
      console.error(e);
      return false;
    }
  },

  setDatastoreDefault: async (id, queryParamsStr) => {
    try {
      const res = await fetch(`${API_URL}/admin/datastores/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true })
      });
      if (res.ok) get().fetchData(queryParamsStr);
    } catch (e) { console.error(e); }
  },

  saveDatastoreEdit: async (id, editDsName, editDsPath, queryParamsStr) => {
    try {
      const res = await fetch(`${API_URL}/admin/datastores/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editDsName, path: editDsPath })
      });
      if (res.ok) {
        get().fetchData(queryParamsStr);
        return true;
      } else {
        const error = await res.text();
        alert("Failed to update datastore: " + error);
        return false;
      }
    } catch (e) { 
      console.error(e);
      return false;
    }
  },

  deleteDatastore: async (id, queryParamsStr) => {
    useConfirmStore.getState().showConfirm({
      title: 'Delete Datastore',
      message: 'Are you sure you want to delete this datastore? Make sure no users are left on it.',
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_URL}/admin/datastores/${id}`, { method: 'DELETE' });
          if (res.ok) get().fetchData(queryParamsStr);
          else {
            const error = await res.text();
            alert(error);
          }
        } catch (e) { console.error(e); }
      }
    });
  },

  cancelSubscription: async (userId, queryParamsStr) => {
    useConfirmStore.getState().showConfirm({
      title: 'Cancel Subscription',
      message: 'Are you sure you want to cancel this subscription? The user will be downgraded to the Free tier.',
      confirmText: 'Cancel Subscription',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_URL}/admin/users/${userId}/subscription/cancel`, {
            method: 'POST'
          });
          if (res.ok) {
            alert("Subscription canceled successfully.");
            get().fetchData(queryParamsStr);
          } else {
            const err = await res.text();
            alert(`Failed to cancel subscription: ${err}`);
          }
        } catch (e) {
          console.error(e);
          alert("Network error.");
        }
      }
    });
  },

  refundSubscription: async (userId, queryParamsStr) => {
    const amountStr = window.prompt("Enter amount to refund (e.g., 5.00):");
    if (!amountStr) return;
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) return alert("Invalid amount.");

    useConfirmStore.getState().showConfirm({
      title: 'Issue Refund',
      message: `Are you sure you want to issue a refund of $${amount}?`,
      confirmText: 'Refund',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_URL}/admin/users/${userId}/subscription/refund`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount })
          });
          if (res.ok) {
            alert("Refund issued successfully.");
            get().fetchData(queryParamsStr);
          } else {
            const err = await res.text();
            alert(`Failed to issue refund: ${err}`);
          }
        } catch (e) {
          console.error(e);
          alert("Network error.");
        }
      }
    });
  }
}));

export default useAdminStore;
