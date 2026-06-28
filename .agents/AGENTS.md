# Sanad Workspace Rules

## Frontend Conventions

### API Requests
- Do NOT assume a centralized API utility file like `api.js` or `utils/api.js` exists.
- Perform HTTP requests using the native `fetch` API directly.
- Standard API routes are prefixed with `/api/` (e.g., `/api/files`, `/api/folders`).

### Notifications / Toasts
- Do NOT assume `notificationStore` or `useNotificationStore` exists.
- Use `useUIStore` from `src/store/useUIStore.js` to manage notifications/toasts.
- Hook usage example:
  ```javascript
  import useUIStore from '../../store/useUIStore';
  const addToast = useUIStore(state => state.addToast);
  addToast('Message content', 'success' | 'error' | 'info');
  ```
