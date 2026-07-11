# Faculty Appraisal Portal

A modern React-based faculty appraisal and review portal for managing self-appraisals, multi-level approvals, score validation, supporting documents, and final appraisal reports across university roles.

The application is designed for an academic appraisal workflow where faculty and staff submit structured forms, reviewers evaluate the submissions according to role and hierarchy, and final reports are generated with consistent scoring summaries.

## Highlights

- Role-based dashboards for Faculty, HOD, Director, Dean, VC, CISR, and non-teaching review flows
- Multi-stage appraisal workflow with reviewer-specific score columns and remarks
- Separate appraisal forms for engineering, non-engineering, media/communication, design/arts, CISR, and non-teaching staff
- Section-wise scoring with max-score limits, average-based score handling, and validation
- Draft saving, final submission, approval forwarding, and review status tracking
- Supporting document upload/view support for appraisal entries
- Printable/generated appraisal reports with detailed section summaries
- Protected routes and profile-driven dashboard routing
- Deployment-ready setup for Vite, Netlify, Firebase Hosting, Docker, and Nginx

## Tech Stack

- React 19
- Vite 8
- React Router 7
- Axios
- ESLint
- Firebase Hosting configuration
- Netlify configuration
- Docker + Nginx production image

## Project Structure

```text
frontend-FacultyAppraisal/
|-- public/                  # Static public assets
|-- scripts/                 # Project verification scripts
|-- src/
|   |-- auth/                # Protected routes and session handling
|   |-- components/          # Shared UI components
|   |-- constants/           # Form config, hierarchy, routing rules
|   |-- data/                # Mock/sample data helpers
|   |-- pages/               # Role dashboards and auth/profile pages
|   |-- services/            # API, persistence, and workflow services
|   `-- utils/               # Scoring, reports, validation, hierarchy helpers
|-- Dockerfile
|-- firebase.json
|-- netlify.toml
|-- nginx.conf
|-- package.json
`-- vite.config.js
```

## Main Workflows

### Faculty Appraisal

Faculty users can complete appraisal sections, attach supporting documents, save drafts, validate required fields, submit the form, and generate reports.

### Review Hierarchy

The portal supports appraisal review and forwarding across role-specific dashboards:

- HOD / Center Head review
- Director review
- Dean review
- Vice Chancellor review and finalization, including a pre-VC average score summary
- Registrar / Reporting Officer flows for non-teaching staff

### School and Form Routing

The application maps users to the correct appraisal form and review path using school, department, and role metadata. Supported school groups include:

- Engineering schools
- Non-engineering schools
- Media and Communication Studies
- Design and Applied Arts
- CISR

## Getting Started

### Prerequisites

Install:

- Node.js 20 or newer
- npm

### Installation

```bash
npm install
```

### Environment Variables

Create a local `.env` file from the example:

```bash
cp .env.example .env
```

Configure the backend API endpoint:

```env
VITE_API_BASE_URL=https://your-api-host.example.com/api/v1
```

The app also has a built-in default API base URL in `src/services/api.js`, but using `.env` is recommended for local and deployment-specific configuration.

## Available Scripts

Start the development server:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

Run ESLint:

```bash
npm run lint
```

Verify hierarchy configuration:

```bash
npm run verify:hierarchy
```

## Deployment

### Netlify

This repository includes `netlify.toml`.

Build command:

```bash
npm run build
```

Publish directory:

```text
dist
```

### Firebase Hosting

This repository includes `firebase.json` configured to serve the Vite build from `dist` with SPA rewrites.

```bash
npm run build
firebase deploy
```

### Docker

Build the image:

```bash
docker build --build-arg VITE_API_BASE_URL=https://your-api-host.example.com/api/v1 -t faculty-appraisal-frontend .
```

Run the container:

```bash
docker run -p 8080:8080 faculty-appraisal-frontend
```

## Configuration Notes

- App-level constants such as default academic year and portal name are defined in `src/constants/formConfig.js`.
- University schools, dean tracks, department routing, and aliases are defined in `src/constants/universityHierarchy.js`.
- Form-type routing is defined in `src/constants/formRouting.js`.
- API communication is centralized through `src/services/api.js`.
- Full appraisal report generation is handled in `src/utils/fullFormReport.js`.

## Quality Checks

Before opening a pull request or deploying, run:

```bash
npm run build
npm run lint
npm run verify:hierarchy
```

## Repository Notes

- Do not commit local `.env` files or private credentials.
- Keep scoring changes centralized in the shared utility files where possible.
- When adding a new role, school, or appraisal path, update both hierarchy routing and dashboard/report behavior.
- When changing labels or scoring rules, verify the affected dashboard tables and generated reports together.

## License

This project is intended for institutional use. Add the appropriate license file before distributing or open-sourcing the repository.
