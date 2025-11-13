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

## Payments (Future Enhancement)
The EventX platform is designed with future payment integration in mind. Currently, payment processing features are under development.

-   **Current Status:** Payment integration is a planned feature (e.g., Razorpay/Stripe).
-   **Future Capabilities:** Once implemented, admins with appropriate permissions will be able to:
    -   Enable/Disable payment requirements for individual events.
    -   Set event fees and currency.
    -   Manage transactions and initiate refunds (subject to the platform's payment gateway policy).
-   **Recommended Flow (Planned):**
    1.  Configure payment gateway API keys in **Settings → Payments**.
    2.  Enable 'Require Payment' on an event-by-event basis.
    3.  Utilize the Admin Payments Dashboard to monitor transactions and manage refunds.

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
-   **Payment Failed?** (Once implemented)
    -   Confirm that the payment gateway (e.g., Razorpay) API keys are correctly configured in the system settings.
    -   Review payment transaction logs for specific error messages from the payment gateway.
-   **File Uploads Failing?**
    -   Ensure that the allowed file types configured for the form field match the files being uploaded.
    -   Check the available storage quota in Supabase Storage.

---

## Useful CLI Commands (for Backend System Admins)
These commands are typically run by system administrators managing the backend infrastructure.
```/dev/null/command_line#L1-10
# Apply database migrations after schema changes
python manage.py migrate

# Create a superuser account for backend administration
python manage.py createsuperuser

# Run all backend tests to ensure system integrity
python manage.py test

# Collect static files for deployment (e.g., CSS, JavaScript, images)
python manage.py collectstatic --noinput
```

---
_Last updated: 2024-07-30