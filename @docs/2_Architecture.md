# Architecture & Routing

The application follows a modular architecture with a clear separation of concerns between UI components, business logic (services), and utility functions.

## Folder Structure

```text
src/
├── auth/          # Auth logic & ProtectedRoute
├── components/    # Reusable UI elements (Inputs, Tables, Cards)
├── constants/     # Configuration & static data (University hierarchy)
├── context/       # AuthContext for global user state
├── pages/         # Main application screens & Role-based dashboards
├── services/      # API communication & workflow logic
└── utils/         # Helper functions (Validation, Hierarchy logic)
```

## Routing Strategy

The application uses `react-router-dom` (v7) for navigation.

### Main Entry Point (`App.jsx`)

- Handles global event listeners (e.g., preventing wheel change on number inputs).
- Sets up the `BrowserRouter` and `Suspense` for lazy loading.
- Defines high-level routes: `/login`, `/signup`, `/profile`, `/dashboard`.

### Role-Based Routing (`RoleDashboard.jsx`)

The `/dashboard` route is handled by `RoleDashboard.jsx`, which acts as a dynamic switch. It determines the user's role and school from session storage and lazily loads the appropriate dashboard.

**Benefits of Lazy Loading:**
- **Performance**: Only the code required for the current user's role is downloaded.
- **Security**: Reduces the footprint of administrative dashboards for regular users.

### Protected Routes

Routes like `/profile`, `/edit-profile`, and `/dashboard` are wrapped in a `ProtectedRoute` component. This component checks for an active session (access token) and redirects to `/login` if none is found.

## Data Flow

1.  **Authentication**: User logs in via `Login.jsx` calling `authService.js`.
2.  **Session Storage**: Successful login stores the access token and user profile in `sessionStorage`.
3.  **Profile Initialization**: `App.jsx` uses `ProfileLoader` to fetch the latest profile from `/get-me` and update the session.
4.  **Dashboard Selection**: `RoleDashboard` renders the specific dashboard for the user.
5.  **API Interaction**: Dashboards and components use `api.js` (Axios wrapper) to fetch and submit data.
