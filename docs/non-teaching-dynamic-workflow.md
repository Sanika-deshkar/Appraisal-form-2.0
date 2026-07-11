# Non-Teaching Dynamic Workflow Frontend

This document explains the frontend-only dynamic workflow refactor for the Non-Teaching appraisal module.

## Goal

The Non-Teaching frontend no longer renders approval progress from fixed labels such as `Registrar` or a fixed number of levels. The UI consumes workflow data from the API when available and renders approval levels by designation.

Example API shape:

```json
{
  "workflowId": 1,
  "workflowName": "Non Teaching Flow",
  "currentStep": 2,
  "status": "PENDING",
  "steps": [
    { "stepNo": 1, "designation": "Reporting Officer", "status": "APPROVED" },
    { "stepNo": 2, "designation": "Data Analyst", "status": "PENDING" },
    { "stepNo": 3, "designation": "VC", "status": "WAITING" }
  ]
}
```

## Folder Structure

```text
src/
|-- components/
|   `-- workflow/
|       |-- ApprovalHistoryTable.jsx
|       |-- ApprovalStepCard.jsx
|       |-- CurrentApproverCard.jsx
|       |-- WorkflowStatusBadge.jsx
|       `-- WorkflowTimeline.jsx
|-- pages/
|   `-- NonTeachingStaffDashboard.jsx
|-- services/
|   `-- nonTeachingWorkflow.js
`-- utils/
    `-- workflow.js
```

## Components

### WorkflowTimeline

Renders all workflow levels using `workflow.steps.map(...)`. It supports any number of approval levels and highlights the current pending step.

### ApprovalStepCard

Displays one approval level with designation, status, and progress icon.

### WorkflowStatusBadge

Normalizes and displays workflow statuses such as approved, pending, waiting, rejected, skipped, and completed.

### ApprovalHistoryTable

Renders workflow history rows using the API workflow steps. It safely handles missing remarks and timestamps.

### CurrentApproverCard

Displays the current pending approver designation. If all approval steps are completed, it displays a completion message.

## State Flow

1. Non-teaching appraisal or review queue data is loaded from existing APIs.
2. `nonTeachingWorkflowFor(...)` extracts workflow data from the response.
3. If the backend provides `workflow.steps`, those steps are used directly.
4. If workflow data is missing, a compatibility fallback is generated from the existing frontend status and role fields.
5. UI components receive the normalized workflow object and render dynamically.

## API Integration

The frontend looks for workflow data in common response locations:

```js
item.workflow
item.workflowData
item.approvalWorkflow
item.payload.workflow
item.form.workflow
```

The preferred shape is:

```js
{
  workflowId,
  workflowName,
  currentStep,
  status,
  steps: [
    {
      stepNo,
      designation,
      status,
      remarks,
      reviewedAt
    }
  ]
}
```

Only `designation` and `status` are required for display. Missing designations are safely shown as `Level N`.

## Dynamic Rendering

The workflow UI never assumes the number of approval levels. It renders:

```js
workflow.steps.map((step) => <ApprovalStepCard step={step} />)
```

This supports:

```text
Staff -> Data Analyst -> VC
Staff -> Placement Officer -> VC
Staff -> Reporting Officer -> Exam Coordinator -> VC
```

without frontend code changes, as long as the API sends the updated `steps` array.

## Existing Compatibility

The legacy review data model still contains fixed scoring fields for existing authorities:

```text
roMarks
regMarks
vcMarks
```

To avoid backend changes, the frontend keeps those fields intact. Dynamic designations from the workflow are used as display labels for the existing review columns and reports.

## Adding New Workflow Types

No frontend change is required for new display-only workflow types if the backend sends:

- `workflowName`
- `currentStep`
- `steps`
- each step's `designation`
- each step's `status`

For future backend support of fully independent scoring per arbitrary approver level, introduce a backend-provided per-step score payload and bind review tables by `stepNo` or `workflowStepId` instead of legacy `ro/reg/vc` fields.

## Responsive Design

Workflow cards use responsive CSS grid:

```js
gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))"
```

Tables remain horizontally scrollable on small screens, matching the existing dashboard layout.

## Reuse

The workflow components are intentionally generic. They can be reused in other modules by passing a normalized workflow object:

```js
<CurrentApproverCard workflow={workflow} />
<WorkflowTimeline workflow={workflow} />
<ApprovalHistoryTable workflow={workflow} />
```

## Scalability Notes

- Keep designations API-driven.
- Keep status normalization in `src/utils/workflow.js`.
- Keep workflow display components presentation-only.
- Keep backend API contracts separate from UI components through service adapters.
- When backend supports unlimited scoring levels, replace legacy review fields with step-based score collections.
