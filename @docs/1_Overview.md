# Project Overview

The **Faculty Appraisal System** is a web-based application designed to streamline the performance evaluation process for faculty and staff at the university. It provides a structured workflow for submitting appraisal forms and managing the multi-level review process.

## Core Objectives

- **Automated Workflow**: Transition from paper-based appraisals to a dynamic digital workflow.
- **Role-Based Access**: Provide tailored dashboards for Faculty, HODs, Deans, Directors, and other university officials.
- **Transparency**: Allow users to track the status of their appraisal in real-time.
- **Data Integrity**: Ensure accurate scoring and feedback collection at each stage of the review process.

## Technology Stack

- **Frontend Library**: [React 19](https://react.dev/)
- **Routing**: [React Router 7](https://reactrouter.com/)
- **State Management**: React Hooks (useState, useEffect, useMemo) and Session Storage.
- **API Communication**: [Axios](https://axios-http.com/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: Vanilla CSS with a focus on modularity and responsiveness.
- **Backend**: Java-based API (hosted on Google Cloud Run).

## Key Features

- **Dynamic Dashboards**: Dashboards are lazily loaded based on the user's role to optimize performance.
- **Flexible Hierarchy**: Supports various review chains (e.g., Faculty -> HOD -> Director -> Dean -> VC).
- **Non-Teaching Support**: Specific workflows and dashboards for non-teaching staff.
- **Profile Management**: Integrated profile editing and validation.
- **Error Handling**: Comprehensive error boundaries and user-friendly error messages.
