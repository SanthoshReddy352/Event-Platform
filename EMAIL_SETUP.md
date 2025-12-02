# EventX — Email Notification Setup Guide

This guide details how to configure email notifications for the EventX platform, primarily utilizing **Supabase Edge Functions** for robust and scalable email delivery.

## 📧 Email Features

The EventX platform is designed to send automated email notifications for various participant and administrator actions:

1.  **Admin Registration Alert**: An email notification sent to the event creator when a new participant successfully registers for their event.
2.  **Participant Approval Email**: An email sent to the participant once their registration has been reviewed and approved by an administrator.
3.  **Participant Rejection Email**: An email sent to the participant if their registration has been reviewed and rejected by an administrator.
4.  **Contact Form Submissions**: Notifications or responses related to the platform's contact form.

## 🚀 Setup Options

### Option A: Supabase Edge Functions (Recommended)

Leveraging Supabase Edge Functions provides a serverless, scalable, and secure way to handle email sending without exposing API keys directly in the client-side application.

**Steps:**

1.  **Install Supabase CLI** (if you haven't already):
    ```bash
    npm install -g supabase-cli
    ```

2.  **Login to Supabase:**
    ```bash
    supabase login
    ```

3.  **Link your local project to your Supabase project:**
    ```bash
    supabase link --project-ref YOUR_SUPABASE_PROJECT_REF
    # Replace YOUR_SUPABASE_PROJECT_REF with your actual Supabase Project ID (e.g., fyisunazyiumzvpetsei)
    ```

4.  **Create the Edge Function:**
    Navigate to the root of your project (where your `supabase` directory is located, e.g., `D:/Hoster/supabase/functions`) and create a new function named `send-email`:
    ```bash
    supabase functions new send-email
    ```
    This command will create a new directory `supabase/functions/send-email` with an `index.ts` file.

5.  **Copy the Email Function Code:**
    Copy the provided TypeScript code (from the `📝 Supabase Edge Function Code` section below) into the newly created `supabase/functions/send-email/index.ts` file. This code handles the logic for sending emails via Resend or SendGrid.

6.  **Set Supabase Secrets (for email service API keys):**
    These secrets are securely stored within Supabase and are accessible only to your Edge Functions. Choose your preferred email provider:

    **Using Resend (Recommended - offers 100 free emails/day):**
    ```bash
    supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx
    ```

    **Using SendGrid (Alternative):**
    ```bash
    supabase secrets set SENDGRID_API_KEY=SG.xxxxxxxxxxxx
    ```
    *Note: You only need to set one of these keys.*

7.  **Deploy the Edge Function:**
    Deploy your `send-email` function to Supabase:
    ```bash
    supabase functions deploy send-email --no-verify-jwt
    ```
    The `--no-verify-jwt` flag allows the function to be called without requiring a JWT token, which is suitable for internal API calls from your Next.js application.

8.  **Update Environment Variables in `.env.local`:**
    Add the URL of your deployed Supabase Edge Function to your `.env.local` file. This URL allows your Next.js application to invoke the email function.

    ```env
    NEXT_PUBLIC_SUPABASE_FUNCTION_URL=https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/functions/v1/send-email
    ```
    Replace `<YOUR_SUPABASE_PROJECT_REF>` with your actual Supabase Project ID.

### Option B: External Email Service Integration (Alternative)

If you prefer to integrate directly with an external email service without using Supabase Edge Functions, you would modify your Next.js API routes or backend logic.

1.  **Install Email SDK:**

    **Using Resend:**
    ```bash
    npm install resend
    # or yarn add resend
    ```

    **Using SendGrid:**
    ```bash
    npm install @sendgrid/mail
    # or yarn add @sendgrid/mail
    ```

2.  **Update Environment Variables in `.env.local`:**
    Add the API key and sender email directly to your `.env.local` for server-side usage in your Next.js API routes.

    **For Resend:**
    ```env
    RESEND_API_KEY=re_xxxxxxxxxxxx
    EMAIL_FROM=EventX <noreply@yourdomain.com>
    ```

    **For SendGrid:**
    ```env
    SENDGRID_API_KEY=SG.xxxxxxxxxxxx
    EMAIL_FROM=EventX <noreply@yourdomain.com>
    ```

3.  **Modify Backend Logic:**
    You would need to update the relevant Next.js API routes (e.g., in `app/api/events/route.js` or `app/api/participants/route.js`) to directly call the Resend or SendGrid SDK for sending emails. This approach requires careful handling of API keys on the server-side.

## 📝 Supabase Edge Function Code

This is the code for `supabase/functions/send-email/index.ts`. Ensure this file is present and correctly deployed.

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')

serve(async (req) => {
  // Handle CORS for preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*', // Adjust for production if needed
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    })
  }

  try {
    const { to, subject, html, from } = await req.json()

    // Validate inputs
    if (!to || !subject || !html) {
      throw new Error('Missing required fields: to, subject, html')
    }

    // Default sender email for EventX
    const defaultFromEmail = 'EventX <noreply@eventx.com>';
    const fromEmail = from || defaultFromEmail;

    // Choose email service based on available API key
    let result

    if (RESEND_API_KEY) {
      // Use Resend service
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [to],
          subject,
          html
        })
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Resend API error: ${error}`)
      }

      result = await response.json()
    } else if (SENDGRID_API_KEY) {
      // Use SendGrid service
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SENDGRID_API_KEY}`
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: fromEmail.match(/<(.+)>/)?.[1] || fromEmail }, // Extract email from "Name <email>" format
          subject,
          content: [{ type: 'text/html', value: html }]
        })
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`SendGrid API error: ${error}`)
      }

      result = { success: true, message: 'Email sent via SendGrid' } // SendGrid API doesn't return body on success
    } else {
      // Fallback if no email service is configured
      console.warn('No email service configured. Email would have been sent with:', { to, subject, html, from: fromEmail });
      result = { success: true, message: 'No email service configured, email logged to console.' };
      // throw new Error('No email service configured. Set RESEND_API_KEY or SENDGRID_API_KEY in Supabase secrets.')
    }

    return new Response(
      JSON.stringify({ success: true, result }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*' // Adjust for production if needed
        }
      }
    )
  } catch (error) {
    console.error('Email Edge Function Error:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*' // Adjust for production if needed
        }
      }
    )
  }
})
```

## 🔑 Getting API Keys

### Resend (Recommended)
1.  Go to `https://resend.com`.
2.  Sign up for a free account.
3.  Navigate to **API Keys** in your dashboard.
4.  Create a new API key.
5.  Copy the generated key (it typically starts with `re_`).

