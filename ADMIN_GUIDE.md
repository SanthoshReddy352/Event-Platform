# EventX — Admin Guide

## Overview
This document outlines the administrative functionalities within the EventX platform, detailing how authorized personnel can manage events, registrations, user roles, and system configurations. It serves as a comprehensive resource for all administrative tasks.

---

## Roles & Permissions
EventX employs a role-based access control system to define administrative capabilities:

-   **Super Admin**
    -   Possesses full administrative privileges across the entire platform.
    -   Can create, edit, and delete any event.
    -   Manages other administrators and their roles.
    -   Accesses all reports and system-wide analytics.
    -   Configures global platform settings, including payment integrations.
-   **Admin**
    -   Manages events they have created or are assigned to.
    -   Can create, edit, and delete their own events.
    -   Responsible for building registration forms specific to their events.
    -   Reviews and approves/rejects registrations for their events.
    -   Accesses event-specific reports and participant data.
-   **Reviewer**
    -   Has read-only access to registration data.
    -   Can view registration details and export reports.
    -   Cannot create events, modify forms, or change registration statuses.

---

## Creating an Event
To create a new event on the EventX platform:
1.  Navigate to the Admin Dashboard and select **Events**, then click **Create Event**.
2.  Fill in the mandatory event details:
    -   **Title:** The official name of the event.
    -   **Short Description:** A brief, engaging summary visible on event listings.
    -   **Full Description:** Comprehensive details about the event, its agenda, and objectives.
    -   **Start Date & Time:** The exact date and time when the event begins.
    -   **End Date & Time:** The exact date and time when the event concludes.
    -   **Venue:** Specify if the event is **Online** (e.g., webinar link) or **Physical** (e.g., building address).
    -   **Registration Open Date:** The date from which participants can begin registering.
    -   **Registration Close Date:** The final date participants can register.
    -   **Capacity:** The maximum number of participants allowed for the event. Set to 0 for unlimited.
    -   **Visibility:** Choose **Public** to make the event visible to all users, or **Private** for invitation-only access.
    -   **Banner Image:** Upload an attractive banner image to represent your event.
3.  Choose to **Save Draft** to continue working on the event later, or **Publish** to make it live and visible to the public.

---

## Building Registration Forms
The dynamic form builder allows administrators to create customized registration forms for each event:
1.  From the Admin Dashboard, go to **Events**, select your event, then click on **Registration Form**.
2.  **Add Fields:** Choose from various field types:
    -   **Text:** Single-line text input.
    -   **Email:** Email address input with validation.
    -   **Number:** Numeric input.
    -   **Dropdown:** Select from a predefined list of options.
    -   **Checkbox:** Single checkbox for agreement or option selection.
    -   **File Upload:** Allows participants to upload documents or images.
    -   **URL:** Input for web addresses.
    -   **Textarea:** Multi-line text input for longer responses.
    -   **Date:** Date picker.
3.  **Configure Field Validations:**
    -   Set fields as **Required** or **Optional**.
    -   Specify **Maximum Length** for text inputs.
    -   Define **Accepted File Types** for file uploads.
    -   Provide **Options** for Dropdown fields.
4.  **Rearrange Fields:** Use the drag-and-drop interface or "Move Up/Down" buttons to order the fields logically.
5.  **Auto-saving:** Form progress is automatically saved to your browser session to prevent data loss.
6.  **Save Form:** Click **Save Form to Database** to finalize and apply the form to your event.

---

## Managing Registrations
Administrators can oversee participant registrations for their events:
1.  Access the Admin Dashboard, go to **Events**, select your event, then click **Registrations**.
2.  **Filter Registrations:** Use filters to view registrations by status:
    -   **Pending:** Awaiting review and approval.
    -   **Approved:** Registration has been accepted.
    -   **Rejected:** Registration has been denied.
    -   **Cancelled:** Participant cancelled their registration.
3.  **View Details:** Click on any registration entry to view comprehensive details, including submitted form data and uploaded attachments.
4.  **Approve or Reject:** Based on your review, you can **Approve** or **Reject** a registration. An optional comment can be added for clarity, which will be included in the email notification to the participant.
5.  **Export Data:** Export registration data to a CSV file. The export includes essential columns like `registration_id`, `name`, `email`, `status`, and `submitted_at`, along with all custom form fields.

---

## Payment Configuration
The EventX platform supports payment processing via Razorpay. To enable payments for your events:

1.  **Obtain Razorpay Keys**:
    -   Log in to your [Razorpay Dashboard](https://dashboard.razorpay.com/).
    -   Go to **Settings** → **API Keys** → **Generate New Key**.
    -   Copy your `Key ID` and `Key Secret`.

2.  **Configure in EventX**:
    -   Log in to the EventX Admin Dashboard.
    -   Navigate to **Club Profile** (in the navbar).
    -   Scroll down to the **Payment Gateway (Razorpay)** section.
    -   Enter your `Key ID` and `Key Secret`.
    -   Click **Save All Changes**.

3.  **Enable for Events**:
    -   When creating or editing an event, set a **Registration Fee** greater than 0.
    -   The system will automatically use your configured Razorpay keys to process payments for that event.

---

## Club Profile & Branding
Admins can personalize their club's presence on the platform:
-   Each admin can edit their **Club Profile**, including the club's name and description.
-   Admins can **Upload a Club Logo**, which will be displayed on event cards and the homepage, enhancing brand visibility.
-   **Super Admins** have additional capabilities to manage global branding elements such as the site title, favicon, and primary color scheme for the entire platform.

---

## Common Admin Troubleshooting
-   **Registrations Missing?**
    -   Verify the event's capacity. If it's reached, no new registrations will be accepted.
    -   Check the **Registration Open** and **Registration Close** dates to ensure the event is still open for registration.
-   **Payment Failed?**
    -   Ensure you have configured your Razorpay API Keys correctly in the **Club Profile** section.
    -   Verify that your Razorpay account is active and in the correct mode (Test vs Live).
-   **File Uploads Failing?**
    -   Ensure that the allowed file types configured for the form field match the files being uploaded.
    -   Check the available storage quota in Supabase Storage.

---

## System Administration
For backend system administration, primarily managed via the Supabase Dashboard:

-   **Database**: Use the Supabase SQL Editor for schema changes or querying data directly.
-   **Storage**: Manage buckets and files in the Supabase Storage section.
-   **Auth**: Manage users and email templates in the Supabase Authentication section.

---
_Last updated: December 2025_