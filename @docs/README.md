# Faculty Appraisal System Documentation

Welcome to the comprehensive documentation for the Faculty Appraisal System frontend.

## Table of Contents

1. [**Overview**](./1_Overview.md) - Project purpose, tech stack, and core goals.
2. [**Architecture**](./2_Architecture.md) - Project structure, routing, and data flow.
3. [**Authentication**](./3_Authentication.md) - Login flow, session management, and protected routes.
4. [**Workflow & Hierarchy**](./4_Workflow_and_Hierarchy.md) - Appraisal review chains, roles, and school-specific logic.
5. [**Services**](./5_Services.md) - API interaction layer and workflow services.
6. [**Utilities**](./6_Utilities.md) - Helper functions for validation, formatting, and data manipulation.
7. [**Components**](./7_Components.md) - Key reusable UI components.
8. [**Dashboards**](./8_Dashboards.md) - Role-specific dashboard implementations.

---

## Project Structure

- `src/auth`: Authentication logic and route protection.
- `src/components`: Reusable UI components.
- `src/constants`: Configuration and static data (hierarchy, form structures).
- `src/context`: React contexts (e.g., AuthContext).
- `src/pages`: Main application screens and dashboards.
- `src/services`: API and business logic services.
- `src/utils`: Helper functions and domain logic.
