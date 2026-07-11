# Workflow & Hierarchy

The application implements a complex, multi-level review hierarchy that varies depending on the user's school and role.

## Review Chains

The review chain determines the sequence of approvals required for an appraisal. This logic is primarily managed in `src/utils/hierarchy.js`.

### Typical Faculty Chain
`Faculty -> HOD (if applicable) -> Director -> Dean -> VC`

### CISR (Center for Interdisciplinary Studies and Research) Chain
`Faculty -> Center Head -> VC`

### Non-Teaching Staff Chain
`Staff -> Reporting Officer (optional) -> Registrar -> VC`

## Hierarchy Logic (`src/utils/hierarchy.js`)

This utility file contains the core business rules for the university structure:

- **`getReviewChain(profile)`**: Returns an array of roles that must review the given profile in order.
- **`departmentHasHod(school, department)`**: Determines if a specific department within a school has an HOD layer (currently primarily used for SoEMR).
- **`getDeanTrack(profile)`**: Identifies which Dean is responsible for a user based on their school and department (e.g., Engineering Dean vs. Non-Engineering Dean).
- **`canAuthorityReviewProfile(reviewer, subject)`**: A critical function that determines if a specific reviewer has permission to review a given subject's appraisal based on their roles, schools, and departments.

## School Configuration (`src/constants/universityHierarchy.js`)

University schools are defined as constants to ensure consistency across the application.

- **SoEMR**: School of Engineering and Management Research.
- **CISR**: Center for Interdisciplinary Studies and Research.
- **SoLA**: School of Liberal Arts.
- **SoD**: School of Design.
- **SoMC**: School of Media and Communication.

## Workflow Statuses

Appraisals move through several statuses:
- `Draft`: Saved but not submitted.
- `Pending <Role> Review`: Awaiting action from a specific reviewer.
- `<Role> Reviewed`: Successfully approved by a reviewer.
- `<Role> Rejected`: Sent back for corrections by a reviewer.
- `VC Reviewed / Completed`: Finalized appraisal.

## Rejection Logic

A reviewer can reject an appraisal, which usually sends it back to the original submitter for edits. The `canReviewerRejectProfile()` function defines who has the authority to initiate a rejection.
