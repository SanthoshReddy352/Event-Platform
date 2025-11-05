# IEEE Club Hackathon Website - Admin Guide

## 🛡️ For Admins and Super Admins

Complete guide for managing events, reviewing registrations, and administering the IEEE Club platform.

---

## 🔑 Understanding Roles

### Admin (Normal Admin)
**Permissions:**
- ✅ Create events
- ✅ Edit/delete **own** events only
- ✅ Build custom forms for **own** events
- ✅ View participants for **own** events
- ✅ Approve/reject registrations for **own** events
- ❌ Cannot modify other admins' events

### Super Admin
**Permissions:**
- ✅ All Admin permissions
- ✅ Edit/delete **ANY** event (created by any admin)
- ✅ View participants for **ALL** events
- ✅ Approve/reject registrations for **ALL** events
- ✅ Manage admin users
- ✅ System-wide oversight

---

## 🚀 Getting Started

### 1. Logging In

1. Navigate to `/admin/login`
2. Enter your admin email and password
3. Click **"Login"**
4. You'll be redirected to the Admin Dashboard

### 2. Admin Dashboard Overview

The dashboard shows:
- **My Events** - Number of events you created (or all events for Super Admin)
- **Active Events** - Currently running events
- **Total Registrations** - All participant registrations
- **Pending Approvals** - Registrations awaiting your review

**Quick Actions:**
- Manage Events
- Review Registrations
- View Participants

---

## 📅 Event Management

### Creating a New Event

1. **Navigate to Events**
   - Dashboard → **"Manage Events"** → **"Create Event"**

2. **Fill Event Details**
   - **Title** - Event name (required)
   - **Description** - Detailed event information
   - **Event Date** - Start date and time
   - **Event End Date** - End date and time
   - **Banner** - Upload image or provide URL

3. **Registration Settings**
   - **Registration Start** - When registration opens
   - **Registration End** - Registration deadline
   - **Active** - Toggle event visibility
   - **Registration Open** - Toggle registration availability

4. **Save Event**
   - Click **"Create Event"**
   - You'll be redirected to the events list

### Building Custom Registration Forms

After creating an event:

1. **Access Form Builder**
   - Events list → Click event → **"Form"** button

2. **Add Form Fields**
   - Click **"Add Field"**
   - Choose field type:
     - **Text** - Short text input
     - **Email** - Email validation
     - **Number** - Numeric input
     - **URL** - Website link
     - **Dropdown** - Multiple choice (provide options)
     - **Checkbox** - Yes/No or multi-select
     - **Textarea** - Long text
     - **Date** - Date picker

3. **Configure Each Field**
   - **Label** - Question text
   - **Required** - Make field mandatory
   - **Options** - For dropdown/checkbox (comma-separated)

4. **Reorder Fields**
   - Use drag handles to reorder
   - Or use move up/down buttons

5. **Save Form**
   - Click **"Save Form"**
   - Form is now live for participants

**Form Building Tips:**
- Start with essential fields (Name, Email)
- Keep forms concise
- Use clear, specific labels
- Test your form before publishing

### Editing Events

1. Navigate to **"Manage Events"**
2. Click **"Edit"** on the event card
3. Modify event details
4. Click **"Update Event"**

**Note:** Only the event creator or Super Admin can edit events.

### Deleting Events

1. Navigate to **"Manage Events"**
2. Click **"Delete"** on the event card
3. Confirm deletion
4. Event and all associated data will be removed

⚠️ **Warning:** Deletion is permanent and cannot be undone!

---

## 👥 Registration Management

### Viewing Pending Registrations

1. **From Dashboard**
   - Click **"Review Registrations"** card
   - Or click **"Review Now"** on the pending approvals alert

2. **Filter Registrations**
   - **Pending** - Awaiting your review
   - **Approved** - Already approved
   - **Rejected** - Already rejected
   - **All** - View all statuses

3. **Review Participant Details**
   - Each card shows:
     - Event name
     - Registration date
     - All form responses
     - Current status

### Approving Registrations

1. Find the pending registration
2. Review participant responses carefully
3. Click **"Approve"** button
4. Confirmation dialog appears
5. Click **"OK"** to confirm
6. Participant receives approval email automatically

**Approval Checklist:**
- ✅ All required information provided
- ✅ Information appears legitimate
- ✅ Meets event requirements
- ✅ No duplicate registrations

### Rejecting Registrations

1. Find the pending registration
2. Review the reason for rejection
3. Click **"Reject"** button
4. Confirm the rejection
5. Participant receives rejection email
6. They can re-register with corrected information

**Valid Rejection Reasons:**
- Incomplete information
- Doesn't meet eligibility requirements
- Duplicate registration
- Capacity reached
- Incorrect or invalid information

### Viewing Event Participants

1. **Navigate to Events**
2. Click **"Participants"** on event card
3. View all registrations for that event

**Participant List Shows:**
- Participant name
- Registration date
- Status (Pending/Approved/Rejected)
- All form responses

**Export to CSV:**
- Click **"Export CSV"** button
- Download participant data
- Use for offline analysis or mailing lists

---

## 📊 Dashboard Analytics

