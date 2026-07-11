# Frontend API Reference

Backend base URL (production): set in your `.env` as `VITE_API_BASE_URL`.  
All endpoints are under `/api/v1/`.  
Swagger UI (dev only): `http://localhost:8000/docs`

---

## Auth

Every protected endpoint requires:

```
Authorization: Bearer <token>
```

The token comes from the login response. Store it in `sessionStorage` (key: `accessToken`) and send it with every request.

---

### POST `/api/v1/auth/login`

```json
// Request
{ "email": "user@example.com", "password": "secret" }

// Response 200
{
  "token": "<jwt>",
  "profile": {
    "email": "user@example.com",
    "full_name": "Jane Doe",
    "appraisal_role": "faculty",
    "department": "Computer Science",
    "school": "SoCSEA — School of Computer Science, Engineering & Applications",
    "employee_id": "EMP001",
    "designation": "Assistant Professor",
    "qualification": "M.Tech",
    "teaching_experience": "5 years",
    "phone": "9876543210",
    "avatar": null
  }
}
```

Error 401 — wrong credentials.  
Error 403 — account not yet verified.

---

### POST `/api/v1/auth/register`

```json
// Request
{
  "email": "user@example.com",
  "password": "secret",
  "full_name": "Jane Doe",
  "appraisal_role": "faculty",
  "school": "SoCSEA — School of Computer Science, Engineering & Applications",
  "department": "Computer Science",
  "designation": "Assistant Professor",
  "employee_id": "EMP001",
  "phone": "9876543210",
  "qualification": "M.Tech",
  "teaching_experience": "5 years",
  "academic_year": "2025-2026"
}

// Response 200
{ "message": "Registration successful. Please check your email to verify your account.", "email": "user@example.com" }
```

Newly registered users cannot log in until they click the verification link sent to their email. `is_verified` starts as `false`.

---

### GET `/api/v1/auth/verify-email?token=<token>`

Called automatically when the user clicks the link in their verification email. Redirects to `<FRONTEND_URL>/login?verified=true` on success.

---

### GET `/api/v1/auth/me` — requires auth

Returns the same profile object shape as the login response.

---

### PUT `/api/v1/auth/me` — requires auth

```json
// Request (all fields optional)
{
  "full_name": "Jane Doe",
  "phone": "9876543210",
  "designation": "Professor",
  "qualification": "PhD",
  "teaching_experience": "8 years",
  "employee_id": "EMP001",
  "department": "Computer Science",
  "school": "SoCSEA — School of Computer Science, Engineering & Applications"
}

// Response: updated profile object (same shape as login profile)
```

---

### POST `/api/v1/auth/change-password` — requires auth

```json
// Request
{ "current_password": "old", "new_password": "new" }

// Response 200
{ "message": "Password changed successfully" }
```

Error 400 — incorrect current password.

---

### POST `/api/v1/auth/forgot-password`

Generates a one-time reset token, stores its hash in `password_reset_tokens`, and emails the raw token to the user.  
Always returns 200 regardless of whether the email exists (prevents email enumeration).

```json
// Request
{ "email": "user@example.com" }

// Response 200
{ "message": "If that email is registered, a reset link has been sent." }
```

---

### POST `/api/v1/auth/reset-password`

Verifies the token hash in `password_reset_tokens` (must be unused and not expired), then updates `password_hash` in `faculty_profiles` and marks the token as used.

```json
// Request
{ "token": "<raw_token_from_email>", "new_password": "newSecret123" }

// Response 200
{ "message": "Password reset successfully." }
```

Error 400 — token is invalid, already used, or expired.

---

## Appraisal Form (teaching staff)

---

### GET `/api/v1/appraisal/snapshot?academic_year=2025-2026` — requires auth

Returns the faculty's saved draft/submitted form payload, or `null` if none exists yet.

```json
// Response 200
{
  "faculty_email": "faculty@example.com",
  "academic_year": "2025-2026",
  "payload": {
    "form": {
      /* full form sections — see Submit for shape */
    },
    "totals": { "partATotal": 45.5, "partBTotal": 30.0, "grandTotal": 75.5 },
    "docs": {
      /* doc key → array of uploaded file objects */
    },
    "submitterProfile": {
      /* profile at time of save */
    },
    "savedAt": "2025-06-01T10:00:00.000Z"
  }
}
```