### SendGrid (Alternative)
1.  Go to `https://sendgrid.com`.
2.  Sign up for a free account.
3.  Navigate to **Settings** > **API Keys** in your dashboard.
4.  Create a new API key, ensuring it has at least "Mail Send" permissions.
5.  Copy the generated key (it typically starts with `SG.`).

## ✅ Testing Email Notifications

After completing the setup, perform the following tests to verify email functionality:

1.  **Register for an Event**: As a participant, register for an event that has an admin configured.
2.  **Check Admin Notification**: Verify that the event administrator receives an email notification about the new registration.
3.  **Approve/Reject Registration**: As an admin, navigate to the event's registrations and either approve or reject the participant's application.
4.  **Check Participant Notification**: Verify that the participant receives the appropriate approval or rejection email notification.

## 🐛 Troubleshooting

**Emails are not being sent:**
-   **Supabase Function Logs**: Check the logs for your `send-email` Edge Function in the Supabase Dashboard (`Edge Functions` → `send-email` → `Logs`) or via CLI:
    ```bash
    supabase functions logs send-email
    ```
-   **API Keys**: Double-check that `RESEND_API_KEY` or `SENDGRID_API_KEY` are correctly set as Supabase secrets (`supabase secrets list`).
-   **Environment Variables**: Ensure `NEXT_PUBLIC_SUPABASE_FUNCTION_URL` is correctly set in your `.env.local` and Vercel environment variables.
-   **Spam Folder**: Advise users to check their spam or junk mail folders.
-   **Sender Email**: Confirm the `EMAIL_FROM` address is valid and properly configured with your email service.

**Edge function is not deployed or found:**
-   Verify deployment status using `supabase functions list`.
-   If not deployed, re-run `supabase functions deploy send-email --no-verify-jwt` from the project root.
-   Ensure the `index.ts` file is in `supabase/functions/send-email/`.

**CORS errors when calling the Edge Function:**
-   During development, the Edge Function has `Access-Control-Allow-Origin: *`. For production, you might want to restrict this to your specific domain(s).
-   Ensure your client-side calls to the Edge Function include the correct headers.

## 📚 Additional Resources

-   [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
-   [Resend Documentation](https://resend.com/docs)
-   [SendGrid Documentation](https://docs.sendgrid.com/)

---
_Last updated: December 2025_