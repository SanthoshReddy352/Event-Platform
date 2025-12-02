# EventX - College Event Platform 🚀

A modern, full-featured website for managing student club hackathons and tech events with dynamic form builder, admin dashboard, and participant management.

## 🌟 Features

### For Participants
- 📅 **Browse Events** - View upcoming hackathons and tech events.
- 🏠 **Browse by Club** - Filter events by the club that posted them.
- 📝 **Dynamic Registration** - Register with custom forms tailored for each event.
- 🔔 **Status Tracking** - View approval status (Pending/Approved/Rejected).
- 📧 **Notifications** - Receive email updates on registration status.
- 💬 **Contact Organizers** - Reach out to event organizers directly.
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile.
- 💳 **Secure Payments** - Pay for paid events via Razorpay.

### For Admins
- 🔐 **Secure Authentication** - Role-based access via Supabase Auth.
- 👥 **Role Management** - Admin and Super Admin permissions.
- 🏢 **Club Profile** - Manage club identity (name, logo) visible on event cards.
- ✏️ **Event Management** - Create, edit, draft, and publish events.
- 🎨 **Form Builder** - Drag-and-drop builder for custom registration forms.
  - Fields: Text, Email, Number, URL, Dropdown, Checkbox, Textarea, Date, File Upload.
  - Validation: Required/Optional, Max Length, File Types.
  - Reordering: Move fields up/down.
- ✅ **Registration Workflow** - Review, approve, or reject participant applications.
- 📊 **Analytics** - Dashboard with event and participant statistics.
- 📥 **Data Export** - Export participant data to CSV.
- 🖼️ **Banner Management** - Upload event banners via Supabase Storage.
- 💳 **Payment Integration** - Configure Razorpay keys per club.

### For Super Admins
- 🔓 **Full System Access** - Manage all events, clubs, and users.
- 👁️ **Global Oversight** - View and moderate all registrations.
- ⚙️ **System Settings** - Configure global platform settings.

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18
- **Styling**: Tailwind CSS, shadcn/ui components, Framer Motion
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage
- **Payments**: Razorpay
- **Deployment**: Vercel

## 📁 Project Structure

```
/
├── app/
│   ├── (main)/                # Main application routes
│   │   ├── page.js            # Home page
│   │   ├── events/            # Event listing and details
│   │   ├── admin/             # Admin dashboard
│   │   ├── contact/           # Contact page
│   │   ├── profile/           # User profile
│   │   └── registered-events/ # User's registrations
│   ├── api/                   # Backend API routes
│   ├── auth/                  # Authentication pages (Login/Signup)
│   ├── update_password/       # Password reset flow
│   ├── globals.css            # Global styles
│   └── layout.js              # Root layout
├── components/                # Reusable UI components
│   ├── ui/                    # shadcn/ui primitives
│   └── ...                    # Custom components (Navbar, EventCard, etc.)
├── lib/                       # Utilities and configurations
│   ├── supabase/              # Supabase client/server setup
│   └── utils.js               # Helper functions
├── public/                    # Static assets
├── supabase/                  # Supabase functions and config
├── tests/                     # Test files
├── .env.local                 # Environment variables
├── package.json               # Dependencies and scripts
└── README.md                  # Project documentation
```

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+
- Yarn or npm
- Supabase account

### 2. Database Setup
1.  Log in to [Supabase Dashboard](https://supabase.com/dashboard).
2.  Create a new project.
3.  Go to **SQL Editor**.
4.  Copy the content of `SUPABASE_SETUP.sql` from this project.
5.  Run the script to create tables, policies, and buckets.

### 3. Environment Variables
Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

### 4. Install & Run
```bash
# Install dependencies
yarn install

# Run development server
yarn dev
```
Visit http://localhost:3000

### 5. Create Admin User
1.  Sign up a new user in the app or create one in Supabase Auth.
2.  In Supabase Database, add a row to `admin_users` table linking the `user_id` to a role (`admin` or `super_admin`).

## 📚 Documentation
- [Setup Instructions](SETUP_INSTRUCTIONS.md)
- [Developer Guide](DEVELOPER_GUIDE.md)
- [Admin Guide](ADMIN_GUIDE.md)
- [User Guide](USER_GUIDE.md)

## 📄 License
MIT License

_Last updated: December 2025_