---

### PUT `/api/v1/appraisal/snapshot` — requires auth

Save a draft. Called on auto-save. Safe to call many times — upserts on `(faculty_email, academic_year)`.

```json
// Request
{
  "academic_year": "2025-2026",
  "payload": {
    "form": { /* full form sections */ },
    "totals": { "partATotal": 45.5, "partBTotal": 30.0, "grandTotal": 75.5 },
    "docs": { /* doc key → array of uploaded file objects */ },
    "submitterProfile": { /* profile object from sessionStorage */ },
    "savedAt": "2025-06-01T10:00:00.000Z"
  }
}

// Response 200
{ "message": "Snapshot saved" }
```

---

### POST `/api/v1/appraisal/submit` — requires auth

Final submission. Shreds the form into all normalized DB tables (e.g. `teaching_process`, `journal_publications`, etc.), creates/updates the `declarations` row, and saves docs to `appraisal_documents`.  
If the admin has closed submissions for this year, returns **403** with `user_message`.

The frontend first tries with the workflow fields included. If the backend returns 400 or 422 (older backend that does not support them), it retries without the workflow fields.

```json
// Request — primary (with workflow fields)
{
  "academic_year": "2025-2026",
  "form": {
    "lectures":          [ { "semester": "Odd", "course_code": "CS101", "planned_classes": 40, "conducted_classes": 40 } ],
    "courseFile":        [ { "course": "CS101", "title": "Course Plan", "details": "Uploaded", "score": 18 } ],
    "innovativeTeaching": { "details": "Used flipped classroom", "score": 8 },
    "projects":          [ { "label": "UG Projects", "score": 5 } ],
    "quals":             [ { "label": "PhD Pursuing", "score": 10 } ],
    "feedback":          [ { "course_code": "CS101", "feedback_1": 4.2, "feedback_2": 4.5, "score": 9 } ],
    "deptActs":          [ { "activity": "Time Table Committee", "nature": "Member", "score": 5 } ],
    "uniActs":           [ { "activity": "Cultural Fest", "nature": "Coordinator", "score": 10 } ],
    "society":           [ { "activity": "Blood Donation", "status": "Completed", "details": "Organized", "score": 5 } ],
    "industry":          [ { "name": "TCS", "details": "Guest Lecture", "score": 5 } ],
    "acr":               [ { "label": "Self-motivation and Proactiveness", "score": 4 } ],
    "journals":          [ { "title": "...", "journal": "...", "issn": "...", "indexing": "Scopus", "score": 10 } ],
    "popularWritings":   [ { "media": "...", "film": "", "score": 5 } ],
    "books":             [ { "title": "...", "book": "...", "issn": "", "isbn": "...", "publisher": "...", "coauthor": "", "first_author": "Yes", "score": 5 } ],
    "ict":               [ { "title": "...", "description": "...", "type": "Video", "quadrant": "Q1", "score": 10 } ],
    "research":          [ { "degree": "PhD", "student_name": "John", "thesis": "ML in Healthcare", "score": 15 } ],
    "projects2":         [ { "title": "...", "agency": "DST", "sanction_date": "2024-01-15", "amount": 500000, "role": "PI", "project_status": "Ongoing", "score": 10 } ],
    "internalProjects":  [ { "title": "...", "agency": "Internal", "sanction_date": "2024-01-15", "amount": 100000, "role": "Co-PI", "project_status": "Completed", "score": 8 } ],
    "externalProjects":  [ { "title": "...", "agency": "SERB", "sanction_date": "2024-03-01", "amount": 1000000, "role": "PI", "project_status": "Ongoing", "score": 15 } ],
    "ipr":               [ { "title": "...", "scope": "National", "ipr_date": "2024-06-01", "ipr_status": "Filed", "file_no": "IPR/2024/001", "score": 5 } ],
    "patents":           [ { "title": "...", "type": "Utility", "scope": "International", "patent_date": "2024-06-01", "patent_status": "Granted", "file_no": "PAT/2024/001", "score": 10 } ],
    "awards":            [ { "title": "Best Teacher", "award_date": "2024-12-01", "agency": "University", "level": "University", "score": 5 } ],
    "confs":             [ { "title": "Paper title", "type": "Presentation", "organization": "IEEE", "level": "International", "score": 5 } ],
    "proposals":         [ { "title": "...", "duration": "3 years", "agency": "DST", "amount": 2000000, "score": 5 } ],
    "products":          [ { "details": "Lab kit", "usage": "Used in practicals", "score": 5 } ],
    "fdps":              [ { "program": "AI/ML Workshop", "duration": "5 days", "organization": "IIT Bombay", "score": 5 } ],
    "training":          [ { "company": "Infosys", "duration": "2 weeks", "nature": "Industrial Visit", "score": 5 } ]
  },
  "totals": { "partATotal": 45.5, "partBTotal": 30.0, "grandTotal": 75.5 },
  "docs": {
    "journals0": [ { "name": "paper.pdf", "type": "application/pdf", "url": "https://storage.googleapis.com/...", "publicId": "faculty/uploads/uuid_paper.pdf" } ]
  },
  "submitter_profile": {
    "email": "faculty@example.com",
    "appraisal_role": "faculty",
    "school": "SoCSEA — School of Computer Science, Engineering & Applications",
    "department": ""
  },
  "status": "Pending HOD Review",
  "workflow_status": "Pending HOD Review",
  "next_reviewer": "hod",
  "next_reviewer_role": "hod",
  "review_chain": ["hod", "director", "dean"]
}

// Response 200
{ "message": "Submitted successfully", "submitted_at": "2025-06-01T10:00:00" }
```

