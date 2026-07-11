# Authentication & Session Management

Authentication is a critical part of the Faculty Appraisal System, ensuring that users can only access data and actions appropriate to their role.

## Authentication Flow

1.  **Login**: Users provide their credentials in `pages/Login.jsx`.
2.  **API Request**: The `authService.login()` method sends a POST request to the backend.
3.  **Token Storage**: Upon success, the backend returns an `accessToken`. This token is stored in `sessionStorage`.
4.  **Profile Fetch**: The system immediately fetches the user's profile using `getMe()` to determine their role and other metadata.
5.  **Session Initialization**: `storeUserSession()` in `auth/session.js` normalizes the profile data and stores it in `sessionStorage` for quick access across the app.

## Key Files

### `src/services/authService.js`
- Contains methods for `login`, `signup`, `getMe`, `resetPassword`, and `updateProfile`.
- Acts as the primary interface for authentication-related API calls.

### `src/auth/session.js`
- **`normalizeRole(role)`**: Converts various backend role strings into a standard set of roles used by the frontend (e.g., "head of department" -> "hod").
- **`storeUserSession(data)`**: A centralized function to populate `sessionStorage` with user details (name, email, role, school, etc.).
- **`profileFromsessionStorage()`**: A helper to retrieve a structured profile object from session storage.

### `src/auth/ProtectedRoute.jsx`
- A wrapper component that checks for the existence of an `accessToken` in `sessionStorage`.
- If no token is found, it redirects the user to the `/login` page while preserving the intended destination.

## Security Practices

- **Bearer Token**: All authenticated API requests include the `Authorization: Bearer <token>` header, handled automatically by an Axios interceptor in `services/api.js`.
- **Session Expiry**: If the API returns a `401 Unauthorized` status, the Axios interceptor clears the `sessionStorage` and redirects the user to the login page.
- **Lazy Loading**: Admin and reviewer dashboards are only loaded when a user with the corresponding role logs in.
