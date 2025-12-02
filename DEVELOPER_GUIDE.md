# EventX — Developer Guide

## Overview
This guide provides developers with the essential information required to set up, understand, develop, and maintain the EventX platform. It covers project structure, local development setup, environment configuration, API conventions, testing, coding standards, database management, and deployment strategies.

## Project Layout
The EventX project follows a standard Next.js application structure with API routes serving as the backend.

```
/
├── app/                  # Next.js App Router root
│   ├── (main)/           # Main application layout group
│   │   ├── admin/        # Admin dashboard and management pages
│   │   ├── events/       # Public event listing and detail pages
│   │   ├── contact/      # Contact page
│   │   ├── profile/      # User profile page
│   │   └── page.js       # Landing page
│   ├── auth/             # Authentication routes (Login/Signup)
│   ├── api/              # Next.js API Routes for backend logic
│   │   └── [[...path]]/  # Catch-all API route handler
│   ├── components/       # Reusable UI components
│   ├── lib/              # Utility functions, Supabase client/server setup
│   ├── styles/           # Global CSS and Tailwind configuration
│   └── layout.js         # Root layout
├── public/               # Static assets (images, favicon)
├── hooks/                # Custom React hooks
├── types/                # TypeScript type definitions
├── SUPABASE_SETUP.sql    # Database schema for Supabase
├── .env.local.example    # Example environment variables
├── README.md             # Project overview and quick start
├── package.json          # Project dependencies and scripts
└── backend_test.py       # Python script for backend API testing
```

## Getting Started (Local Development)

To set up the EventX project for local development:

1.  **Clone the Repository:**
    ```bash
    git clone <repository-url>
    cd EventX
    ```

2.  **Database Setup (Supabase):**
    -   Go to your Supabase Dashboard: `https://supabase.com/dashboard`
    -   Create a new project.
    -   Navigate to **SQL Editor** (left sidebar).
    -   Copy the entire content of the `SUPABASE_SETUP.sql` file from the project root.
    -   Paste and run it in the Supabase SQL Editor. This will create all necessary tables, Row Level Security (RLS) policies, and storage buckets (`event-banners`, `club-logos`).

3.  **Environment Variables:**
    -   Copy the example environment file:
        ```bash
        cp .env.local.example .env.local
        ```
    -   Update `.env.local` with your Supabase project credentials, which can be found in your Supabase project settings (`Project Settings` → `API`):
        ```env
        NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
        NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
        SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
        # Optional: Email service configuration for Edge Functions or external service
        RESEND_API_KEY=your_resend_api_key_if_used
        SENDGRID_API_KEY=your_sendgrid_api_key_if_used
        NEXT_PUBLIC_SUPABASE_FUNCTION_URL=your_supabase_edge_function_url_if_used
        ```

4.  **Install Dependencies:**
    ```bash
    yarn install
    # or npm install
    ```

5.  **Run Development Server:**
    ```bash
    yarn dev
    # or npm run dev
    ```
    The application will be accessible at `http://localhost:3000`.
    
    *Note: The `dev` script uses `cross-env` to increase memory limit (`--max-old-space-size=512`) to prevent out-of-memory errors during development.*

6.  **Create Admin Account (Important):**
    -   Go to your Supabase Dashboard → **Authentication** → **Users**.
    -   Click **Add user** → **Create new user**.
    -   Enter an email and password.
    -   Click **Create user**.
    -   To grant this user admin privileges, manually add their `user_id` to the `admin_users` table in your Supabase database with the desired `role` (`admin` or `super_admin`). This user can then log in to the admin dashboard at `/admin/login`.

## Environment Variables (Essential)
The following environment variables are crucial for the application's operation:

```env
# Supabase Project Credentials (required)
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Email Service (choose one if using for notifications)
RESEND_API_KEY=re_...           # For Resend (recommended with Edge Functions)
SENDGRID_API_KEY=SG...          # For SendGrid (alternative)

# Supabase Edge Function URL (if deploying email function)
NEXT_PUBLIC_SUPABASE_FUNCTION_URL=https://<your-project-id>.supabase.co/functions/v1/send-email
```

*Note: `NEXT_PUBLIC_` prefixed variables are exposed to the browser, others are server-side only.*

**Note on Payment Keys:**
Razorpay API keys are **NOT** stored in environment variables. They are configured by admins via the UI and stored securely in the `admin_users` table. This allows different clubs to have their own payment gateways.

## API Conventions
EventX uses Next.js API Routes for its backend logic.
-   **Base Path**: All API endpoints reside under `/api/`.
-   **Authentication**: Handled via Supabase Auth. User sessions are managed by JWTs, typically handled automatically by the Supabase client library. Server-side API routes use the `SUPABASE_SERVICE_ROLE_KEY` for elevated privileges when necessary.
-   **Pagination**: For list endpoints, utilize `?page=` and `?page_size=` query parameters.
-   **Responses**:
    -   **Success**: Generally returns a JSON object with a `data` field: `{ "status": "success", "data": ... }`.
    -   **Error**: Returns a JSON object with an `error` message and an appropriate HTTP status code: `{ "status": "error", "message": "..." }`.

