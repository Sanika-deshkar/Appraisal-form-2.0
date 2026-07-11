# Services

The `src/services` directory contains the core business logic and API interaction layer.

## API Service (`api.js`)

A centralized Axios wrapper for consistent API requests.

- **`apiClient`**: Configured with the `BASE_URL` and an interceptor to automatically attach the `Authorization: Bearer <token>` header from `sessionStorage`.
- **Error Normalization**: An interceptor converts backend error responses into a standardized format (`err.userMessage`, `err.statusCode`). It also automatically redirects to `/login` on `401 Unauthorized` responses.
- **Utility Functions**:
    - `api.get`, `api.post`, `api.put`, `api.delete`: Simplified methods returning response data directly.
    - `createFormData`: Helper for multipart/form-data requests (useful for file uploads).

## Appraisal Persistence (`appraisalPersistence.js`)

Handles saving and loading appraisal form data (snapshots).

- **`loadAppraisalSnapshot`**: Fetches the current draft for the logged-in user.
- **`saveAppraisalDraftSection`**: Saves a specific section of the form as a draft.
- **`submitAppraisal`**: Submits the final appraisal and triggers the initial review workflow.
- **`fetchSavedAppraisal`**: Used by reviewers to load a faculty member's submitted appraisal. It includes "repair" logic to fix profile discrepancies for Deans.
- **Data Normalization**: Functions like `normalizeFetchedForm` map inconsistent backend field names (e.g., `teaching_process` vs `lectures`) to a stable frontend structure.

## Review Workflow (`reviewWorkflow.js`)

Manages the review process for authorities (HODs, Directors, etc.).

- **`fetchReviewQueueForRole`**: Loads a list of "subordinate" appraisals that the current reviewer is authorized to act upon.
- **`submitWorkflowReview`**: Handles the submission of a review (Approval or Rejection). It calculates the `next_reviewer` and the new `workflow_status`.
- **`saveReviewerDraft` / `loadReviewerDraft`**: Allows reviewers to save their remarks and scores as a draft before final submission.
- **`statusStageIndex`**: A complex helper that determines where in the review chain an appraisal currently sits.

## Auth Service (`authService.js`)

Manages user identity and account actions.

- **`login(email, password)`**: Authenticates the user and returns a token.
- **`getMe()`**: Fetches the current user's profile details.
- **`updateProfile(data)`**: Updates the user's personal information (e.g., school, designation).
- **`resetPassword(email)`**: Initiates the password recovery process.