**Note on `review_chain`:** computed from school/role — backend may use this to set the initial workflow status or validate it. If the faculty's school has no HOD (most schools except SoEMR), the chain starts at `director`. CISR faculty go `center_head → vc` directly.

---

### GET `/api/v1/appraisal/status?academic_year=2025-2026` — requires auth

Returns the declaration row and all reviews received so far for the logged-in faculty.  
Called by every dashboard (faculty, HOD, director, dean) to show the faculty's own appraisal progress.

```json
// Response 200
{
  "declaration": {
    "id": "<uuid>",
    "faculty_email": "faculty@example.com",
    "academic_year": "2025-2026",
    "part_a_total": 45.5,
    "part_b_total": 30.0,
    "grand_total": 75.5,
    "status": "Pending HOD Review",
    "submitted_at": "2025-06-01T10:00:00"
  },
  "reviews": [
    {
      "reviewer_role": "hod",
      "reviewer_email": "hod@example.com",
      "part_a_score": 42.0,
      "part_b_score": 28.0,
      "total_score": 70.0,
      "section_scores": { "lectures": 45, "journals": 80 },
      "remarks": "Good performance",
      "status": "Pending Director Review",
      "reviewed_at": "2025-06-05T14:00:00"
    }
  ]
}
```

Returns `{ "declaration": null, "reviews": [] }` if the faculty has not submitted yet.

---

## Dashboard (reviewer roles)

Reviewers: `hod`, `center_head`, `director`, `dean`, `vc`.  
`faculty` and non-teaching roles receive an empty array.

---

### GET `/api/v1/dashboard/subordinates` — requires auth

Returns all faculty visible to the logged-in reviewer for the given year, enriched with their self-scores and any reviewer scores already submitted.

**Query params:**

| Param                 | Required | Description                                                                       |
| --------------------- | -------- | --------------------------------------------------------------------------------- |
| `academic_year`       | Yes      | e.g. `2025-2026`                                                                  |
| `reviewer_role`       | Yes      | e.g. `hod`, `director`, `dean`, `vc`                                              |
| `pending_status`      | Yes      | Status string the reviewer is looking for, e.g. `"Pending HOD Review"`            |
| `reviewer_school`     | No       | School of the reviewer (used to filter results)                                   |
| `reviewer_department` | No       | Department of the reviewer (used by HOD to scope to own dept)                     |
| `schools`             | No       | Comma-separated school codes — used by VC/Registrar to filter, e.g. `SoCSEA,SoBB` |

