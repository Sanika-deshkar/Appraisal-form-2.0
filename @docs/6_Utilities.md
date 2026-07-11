# Utilities

The `src/utils` directory contains pure helper functions that perform data manipulation, validation, and domain-specific logic.

## Appraisal Form Utilities (`appraisalFormUtils.js`)

This is the largest utility file, containing logic for calculating scores and validating form sections.

- **Scoring Logic**:
    - `clampScore(value, max)`: Ensures a score stays within [0, max].
    - `sumSectionScore()`: Totals up scores for a specific section.
    - `innovativeTeachingScore()`: Calculates scores for the innovative teaching section based on selected methods.
- **Validation**:
    - `validateCompleteRows()`: Iterates through form sections to ensure all required fields are filled and attachments are provided where necessary.
- **Attachment Helpers**:
    - `isAllowedAttachmentFile()`: Validates file types (PDF/Images) and size (max 10MB).
    - `docsForRow()`: Retrieves attachments associated with a specific row in a form section.

## Workflow Utilities (`workflow.js`)

Focuses on normalizing and displaying the new "Dynamic Workflow" data.

- **`normalizeWorkflowStatus()`**: Standardizes status strings (e.g., "APPROVED", "PENDING").
- **`workflowStatusMeta()`**: Provides UI metadata (colors, labels, icons) for each status.
- **`normalizeApprovalWorkflow()`**: Converts a raw workflow object from the API into a structure suitable for the `WorkflowTimeline` component.

## Validation (`validation.js`)

General-purpose input validation.

- **`isValidEmail(email)`**: RegEx-based email validation.
- **`passwordRequirements(password)`**: Checks for length, uppercase, lowercase, and numbers.
- **`filterNumeric(value)`**: A utility for `onChange` handlers to prevent non-numeric input.

## Hierarchy (`hierarchy.js`)

(Already covered in [Workflow & Hierarchy](./4_Workflow_and_Hierarchy.md))

Contains critical logic for defining university structure and reviewer permissions.

## Review Summary Totals (`reviewSummaryTotals.js`)

Calculates aggregated scores for Part A, Part B, and Grand Totals, handling both self-submitted and reviewer-assigned scores.
