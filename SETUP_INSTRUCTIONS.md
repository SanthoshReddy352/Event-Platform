# EventX — Setup & Deployment Instructions

## Overview
This document provides comprehensive instructions for setting up and deploying the EventX platform, designed specifically for a Next.js frontend with Supabase as the backend-as-a-service. It covers local development, production deployment using Vercel and Supabase, and essential operational considerations.

---

## Prerequisites
Before you begin, ensure you have the following installed and configured:

-   **Node.js**: Version 18 or higher.
-   **Yarn** or **npm**: A package manager for JavaScript (Yarn recommended).
-   **Git**: Version control system.
-   **Supabase Account and Project**: An active Supabase project.
-   **Vercel Account**: For production deployment.
-   **Supabase CLI**: For managing Supabase Edge Functions and local database development. Install globally: `npm install -g supabase`.

---

## Quick Local Setup
Follow these steps to get EventX running on your local development machine:

1.  **Clone the Repository**:
    ```bash
    git clone <your-repository-url>
    cd EventX
    ```

2.  **Database Setup (Supabase)**:
    -   Go to your [Supabase Dashboard](https://supabase.com/dashboard).
    -   Navigate to your project.
    -   Go to **SQL Editor** (left sidebar).
    -   Copy the entire content of the `SUPABASE_SETUP.sql` file from your project's root directory.
    -   Paste and run this SQL script in the Supabase SQL Editor. This will create all necessary tables, configure Row Level Security (RLS) policies, and set up storage buckets (`event-banners`, `club-logos`).

3.  **Environment Variables**:
    -   Create a local environment file by copying the example:
        ```bash
        cp .env.local.example .env.local
        ```
    -   Edit the newly created `.env.local` file with your Supabase project credentials. You can find these in your Supabase Dashboard under `Project Settings` → `API`.
        ```env
        NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
        NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
        SUPABASE_SERVICE_ROLE_KEY=eyJ...

        # Optional: For email notifications (if using Supabase Edge Function)
        NEXT_PUBLIC_SUPABASE_FUNCTION_URL=https://<your-project-ref>.supabase.co/functions/v1/send-email
        RESEND_API_KEY=re_xxxxxxxxxxxx # Or SENDGRID_API_KEY if using SendGrid
        EMAIL_FROM="EventX <noreply@eventx.com>"
        ```
    -   For `RESEND_API_KEY` or `SENDGRID_API_KEY`, ensure these are also set as [Supabase Secrets](https://supabase.com/docs/guides/functions/secrets) if you are using the Supabase Edge Function for email.

4.  **Install Dependencies**:
    ```bash
    yarn install
    # or npm install
    ```

5.  **Run Development Server**:
    ```bash
    yarn dev
    # or npm run dev
    ```
    Your application will be available at `http://localhost:3000`.

6.  **Create Admin Account**:
    -   Go to your Supabase Dashboard → `Authentication` → `Users`.
    -   Click "Add user" and create a new user with an email and password.
    -   To grant this user administrative access, you **must** manually add their `user_id` (from Supabase Auth) to the `admin_users` table in your Supabase database, assigning them a `role` (e.g., `'admin'` or `'super_admin'`). This user can then log in to the admin dashboard at `/admin/login`.

---

## Production Deployment

EventX is designed for seamless deployment on Vercel and relies on Supabase for its backend services.

### Vercel Deployment (Frontend & API Routes)

1.  **Push to Git Repository**: Ensure your project is pushed to a Git provider (e.g., GitHub, GitLab, Bitbucket).
2.  **Import Project to Vercel**:
    -   Log in to your [Vercel account](https://vercel.com/).
    -   Import your Git repository as a new project. Vercel will automatically detect it as a Next.js application.
3.  **Configure Environment Variables**:
    -   In your Vercel project settings, navigate to `Settings` → `Environment Variables`.
    -   Add all the variables from your `.env.local` file (e.g., `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_FUNCTION_URL`).
    -   **Important**: Ensure sensitive variables like `SUPABASE_SERVICE_ROLE_KEY` are marked as **Server-side only** for security.
4.  **Deploy**: Vercel will automatically build and deploy your application. Subsequent pushes to your configured Git branch will trigger automatic re-deployments.
5.  **Custom Domain & HTTPS**: Configure your custom domain and Vercel will automatically provision HTTPS certificates (Let's Encrypt).

### Supabase Edge Functions Deployment (for Email Notifications)

If you are using the Supabase Edge Function for email notifications (`send-email`):

1.  **Link Supabase CLI**: From your local project root:
    ```bash
    supabase login
    supabase link --project-ref <your-supabase-project-id>
    ```
2.  **Deploy Function**:
    ```bash
    supabase functions deploy send-email --no-verify-jwt
    ```
    Ensure your `RESEND_API_KEY` or `SENDGRID_API_KEY` is set as a Supabase Secret in your Supabase Dashboard under `Edge Functions` -> `Secrets`.

---

## Backups & Monitoring

### Database Backups (Supabase)
-   **Automated Backups**: Supabase automatically performs daily backups of your PostgreSQL database. You can access these backups from your Supabase Dashboard.
-   **Manual Backups**: For critical data changes or before major deployments, perform manual database dumps:
    ```bash
    supabase db dump -f backup.sql
    # You can then store this file securely, e.g., in a cloud storage bucket.
    ```
    Consider setting up a routine to download these backups to an external storage solution like AWS S3 or Google Cloud Storage.

### Application Monitoring
-   **Vercel Analytics & Logs**: Vercel provides built-in analytics and extensive logging for your frontend and API routes. Use these to monitor application performance, errors, and API usage.
-   **Supabase Monitoring**: The Supabase Dashboard offers real-time monitoring for your database performance, API requests, authentication, and storage usage.
-   **Error Tracking**: Integrate an error tracking service (e.g., Sentry, Bugsnag) to capture and report errors in your Next.js application and API routes.
-   **Alerting**: Set up alerts in Vercel and Supabase for critical events such as high error rates, low storage, or database performance degradation.

---
_Last updated: 2024-07-30_