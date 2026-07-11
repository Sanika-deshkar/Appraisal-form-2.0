# Getting Started

Follow these steps to set up the Faculty Appraisal System frontend on your local machine.

## Prerequisites

- **Node.js**: Version 18 or higher.
- **npm**: Version 9 or higher.

## Installation

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd frontend-FacultyAppraisal
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Environment Variables**:
    Create a `.env` file in the root directory (you can use `.env.example` as a template).
    ```env
    VITE_API_BASE_URL=https://faculty-appraisal-git-376777978967.asia-south1.run.app/api/v1
    ```

## Development

Run the development server:
```bash
npm run dev
```
The application will be available at `http://localhost:5173`.

## Building for Production

To create a production-ready bundle:
```bash
npm run build
```
The output will be in the `dist/` directory.

## Linting

To check for code style and potential errors:
```bash
npm run lint
```

## Troubleshooting

- **CORS Issues**: Ensure that your local development URL is whitelisted in the backend.
- **Session Issues**: If you encounter unexpected redirects to login, clear your `sessionStorage` and try logging in again.
- **Node Version**: If you see errors related to `package-lock.json` or dependency resolution, verify that you are using a compatible Node.js version.
