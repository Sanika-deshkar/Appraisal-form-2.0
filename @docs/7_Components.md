# Components

The application uses a component-based architecture for its UI. Components are generally stored in `src/components`, with workflow-specific components in a sub-folder.

## Reusable UI Components

### `Inputs.jsx`
A collection of standardized input components:
- `TextInput`: Basic text input with labels and error states.
- `NumberInput`: Numeric input with automatic filtering.
- `SelectInput`: Dropdown selection.
- `FileUpload`: A custom component for handling image and PDF uploads.

### `AppraisalHeaderImage.jsx`
Displays the university logo and system title consistently across dashboards.

### `ErrorBoundary.jsx`
A higher-order component that catches JavaScript errors in its child component tree and displays a fallback "Something went wrong" UI.

### `RejectionNotice.jsx`
Displays a prominent alert if an appraisal has been rejected, showing the reviewer's remarks and the reason for rejection.

## Workflow Components (`src/components/workflow/`)

These components are designed to work with the normalized workflow object.

### `WorkflowTimeline.jsx`
Renders a visual timeline of all approval steps, indicating completed, pending, and future levels.

### `ApprovalStepCard.jsx`
A small card showing the status of a specific step in the workflow (e.g., "HOD Reviewed").

### `ApprovalHistoryTable.jsx`
A detailed table showing the history of reviews, including reviewer designations, remarks, and timestamps.

### `WorkflowStatusBadge.jsx`
A color-coded pill showing the current high-level status of the appraisal.

### `CurrentApproverCard.jsx`
Highlights the person or role whose review is currently pending.