## Tests
Unit and integration tests are crucial for maintaining code quality.
-   **Frontend Tests**: Located under the respective component/page directories. (e.g., `components/__tests__/`). Use React Testing Library and Jest.
-   **API Route Tests**: Located under `app/api/__tests__/`. Use Jest for testing server-side logic.
-   **Running Tests:**
    ```bash
    yarn test
    # or npm test
    ```
-   **CI/CD**: Continuous Integration pipelines should include steps for running tests, linting, building the frontend, and performing security checks.

### Backend API Testing
A Python script `backend_test.py` is provided to test the API endpoints end-to-end.

**Prerequisites:**
- Python 3.x
- `requests` library (`pip install requests`)

**Running the tests:**
```bash
python backend_test.py
```
This script verifies:
- API Health Check
- Event CRUD operations
- Participant Registration
- Contact Form Submission
- Error Handling scenarios

## Coding Standards
To ensure consistency and maintainability:
-   **TypeScript**: Use TypeScript for all new code to leverage type safety and improve code clarity.
-   **Linting**: Adhere to ESLint rules (configured in `.eslintrc.json`). Run `yarn lint` to check for issues.
-   **Formatting**: Use Prettier (configured in `.prettierrc.json`) for consistent code formatting. Run `yarn format` to automatically fix formatting.
-   **Component Structure**: Follow Atomic Design principles where applicable (e.g., small, reusable components).
-   **Commit Messages**: Use Conventional Commits (e.g., `feat: add new feature`, `fix: resolve bug`, `docs: update documentation`, `chore: update dependencies`).

## Database Management (Supabase)
Supabase provides a powerful PostgreSQL database with various integrated tools.
-   **Schema Management**: Database schema is defined in `SUPABASE_SETUP.sql`. All schema changes should first be reflected in this file and then applied to the Supabase project.
-   **Migrations**: Supabase CLI allows for local development of database migrations.
    -   `supabase db diff > migrations/<timestamp>_migration_name.sql`
    -   `supabase db push` (to apply local changes to your Supabase project or local database)
-   **Row Level Security (RLS)**: Crucial for data protection. Ensure RLS policies are correctly configured for all tables to prevent unauthorized data access. These are defined in `SUPABASE_SETUP.sql`.

## Deployment
The EventX platform is designed for seamless deployment on Vercel.

### Vercel Deployment
1.  **Version Control**: Ensure your project is pushed to a Git repository (e.g., GitHub, GitLab, Bitbucket).
2.  **Import Project**: In Vercel, import your Git repository as a new project.
3.  **Environment Variables**: Add all necessary environment variables from your `.env.local` file to the Vercel project settings (under `Settings` → `Environment Variables`). Ensure sensitive keys like `SUPABASE_SERVICE_ROLE_KEY` are marked as `Server-side only`.
4.  **Connect Supabase**: Vercel integrates seamlessly with Supabase. Ensure your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correctly configured.
5.  **Deploy**: Vercel will automatically build and deploy your application. Subsequent pushes to the configured branch will trigger automatic re-deployments.

### Supabase Edge Functions Deployment (for email service)
If utilizing the Supabase Edge Function for email notifications:
1.  **Install Supabase CLI:** `npm install -g supabase`
2.  **Login to Supabase CLI:** `supabase login`
3.  **Link your project:** `supabase link --project-ref <your-supabase-project-id>`
4.  **Deploy the function:**
    ```bash
    supabase functions deploy send-email --no-verify-jwt
    ```
    (Ensure `RESEND_API_KEY` or `SENDGRID_API_KEY` and `NEXT_PUBLIC_SUPABASE_FUNCTION_URL` are set as Supabase secrets and in your Vercel environment variables, respectively).

## Troubleshooting & Debugging
-   **Console Logs**: Utilize `console.log` for quick debugging in development.
-   **Supabase Logs**: For issues with database operations or Edge Functions, check the logs directly in your Supabase Dashboard.
-   **Browser Dev Tools**: Use network tab for API calls, console for frontend errors.
-   **Vercel Logs**: For deployed applications, Vercel provides comprehensive logs for both frontend builds and serverless functions (API Routes).
-   **Error Handling**: Implement robust error handling (try-catch blocks) in API routes and client-side code for better debugging and user experience.

## Security Considerations
-   **Row Level Security (RLS)**: Always enable and properly configure RLS on all Supabase tables to prevent unauthorized data access.
-   **Environment Variables**: Never commit sensitive information directly into the codebase. Use `.env.local` and environment variables in deployment platforms.
-   **Input Validation**: Validate all user inputs on both client-side and server-side to prevent injection attacks and data corruption.
-   **CORS**: Ensure CORS policies are correctly configured for API routes and Supabase Edge Functions.
-   **Dependency Audits**: Regularly check for vulnerabilities in project dependencies using tools like `npm audit` or `yarn audit`.

---
_Last updated: December 2025_