```json
// Response — array of:
{
  "email": "faculty@example.com",
  "name": "Jane Doe",
  "department": "Computer Science",
  "school": "SoCSEA — School of Computer Science, Engineering & Applications",
  "appraisal_role": "faculty",
  "designation": "Assistant Professor",
  "status": "Pending HOD Review",
  "submitted_at": "2025-06-01T10:00:00",
  "part_a_total": 45.5,
  "part_b_total": 30.0,
  "grand_total": 75.5,
  "hod_total": 42.0,
  "hod_part_a": 40.0,
  "hod_part_b": 2.0,
  "hod_remarks": "Good",
  "director_total": 0,
  "director_part_a": 0,
  "director_part_b": 0,
  "director_remarks": "",
  "dean_total": 0,
  "dean_part_a": 0,
  "dean_part_b": 0,
  "dean_remarks": "",
  "vc_total": 0,
  "vc_part_a": 0,
  "vc_part_b": 0,
  "vc_remarks": ""
}
```

Reviewer totals are `0` / empty string until that reviewer has submitted their review.

---

### GET `/api/v1/dashboard/faculty/{email}?academic_year=2025-2026` — requires auth

Returns the full saved snapshot (same shape as `GET /appraisal/snapshot` payload) for a specific faculty member.  
The logged-in user must have authority over that faculty member — otherwise **403**.  
Used by reviewer dashboards to open and read a faculty's submitted form.

**REQUIRED BACKEND CHANGE — per-row reviewer scores (currently missing):**  
The VC review panel shows HOD / Director / Dean score columns for every row in every form section (lectures, courseFile, quals, feedback, journals, etc.). These scores are stored in the DB tables (`teaching_process.hod_score`, `teaching_process.director_score`, etc.) but are **not currently returned** in this response. The frontend pipeline is fully implemented to display them — it just needs the data.

The VC dashboard also displays a frontend-only `Average Score` between the Dean and VC score summaries. This is not a backend field. It is calculated from the available pre-VC total scores for the subject: self/faculty total plus the applicable prior reviewer totals in the review chain. For example, a SoEMR faculty item averages Faculty, HOD, Director, and Dean totals; a CISR faculty item averages Faculty and Center Head totals. The VC review header displays these score summaries to one decimal place. The VC review form's `Personal Information` table intentionally hides `ExpDyp`, `ExpPrev`, and `ExpTotal` rows for display clarity only.

The backend must include per-row reviewer scores in one of two ways:

**Option A — embed in form rows (preferred):** Add `hod_score`, `director_score`, `dean_score`, `vc_score` columns directly into each form row object by JOINing from the corresponding table:

```json
// payload.form.lectures — WITH per-row reviewer scores
[
  {
    "semester": "Odd", "course_code": "CS101", "planned_classes": 40, "conducted_classes": 40,
    "hod_score": 40, "director_score": 50, "dean_score": 50, "vc_score": null
  }
]
```

The frontend's `normalizeReviewScoreAliasesOnRows` already aliases `hod_score → hod`, `director_score → director`, `dean_score → dean`, `vc_score → vc` on every form row. No frontend change needed.

**Option B — include a `reviews` array:** Add a top-level `reviews` array alongside `payload`, same structure as `GET /appraisal/status`, with per-row arrays in `section_scores`:

```json
{
  "payload": { ... },
  "reviews": [
    {
      "reviewer_role": "hod",
      "section_scores": {
        "lectures": [40, 35],
        "courseFile": [16],
        "quals": [10, 5],
        "feedback": [9]
      }
    },
    { "reviewer_role": "director", "section_scores": { "lectures": [50, 45], ... } },
    { "reviewer_role": "dean",     "section_scores": { "lectures": [50, 45], ... } }
  ]
}
```

The frontend's `reviewsFromAppraisalResponse` already reads `data.reviews` and merges them into form rows. No frontend change needed.

For both options, the source of truth is the per-row columns already in the DB:  
`teaching_process.hod_score`, `course_files.hod_score`, `qualification_enhancement.hod_score`, etc.

---

## Review submission (reviewer roles)

All five review endpoints share the same request/response shape.