### For Normal Admins
- **My Events** - Events you created
- **Active Events** - Your active events
- **Total Registrations** - Registrations for your events
- **Pending Approvals** - Pending registrations for your events

### For Super Admins
- **All Events** - System-wide event count
- **Active Events** - All active events across all admins
- **Total Registrations** - All registrations system-wide
- **Pending Approvals** - All pending registrations

---

## 📧 Email Notifications

### Admins Receive Emails For:
- 🔔 **New Registration** - When someone registers for your event

### Participants Receive Emails For:
- ✅ **Registration Approved** - When you approve their registration
- ❌ **Registration Rejected** - When you reject their registration

**Email Setup:**
- See `EMAIL_SETUP.md` for configuration
- Emails are logged to console if not configured
- Registration system works without email (manual notification)

---

## ⚡ Best Practices

### Event Creation
1. **Plan Ahead**
   - Create events well in advance
   - Set realistic registration deadlines
   - Allow buffer time for approvals

2. **Clear Descriptions**
   - Include all essential details
   - Mention eligibility requirements
   - Provide contact information

3. **Form Design**
   - Only ask for necessary information
   - Use appropriate field types
   - Test forms before publishing

### Registration Review
1. **Timely Reviews**
   - Review registrations within 24-48 hours
   - Don't let approvals pile up
   - Participants are waiting!

2. **Fair Evaluation**
   - Review each registration objectively
   - Apply consistent criteria
   - Document rejection reasons (mentally)

3. **Communication**
   - Email system handles notifications
   - For special cases, use contact form
   - Be professional and courteous

### Event Management
1. **Monitor Capacity**
   - Track registration numbers
   - Close registration when full
   - Update event status accordingly

2. **Keep Information Current**
   - Update event details if plans change
   - Notify registered participants of changes
   - Maintain accurate dates and times

---

## 🔒 Security and Privacy

### Data Protection
- Participant data is confidential
- Only share with authorized personnel
- Use CSV export responsibly
- Follow data protection regulations (GDPR, etc.)

### Account Security
- Use strong passwords
- Don't share admin credentials
- Log out when finished
- Report suspicious activity

---

## 🛠️ Troubleshooting

### Can't Edit/Delete an Event
**Problem:** Edit/Delete buttons are disabled
**Solution:** 
- You can only edit/delete your own events (unless Super Admin)
- Check if you created the event
- Contact Super Admin if needed

### Participants Not Receiving Emails
**Problem:** Approval/rejection emails not arriving
**Solution:**
1. Verify email service is configured (see EMAIL_SETUP.md)
2. Check participant's spam folder
3. Verify email address is correct
4. Manually notify participant if needed

### Form Not Saving
**Problem:** Custom form changes not persisting
**Solution:**
1. Ensure all fields have labels
2. Check for validation errors
3. Try refreshing and re-saving
4. Check browser console for errors

### Registrations Not Showing
**Problem:** Can't see event registrations
**Solution:**
- Ensure you're logged in as admin
- Verify you have permission for this event
- Check if any registrations exist
- Try refreshing the page

---

## 📈 Event Workflow

### Complete Event Lifecycle:

1. **Planning Phase**
   - ✅ Create event
   - ✅ Build registration form
   - ✅ Set registration dates
   - ✅ Upload banner
   - ✅ Publish event (set active = true)

2. **Registration Phase**
   - ✅ Monitor new registrations
   - ✅ Review and approve/reject promptly
   - ✅ Track capacity
   - ✅ Respond to inquiries

3. **Pre-Event Phase**
   - ✅ Close registration when deadline passes
   - ✅ Export participant list
   - ✅ Send final communications
   - ✅ Prepare event materials

4. **Event Day**
   - ✅ Check in participants
   - ✅ Manage event activities
   - ✅ Handle on-site issues

5. **Post-Event**
   - ✅ Mark event as inactive
   - ✅ Collect feedback
   - ✅ Archive participant data
   - ✅ Plan next event!

---

## 💡 Pro Tips

1. **Use Templates**
   - Save successful form designs
   - Reuse for similar events
   - Maintain consistency

2. **Batch Processing**
   - Review multiple registrations at once
   - Use filters effectively
   - Export data for analysis

3. **Communication**
   - Set expectations in event description
   - Mention approval process
   - Provide contact information

4. **Monitoring**
   - Check dashboard daily
   - Respond to pending approvals quickly
   - Stay on top of registrations

---

## 📞 Getting Help

### For Technical Issues
- Check DEVELOPER_GUIDE.md for technical details
- Review troubleshooting section
- Contact system administrator
- Check browser console for errors

### For Policy Questions
- Contact IEEE Club leadership
- Review institutional guidelines
- Consult with co-admins

---

## 🎯 Success Metrics

Track these metrics for successful events:
- **Registration Rate** - Signups vs. capacity
- **Approval Rate** - Approved vs. total registrations
- **Time to Approval** - Average review time
- **Participant Satisfaction** - Post-event feedback
- **Event Completion Rate** - Registered vs. attended

---

**Happy Event Managing! 🎉**

For platform support, refer to DEVELOPER_GUIDE.md or contact your system administrator.
