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

### Landing Page Layout
- When adding or removing "Showcase" feature sections on the landing page (`LandingPage.jsx`), always maintain the alternating layout pattern (`flex-col lg:flex-row` followed by `flex-col lg:flex-row-reverse`). Ensure that the classes of subsequent sections are updated accordingly so the visual rhythm is preserved.

### Browser Popups & Modals
- Do NOT use native browser popups like `window.prompt`, `window.alert`, or `window.confirm` for user interactions.
- For confirmations, use the global store: `useConfirmStore.getState().showConfirm({...})`.
- For simple text input prompts, use the `PromptModal` component (`components/common/PromptModal.jsx`).
- When auditing or removing existing native browser APIs, ALWAYS search the codebase for both the prefixed version (e.g., `window.confirm`) and the unprefixed version (e.g., `confirm(` or `confirm `).

### Background Timers & Polling
- **Throttling Awareness**: When using `setInterval` or `setTimeout` for time-sensitive background tasks (like notifications), do NOT rely on tight time windows (e.g., `< 60s`). Modern browsers aggressively throttle background tabs (running them every 1-5 minutes). Use a wide execution window (e.g., 5-10 minutes) and rely on an in-memory `Set` of processed IDs to guarantee a task fires exactly once.
- **Robust Deduplication**: When deduplicating time-sensitive events by ID, always include the target timestamp in the unique identifier (e.g., `${event.id}_${targetTime.getTime()}`). This ensures that if a user edits an event to trigger at a new time, it correctly fires again rather than being incorrectly skipped as "already processed".

### Web Notifications API
- **Stateful Permissions**: When requesting `Notification.requestPermission()` in a React component, always store the returned permission in a React state variable (e.g., `const [permission, setPermission] = useState(...)`). Relying solely on the global `Notification.permission` inside a `useEffect` closure will prevent the component from re-rendering and activating its logic immediately after the user clicks "Allow" on the initial prompt.

### Calendar UI
- **Responsive View Toggles**: Use a `<select>` dropdown menu for view toggles on mobile, and an inline button group on desktop.
- **Tasks Sidebar**: Ensure the Tasks sidebar is hidden on mobile screens but visible on desktop.
- **Sidebar State Persistence**: Always persist the open/closed state of both the left and right sidebars to `localStorage` so they are preserved on reload.
- **Views**: The default calendar view is `week`. Do not implement or suggest an `agenda` view.

### Frontend Architecture & Libraries
- **State Management**: Use `Zustand` for global state. Store files must be named `use<Domain>Store.js` (e.g., `useTaskStore.js`) and placed in the `frontend/src/store/` directory.
- **Styling**: Use TailwindCSS for all styling. Do not introduce heavy component libraries (like Material-UI, Chakra, or Ant Design).
- **Icons**: Always use `lucide-react` for icons.
- **Routing**: Use `react-router-dom` for client-side routing.
- **Component Organization**: Place reusable, domain-agnostic components in `frontend/src/components/common/`. Page-level components should reside directly in `frontend/src/pages/`.
- **Rich Text Editing**: Use TipTap (`@tiptap/react`) for any rich text or markdown editing features.

### Rich Text Editing (TipTap) & Autosave
- **Initialization Shielding**: TipTap extensions (like TaskLists) often perform invisible DOM fixups upon initialization that trigger `onUpdate`/`onChange` events. If a component has auto-save functionality, these events will falsely trigger an immediate auto-save upon loading a document, corrupting the "last updated" timestamp.
- **Solution**: 
  1. Always use an `isInitializingRef` guard (with a ~500ms timeout) wrapping the initial data population logic (e.g. inside the `fetch` resolution). 
  2. Inside your `onChange` handler, use `if (isInitializingRef.current) return;` to safely ignore these programmatic events.
  3. When programmatically setting content using TipTap's API, explicitly pass `false` for `emitUpdate` (e.g., `editor.commands.setContent(content, false)`).

## Backend Conventions

### Architecture & Patterns
- **API Framework**: Use ASP.NET Core Minimal APIs. Do NOT create traditional MVC `Controller` classes.
- **Endpoint Organization**: Group endpoints using extension methods on `IEndpointRouteBuilder` (e.g., `public static void MapTaskEndpoints(this IEndpointRouteBuilder endpoints)`) and place them in the `src/Sanad.Api/Endpoints/` directory.
- **Database Contexts**: The application uses Entity Framework Core with a multi-tenant design. Never mix them:
  - `AdminDbContext`: For global/admin state (e.g., Users, Subscriptions).
  - `SanadDbContext`: For tenant-specific data (uses a separate SQLite database per user).
- **Dependency Injection**: Register business logic services in `Program.cs` (e.g., `builder.Services.AddScoped<MyService>()`) and place the implementations in the `src/Sanad.Api/Services/` directory.