The frontend first sends the request **with** the workflow-forwarding fields. If the backend returns 400 or 422 (older version), it retries with **only** the base fields (`academic_year`, `remarks`, `part_a_score`, `part_b_score`, `total_score`, `section_scores`).

```json
// Request body — full (preferred)
{
  "academic_year": "2025-2026",
  "remarks": "Good overall performance.",
  "part_a_score": 42.0,
  "part_b_score": 28.0,
  "total_score": 70.0,
  "section_scores": {
    "lectures": 45.0,
    "courseFile": 16.0,
    "journals": 80.0
  },
  "status": "Pending Director Review",
  "workflow_status": "Pending Director Review",
  "review_status": "HOD Reviewed",
  "next_reviewer": "director",
  "next_reviewer_role": "director"
}

// Response 200
{ "message": "Review submitted", "status": "Pending Director Review" }
```

**`{email}` path param** is the faculty member being reviewed (URL-encoded).

| Endpoint                                            | Reviewer role | Notes                                                   |
| --------------------------------------------------- | ------------- | ------------------------------------------------------- |
| `PUT /api/v1/appraisal-remarks/hod/{email}`         | `hod`         | Standard schools with HOD (SoEMR departments only)      |
| `PUT /api/v1/appraisal-remarks/center-head/{email}` | `center_head` | CISR faculty only; next reviewer is `vc`                |
| `PUT /api/v1/appraisal-remarks/director/{email}`    | `director`    | All schools — is first reviewer for schools without HOD |
| `PUT /api/v1/appraisal-remarks/dean/{email}`        | `dean`        | Engineering or non-engineering division dean            |
| `PUT /api/v1/appraisal-remarks/final/{email}`       | `vc`          | Final review; sets status to `Reviewed`                 |

**`next_reviewer` / `status` values by role:**

| Reviewer      | `review_status`        | `status` / `workflow_status` | `next_reviewer` |
| ------------- | ---------------------- | ---------------------------- | --------------- |
| `hod`         | `HOD Reviewed`         | `Pending Director Review`    | `director`      |
| `center_head` | `Center Head Reviewed` | `Pending VC Review`          | `vc`            |
| `director`    | `Director Reviewed`    | `Pending Dean Review`        | `dean`          |
| `dean`        | `Dean Reviewed`        | `Pending VC Review`          | `vc`            |
| `vc`          | `VC Reviewed`          | `Reviewed`                   | _(none)_        |

---

## Non-teaching staff appraisal

Non-teaching staff (`appraisal_role = "non_teaching_staff"`) use a separate form with two parts:  
**Part A** — self-assessment (3 items, max 25 marks total)  
**Part B** — authority ratings across 4 sections (max 105 marks total, rated by RO / Registrar / VC only)

The entire form is stored as a JSONB `payload` column in `non_teaching_appraisals`.

---

### GET `/api/v1/non-teaching/appraisal?academic_year=2025-2026` — requires auth

Returns the staff member's non-teaching appraisal record, or `null` if none exists yet.

```json
// Response 200
{
  "id": "<uuid>",
  "staff_email": "staff@example.com",
  "academic_year": "2025-2026",
  "status": "Draft",
  "self_total": 0,
  "ro_total": 0,
  "registrar_total": 0,
  "vc_total": 0,
  "submitted_at": null,
  "payload": {
    "appraisalType": "non-teaching",
    "submittedByRole": "non_teaching_staff",
    "status": "Draft",
    "info": {
      "name": "John Smith",
      "email": "staff@example.com",
      "employeeId": "EMP099",
      "designation": "Lab Assistant",
      "department": "Computer Science",
      "reportingHead": "",
      "ay": "2025-2026"
    },
    "selfResp": { "text": "Manage lab equipment", "marks": "8" },
    "selfContrib": { "text": "Organized events", "marks": "7" },
    "selfAchieve": { "text": "Won best staff award", "marks": "4" },
    "partB": {
      "profComp": {
        "p0_ro": 4,
        "p1_ro": 3,
        "p0_reg": 4,
        "p1_reg": 4,
        "p0_vc": 4,
        "p1_vc": 4
      },
      "quality": {},
      "personal": {},
      "regular": {}
    },
    "docs": {},
    "remarks": "",
    "roRemarks": "",
    "registrarRemarks": "",
    "vcRemarks": ""
  }
}
```

