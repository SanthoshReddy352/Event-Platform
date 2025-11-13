# EventX - College Event Platform 🚀

A modern, full-featured website for managing student club hackathons and tech events with dynamic form builder, admin dashboard, and participant management.

## 🌟 Features

### For Participants
- 📅 Browse upcoming hackathons and events
- 🏠 **Browse by Club** - Filter events by the club that posted them.
- 📝 Register with custom dynamic forms per event
- 🔔 **Registration Status Tracking** - View approval status (Pending/Approved/Rejected)
- 📧 Email notifications for registration approval/rejection
- 💬 Contact form to reach organizers
- 📱 Fully responsive design

### For Admins
- 🔐 Secure authentication (Supabase Auth)
- 👥 **Role-based Access Control** - Admin vs Super Admin permissions
- 🏢 **Club Profile Management** - Admins can update their club's name and logo, which appears on the homepage and event cards.
- ✏️ **Draft/Publish Workflow** - Events are created as "drafts" (inactive) by default and must be manually "published" (set to active) to become visible to the public.
- 🎨 **Dynamic Form Builder** - Create custom registration forms per event
  - Support for: text, email, number, URL, dropdown, checkbox, textarea, date fields
  - Field validation (required/optional)
  - **Field Reordering** with "Move Up/Down" buttons.
  - **Auto-saving** to session storage to prevent data loss.
- ✅ **Registration Approval Workflow**
  - Review pending registrations.
  - **User-Friendly Details:** View participant submissions in a clean dialog that shows field labels in the correct order.
  - Approve or reject applications
  - Track approval history
- 📊 **Enhanced Dashboard** - Role-specific analytics
- 📧 **Email Notifications** - Automated emails for admin alerts and participant status changes.
- 📥 Export participant data to CSV
- 🖼️ Upload event banners (Supabase Storage) or use URLs

### For Super Admins
- 🔓 Full system access - manage ALL events and clubs
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
6. This will create all necessary tables, policies, and storage buckets (`event-banners`, `club-logos`).

### 2. Environment Variables

Already configured in `.env.local`:
```env
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

Go to your Supabase Dashboard → Authentication → Users

Click "Add user" → "Create new user"

Enter email and password

Click "Create user"

This user can now login to the admin dashboard at `/admin/login`.

## 📁 Project Structure
```
/app
├── app/
│   ├── page.js                    # Home page
│   ├── layout.js                  # Root layout
│   ├── globals.css                # Global styles
│   │
│   ├── events/
│   │   ├── page.js                # All events listing
│   │   └── [id]/page.js           # Event detail + registration
│   │
│   ├── admin/
│   │   ├── page.js                # Admin dashboard
│   │   ├── login/page.js          # Admin login
│   │   ├── club-profile/page.js   # Admin's club profile
│   │   ├── events/
│   │   │   ├── page.js            # Manage events
│   │   │   ├── new/page.js        # Create event
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
4. Reorder fields using the "Move Up" / "Move Down" buttons.
5. Auto-Save: Your work is automatically saved to your browser session. If you refresh, the form will still be there.
6. Click "Save Form to Database" to make it final.

### Club Profile Management
Normal admins (non-super-admins) can visit the "Club Profile" link in the navbar.

On this page, they can set their Club Name and Upload a Club Logo.

This information is then displayed on the homepage and on all EventCard components for events they create.

## 🔒 Security
- Row Level Security (RLS) enabled on all tables
- Authenticated-only access to admin features
- Public read for `is_active` events
- Service role key used only on server-side
- CORS configured properly

## 📊 Database Tables
- `events`
  - `id`, `title`, `description`, `banner_url`
  - `event_date`, `is_active` (defaults to false)
  - `registration_open`, `form_fields` (JSONB)
  - `created_at`, `created_by` (FK to `auth.users`)
- `participants`
  - `id`, `event_id` (FK), `user_id` (FK)
  - `responses` (JSONB) - stores form submission data
  - `status` ('pending', 'approved', 'rejected')
  - `created_at`, `reviewed_by`, `reviewed_at`
- `admin_users`
  - `user_id` (PK, FK to `auth.users`), `role` ('admin', 'super_admin')
  - `club_name` (TEXT)
  - `club_logo_url` (TEXT)
- `contact_submissions`
  - `id`, `name`, `email`, `message`, `created_at`
- `profiles`
  - `id` (PK, FK to `auth.users`), `name`, `phone_number`

## 🐛 Troubleshooting
- **"Relation does not exist" error**
  - Make sure you ran `SUPABASE_SETUP.sql` in Supabase SQL Editor
- **Can't login as admin**
  - Create user in Supabase Dashboard → Authentication → Users
  - Ensure the user's `user_id` is added to the `admin_users` table (this is not automatic).
- **Images not uploading**
  - Check storage buckets exist: `event-banners` and `club-logos`.

## 🚀 Deployment
### Vercel Deployment
1. Push to GitHub
2. Import project in Vercel
3. Add environment variables from `.env.local`
4. Deploy!

## 📝 API Endpoints
| Endpoint                 | Method | Description                                  |
|--------------------------|--------|----------------------------------------------|
| `/api/clubs`             | GET    | Get all clubs with profiles                  |
| `/api/events`            | GET    | Get all events (add `?active=true` for public) |
| `/api/events`            | POST   | Create event (Admin)                         |
| `/api/events/:id`        | GET    | Get single event                             |
| `/api/events/:id`        | PUT    | Update event (Admin)                         |
| `/api/events/:id`        | DELETE | Delete event (Admin)                         |
| `/api/participants`      | POST   | Register participant                         |
| `/api/participants/:eventId` | GET    | Get event participants (Admin)               |
| `/api/participants/pending` | GET    | Get pending registrations (Admin)            |
| `/api/participants/count` | GET    | Get total participant count                  |
| `/api/participants/:id/approve` | PUT    | Approve registration (Admin)                 |
| `/api/participants/:id/reject` | PUT    | Reject registration (Admin)                  |
| `/api/profile`           | GET    | Get user profile                             |
| `/api/profile`           | PUT    | Update user profile                          |
| `/api/contact`           | POST   | Submit contact form                          |

## 🔄 Future Enhancements
Potential features for future releases:

- [ ] Payment integration (Razorpay/Stripe)
- [ ] Certificate generation
- [ ] Results/leaderboard system
- [ ] Team management
- [ ] Event check-in system
- [ ] SMS notifications

## 📄 License
MIT License - Feel free to use for your club!