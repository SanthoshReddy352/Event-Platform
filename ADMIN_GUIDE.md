# EventX — Admin Guide (Copy‑Paste Ready)

## Overview
This document explains how EventX administrators manage events, registrations, payments, forms, and users. Copy any section below directly into your project docs or admin panel help.

---

## Roles & Permissions
- **Super Admin**
  - Full access: create/edit/delete any event, manage admins, access all reports, configure payments.
- **Admin**
  - Create/edit/delete events they own, create registration forms for their events, view/approve registrations for their events.
- **Reviewer**
  - Read-only access to view registrations and export reports (no event creation).

---

## Creating an Event
```
1. Go to Admin Dashboard → Events → Create Event
2. Fill required fields:
   - Title, Short description, Full description
   - Start date & time, End date & time
   - Venue (Online / Physical)
   - Registration open & close dates
   - Capacity (max participants)
   - Visibility (Public / Private)
3. Save Draft or Publish
```

---

## Building Registration Forms
```
1. Admin Dashboard → Events → [Your Event] → Registration Form.
2. Add fields (Text, Email, Number, Dropdown, Checkbox, File Upload)
3. Set field validations (required, max length, accepted file types)
4. Rearrange fields by drag & drop
5. Save Form
```

---

## Managing Registrations
```
1. Admin Dashboard → Events → [Your Event] → Registrations
2. Filter by status: Pending, Approved, Rejected, Cancelled
3. Click on a registration to view details and attachments
4. Approve or Reject with optional comment
5. Export CSV (columns: registration_id, name, email, status, submitted_at)
```

---

## Payments (Admin Control)
- Payments are handled via Razorpay (config in Settings → Payments).
- Admins with payment rights can:
  - Enable/Disable payments per event
  - Set fee amount and currency
  - Issue refunds (subject to platform policy)
- Recommended flow:
  1. Configure Razorpay keys in Settings (test keys for staging).
  2. Enable 'Require Payment' on event-level if the event is paid.
  3. Use the Admin Payments Dashboard to view transactions and issue refunds.

---

## Club Profile & Branding
- Each admin can edit their club profile (name, description, logo).
- Super Admin can manage global branding (site title, favicon, primary colors).

---

## Common Admin Troubleshooting
- Registrations missing? Check event capacity and registration dates.
- Payment failed? Verify Razorpay keys and inspect transaction logs.
- File uploads failing? Confirm allowed file types and storage quotas.

---

## Useful CLI Commands (for system admins)
```
# run migrations
python manage.py migrate

# create superuser
python manage.py createsuperuser

# run tests
python manage.py test

# collect static files
python manage.py collectstatic --noinput
```

---
_Last updated: 2025-11-11