---

### PUT `/api/v1/non-teaching/appraisal` — requires auth

Create or update the non-teaching appraisal. Upserts on `(staff_email, academic_year)`.  
Called both for draft saves and for final self-submission.

```json
// Request
{
  "staff_email": "staff@example.com",
  "academic_year": "2025-2026",
  "payload": {
    /* full form object — same shape as GET response payload */
  },
  "status": "Submitted"
}

// Response 200: updated record (same shape as GET response)
```

**Status values:**

| Status                       | Set by                         |
| ---------------------------- | ------------------------------ |
| `Draft`                      | Staff (auto-save)              |
| `Submitted`                  | Staff (final submit)           |
| `Reporting Officer Reviewed` | Reporting Officer after review |
| `Registrar Reviewed`         | Registrar after review         |
| `VC Approved`                | VC after final review          |

---

### GET `/api/v1/non-teaching/subordinates?academic_year=2025-2026` — requires auth

For `reporting_officer`, `registrar`, and `vc`: returns all non-teaching staff visible to the reviewer with their submission status.

```json
// Response — array of:
{
  "id": "<uuid>",
  "staff_email": "staff@example.com",
  "academic_year": "2025-2026",
  "status": "Submitted",
  "self_total": 19.0,
  "ro_total": 0,
  "registrar_total": 0,
  "vc_total": 0,
  "submitted_at": "2025-06-02T09:00:00",
  "payload": {
    /* full form payload */
  }
}
```

**Visibility rules:**

| Reviewer            | Sees                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------- |
| `reporting_officer` | Only `non_teaching_staff` with status `Submitted`                                     |
| `registrar`         | `non_teaching_staff` and `reporting_officer` with status `Reporting Officer Reviewed` |
| `vc`                | All non-teaching roles with status `Registrar Reviewed`                               |

---

### PUT `/api/v1/non-teaching/review/{staffEmail}` — requires auth

Submit a review for a non-teaching staff member. `{staffEmail}` is URL-encoded.  
The reviewer fills in their marks in the `payload` (Part A marks as `roMarks`/`regMarks`/`vcMarks`; Part B ratings as `p{n}_ro`/`p{n}_reg`/`p{n}_vc`), and the updated payload is sent back.

```json
// Request
{
  "academic_year": "2025-2026",
  "payload": {
    /* full form payload with reviewer's marks filled in */
  },
  "status": "Reporting Officer Reviewed",
  "remarks": "Satisfactory performance"
}

// Response 200: updated record (same shape as GET /non-teaching/subordinates item)
```

**`remarks` field mapping inside payload:**

| Reviewer            | Remarks field in payload |
| ------------------- | ------------------------ |
| `reporting_officer` | `roRemarks`              |
| `registrar`         | `registrarRemarks`       |
| `vc`                | `vcRemarks`              |

---

## Documents

### GET `/api/v1/appraisal-documents?academic_year=2025-2026` — requires auth

Returns all uploaded supporting documents for the logged-in faculty for that year.  
Used to restore document links when the faculty re-opens their form.

```json
// Response — array of:
{
  "id": "<uuid>",
  "faculty_email": "faculty@example.com",
  "academic_year": "2025-2026",
  "section": "journals",
  "doc_key": "journals0",
  "row_no": 1,
  "file_name": "paper.pdf",
  "file_type": "application/pdf",
  "file_url": "https://storage.googleapis.com/.../paper.pdf",
  "storage_path": "faculty/uploads/uuid_paper.pdf",
  "uploaded_at": "2025-05-15T12:00:00"
}
```

---

## File upload

### POST `/api/v1/upload` — requires auth — `multipart/form-data`

Upload a supporting document. Returns a file object to store inside the form's `docs` map.

```
// Form fields:
file   — the binary file
folder — storage sub-folder, e.g. "faculty-appraisal/<doc_key>" or "non-teaching-appraisal/<doc_key>"

// Response 200
{
  "url":      "https://storage.googleapis.com/.../filename.pdf",
  "publicId": "faculty/uploads/<uuid>_filename.pdf",
  "name":     "filename.pdf",
  "type":     "application/pdf"
}
```

