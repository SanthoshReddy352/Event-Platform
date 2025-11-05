# IEEE Club Hackathon Website 🚀

A modern, full-featured website for managing IEEE Club hackathons and tech events with dynamic form builder, admin dashboard, and participant management.

## 🌟 Features

### For Participants
- 📅 Browse upcoming hackathons and events
- 📝 Register with custom dynamic forms per event
- 🔔 **Registration Status Tracking** - View approval status (Pending/Approved/Rejected)
- 📧 Email notifications for registration approval/rejection
- 💬 Contact form to reach organizers
- 📱 Fully responsive design

### For Admins
- 🔐 Secure authentication (Supabase Auth)
- 👥 **Role-based Access Control** - Admin vs Super Admin permissions
- ✏️ Create/Edit/Delete events (own events only for Admins)
- 🎨 **Dynamic Form Builder** - Create custom registration forms per event
  - Support for: text, email, number, URL, dropdown, checkbox, textarea, date fields
  - Field validation (required/optional)
  - Forms stored as JSON schema
- ✅ **Registration Approval Workflow**
  - Review pending registrations
  - Approve or reject applications
  - Track approval history
- 📊 **Enhanced Dashboard** - Role-specific analytics
  - My Events count
  - Pending approvals alert
  - Total registrations
  - Active events tracking
- 📧 **Email Notifications** - Automated emails for:
  - Admin notification on new registration
  - Participant approval/rejection
- 📥 Export participant data to CSV
- 🖼️ Upload event banners (Supabase Storage) or use URLs
- ⚡ Toggle event visibility and registration status

### For Super Admins
- 🔓 Full system access - manage ALL events
- 👁️ View and approve registrations for any event
- 📊 System-wide analytics and oversight

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18
- **Styling**: Tailwind CSS + shadcn/ui components
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage
- **Hosting**: Vercel-ready

## 📋 Prerequisites

- Node.js 18+ and Yarn
- Supabase account and project
- (Already configured in this project)

## 🚀 Quick Start

### 1. Database Setup

**IMPORTANT: Run this first!**

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to your project
3. Go to SQL Editor (left sidebar)
4. Copy the entire content of `SUPABASE_SETUP.sql` file
5. Paste and run it in the SQL Editor
6. This will create all necessary tables, policies, and storage buckets

### 2. Environment Variables

Already configured in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

### 3. Install & Run

```bash
# Install dependencies
yarn install

# Run development server
yarn dev
```

Visit: http://localhost:3000

### 4. Create Admin Account

**IMPORTANT: Create your first admin user**

1. Go to your Supabase Dashboard → Authentication → Users
2. Click "Add user" → "Create new user"
3. Enter email and password
4. Click "Create user"
5. This user can now login to the admin dashboard

**OR** Use the signup feature on `/admin/login` page (if enabled)

## 📁 Project Structure

```
/app
├── app/
│   ├── page.js                    # Home page
│   ├── layout.js                  # Root layout
│   ├── globals.css                # Global styles
│   ├── events/
│   │   ├── page.js                # All events listing
│   │   └── [id]/page.js           # Event detail + registration
│   ├── admin/
│   │   ├── page.js                # Admin dashboard
│   │   ├── login/page.js          # Admin login
│   │   ├── events/
│   │   │   ├── page.js            # Manage events
│   │   │   ├── new/page.js        # Create new event
│   │   │   └── [id]/
│   │   │       ├── page.js        # Edit event
│   │   │       └── form-builder/page.js  # Form builder
│   │   └── participants/
│   │       └── [eventId]/page.js  # View participants
│   ├── contact/page.js            # Contact page
│   └── api/
│       └── [[...path]]/route.js   # All API endpoints
├── components/
│   ├── Navbar.js                  # Navigation bar
│   ├── Footer.js                  # Footer
│   ├── EventCard.js               # Event card component
│   ├── DynamicForm.js             # Dynamic form renderer
│   ├── FormBuilder.js             # Form builder for admins
│   └── ProtectedRoute.js          # Auth wrapper
├── lib/
│   ├── supabase/
│   │   ├── client.js              # Client-side Supabase
│   │   └── server.js              # Server-side Supabase
│   └── utils.js                   # Utility functions
└── SUPABASE_SETUP.sql             # Database schema

```

