# Dashboards

Dashboards are role-specific pages that provide the primary interface for users. They are located in `src/pages/`.

## Dashboard Structure

Most dashboards follow a similar pattern:
1.  **Header**: App branding and user profile summary.
2.  **Stats/Summary Cards**: High-level overview of the appraisal status or review queue.
3.  **Action Area**:
    - For Faculty: The appraisal form itself (broken into sections).
    - For Reviewers: A list (queue) of subordinates awaiting review.
4.  **Workflow View**: The `WorkflowTimeline` or `ApprovalHistoryTable`.

## Key Dashboard Pages

### `Dashboard.jsx` (Faculty)
The main entry point for faculty members. It handles:
- Progress tracking across different form sections (Part A and Part B).
- Saving drafts and final submission.
- Displaying reviewer feedback upon rejection or completion.

### `RoleDashboard.jsx` (The Switch)
As documented in [Architecture](./2_Architecture.md), this is the router that lazily loads the correct dashboard based on the user's role.

### `HODDashboard.jsx` / `DeanDashboard.jsx` / `DirectorDashboard.jsx`
Reviewer-focused dashboards. Their main logic includes:
- Fetching the review queue via `fetchReviewQueueForRole`.
- Opening a subordinate's appraisal for scoring and remarks.
- Submitting the review, which advances the workflow to the next level.

### `VCDashboard.jsx`
The final level of review. It provides a university-wide view and the ability to finalize any appraisal.

VC teaching-appraisal cards show the submitted self score, prior reviewer totals, an `Average Score`, and the editable/final `VC Score`. The average is computed on the frontend from the available pre-VC totals only: self/faculty score plus the applicable prior reviewers in that appraisal chain, such as HOD or Center Head, Director, and Dean. Missing prior scores are ignored, while explicit zero scores are treated as valid submitted values.

When the VC opens a teaching appraisal form, the top review header repeats the same pre-VC score summary and formats those values to one decimal place for readability. The VC review form's `Personal Information` table hides `ExpDyp`, `ExpPrev`, and `ExpTotal`; the underlying profile/form data is not changed.

### `NonTeachingStaffDashboard.jsx`
A specialized dashboard for non-teaching staff, using a simplified workflow and a different form structure (Managed via `nonTeachingWorkflow.js`).

## Lazy Loading & Chunks

Dashboards are imported using `React.lazy()` to ensure that a faculty member doesn't download the code for the VC dashboard, and vice versa. This significantly improves initial load times.