Multiple files can be stored for the same section slot. The frontend keeps each slot as an array of uploaded file objects.

---

## Announcements

### GET `/api/v1/announcements` — no auth required

Returns all active announcements to display on the login page and dashboards.

```json
// Response — array of:
{
  "id": 1,
  "title": "Appraisal cycle 2025-2026 is now open",
  "body": "All faculty must submit by 30 June 2025.",
  "is_active": true,
  "created_at": "2025-05-01T09:00:00"
}
```

---

## Error format

Every error response from the backend must follow this shape:

```json
{
  "user_message": "Invalid email or password.",
  "detail": "..."
}
```

**Always show `user_message` in the UI.** The `detail` field is for the network tab / bug reports only.

```js
try {
  const res = await apiClient.post('/api/v1/auth/login', { ... })
} catch (err) {
  const userMessage = err?.response?.data?.user_message || "Something went wrong."
  showToast(userMessage)
}
```

---

## Role reference

| Role value           | Label              | Can do                                                                    |
| -------------------- | ------------------ | ------------------------------------------------------------------------- |
| `faculty`            | Faculty            | Submit own teaching appraisal (Form A / B / C based on school)            |
| `hod`                | Head of Department | Review faculty in own department (SoEMR departments only)                 |
| `center_head`        | Center Head        | Review CISR faculty (replaces director; next reviewer is VC)              |
| `director`           | Director           | Review all faculty in own school (first reviewer for schools without HOD) |
| `dean`               | Dean               | Review all faculty in their division (engineering or non-engineering)     |
| `vc`                 | Vice Chancellor    | Final review for all teaching staff across all schools                    |
| `non_teaching_staff` | Non-Teaching Staff | Submit non-teaching appraisal                                             |
| `reporting_officer`  | Reporting Officer  | First reviewer for non-teaching staff                                     |
| `registrar`          | Registrar          | Second reviewer for non-teaching staff; can view all schools              |

---

## School codes and form types

| Code     | School                                                 | Division        | Form   | First reviewer   |
| -------- | ------------------------------------------------------ | --------------- | ------ | ---------------- |
| `SoCSEA` | School of Computer Science, Engineering & Applications | Engineering     | Form A | Director         |
| `SoBB`   | School of Bio-Engineering & Bio Science                | Engineering     | Form A | Director         |
| `SoCE`   | School of Continual Education                          | Engineering     | Form A | Director         |
| `SoEMR`  | School of Engineering Management & Research            | Engineering     | Form A | HOD → Director   |
| `SoC`    | School of Commerce & Management                        | Non-Engineering | Form A | Director         |
| `SoMCS`  | School of Media & Communication Studies                | Non-Engineering | Form B | Director         |
| `SoD`    | School of Design                                       | Non-Engineering | Form C | Director         |
| `SoAA`   | School of Applied Arts                                 | Non-Engineering | Form C | Director         |
| `CISR`   | Center for Interdisciplinary Studies and Research      | Standalone      | Form A | Center Head → VC |

**Review chains by school:**

| School                                     | Chain                      |
| ------------------------------------------ | -------------------------- |
| SoCSEA, SoBB, SoCE, SoC, SoMCS, SoD, SoAA | Director → Dean → VC       |
| SoEMR                                      | HOD → Director → Dean → VC |
| CISR                                       | Center Head → VC           |

**Engineering division** (Engineering Dean): `SoCSEA`, `SoBB`, `SoCE`, `SoEMR`  
**Non-engineering division** (Non-Engineering Dean): `SoC`, `SoMCS`, `SoD`, `SoAA`

---

## Appraisal config (admin-only)

The backend controls whether submissions are open or closed via the `appraisal_config` table.  
On `POST /appraisal/submit`, if `is_open = false` for the given `academic_year`, the backend must return:

```json
// 403
{
  "user_message": "Appraisal submissions for 2025-2026 are currently closed.",
  "detail": "appraisal_config.is_open is false"
}
```