## 🎯 Key Features Explained

### Dynamic Form Builder

Admins can create custom registration forms for each event:

1. Go to Admin → Events → Click event → "Edit Form"
2. Add fields: text, email, number, URL, dropdown, checkbox, textarea, date
3. Set field properties (label, required, options for dropdown)
4. Save - form is stored as JSON
5. Participants see and fill the custom form when registering

**Form Schema Example:**
```json
[
  {
    "id": "field-1",
    "type": "text",
    "label": "Team Name",
    "required": true
  },
  {
    "type": "dropdown",
    "label": "Team Size",
    "options": ["1-2", "3-4", "5+"],
    "required": true
  }
]
```

### File Upload

Two modes for event banners:
1. **Upload**: Direct file upload to Supabase Storage
2. **URL**: Paste external image URL

### CSV Export

Export participant data for any event:
- Click "Export CSV" on participants page
- Downloads all responses in CSV format
- Great for offline analysis

## 🔒 Security

- Row Level Security (RLS) enabled on all tables
- Authenticated-only access to admin features
- Public read for events
- Service role key used only on server-side
- CORS configured properly

## 🎨 Customization

### Colors (IEEE Brand)

Edit `tailwind.config.js` to customize:
```js
colors: {
  'ieee-blue': '#00629B',
  'ieee-gold': '#FFD700',
}
```

### Add More Field Types

Edit `components/FormBuilder.js` and `components/DynamicForm.js` to add new field types.

## 📊 Database Tables

### events
- id, title, description, banner_url
- event_date, is_active, registration_open
- form_fields (JSONB) - stores custom form schema
- created_at, updated_at

### participants
- id, event_id (FK)
- responses (JSONB) - stores form submission data
- created_at

### contact_submissions
- id, name, email, message
- created_at

## 🐛 Troubleshooting

### "Relation does not exist" error
- Make sure you ran `SUPABASE_SETUP.sql` in Supabase SQL Editor

### Can't login as admin
- Create user in Supabase Dashboard → Authentication → Users

### Images not uploading
- Check storage bucket exists: Supabase Dashboard → Storage
- Verify bucket name is `event-banners`

### API errors
- Check `.env.local` has correct Supabase credentials
- Restart dev server after env changes: `yarn dev`

## 🚀 Deployment

### Vercel Deployment

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables from `.env.local`
4. Deploy!

### Environment Variables for Production
```
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

## 📝 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/events` | GET | Get all events |
| `/api/events` | POST | Create event |
| `/api/events/:id` | GET | Get single event |
| `/api/events/:id` | PUT | Update event |
| `/api/events/:id` | DELETE | Delete event |
| `/api/participants` | POST | Register participant |
| `/api/participants/:eventId` | GET | Get event participants |
| `/api/contact` | POST | Submit contact form |
| `/api/upload` | POST | Upload banner image |

## 🎓 IEEE Club Info

This website is designed for IEEE Student Branches to:
- Host 24-hour hackathons
- Manage tech workshops and competitions
- Collect custom registration data
- Build community engagement

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review Supabase dashboard for errors
3. Check browser console for frontend errors
4. Check API responses in Network tab

## 📋 Recent Updates (v2.0)

### ✅ Implemented
- ✅ **Registration Approval Workflow** - Admins review and approve/reject registrations
- ✅ **Email Notifications** - Automated emails for approvals, rejections, and admin alerts
- ✅ **Role-based Permissions** - Super Admin vs Admin access control
- ✅ **Enhanced Dashboard** - Role-specific stats and pending approvals
- ✅ **Registration Status Display** - Participants see their application status
- ✅ **Comprehensive Documentation** - USER_GUIDE.md, ADMIN_GUIDE.md, DEVELOPER_GUIDE.md

## 🔄 Future Enhancements

Potential features for future releases:
- [ ] Payment integration (Razorpay/Stripe)
- [ ] Certificate generation
- [ ] Results/leaderboard system
- [ ] Team management
- [ ] Multi-language support
- [ ] Event check-in system
- [ ] SMS notifications

## 📄 License

MIT License - Feel free to use for your IEEE club!

---

Built with ❤️ for IEEE Student Branches
