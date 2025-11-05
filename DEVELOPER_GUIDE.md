# IEEE Club Hackathon Website - Developer Guide

## 🛠️ Technical Documentation

Complete technical reference for developers working on the IEEE Club platform.

---

## 📚 Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Setup & Installation](#setup--installation)
4. [Database Schema](#database-schema)
5. [API Documentation](#api-documentation)
6. [Authentication & Authorization](#authentication--authorization)
7. [Features Implementation](#features-implementation)
8. [Deployment](#deployment)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)

---

## 🏗️ Tech Stack

### Frontend
- **Framework:** Next.js 14 (App Router)
- **React:** 18
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui (Radix UI)
- **State Management:** React Hooks, Context API
- **Form Handling:** React Hook Form
- **Date Handling:** date-fns, date-fns-tz

### Backend
- **API:** Next.js API Routes (catch-all route)
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **Storage:** Supabase Storage
- **Email:** Supabase Edge Functions (optional)

### DevOps
- **Version Control:** Git
- **Hosting:** Vercel (or any Node.js host)
- **Package Manager:** Yarn

---

## 📁 Project Structure

```
/app
├── app/                          # Next.js App Router
│   ├── page.js                  # Landing page
│   ├── layout.js                # Root layout with providers
│   ├── globals.css              # Global styles
│   │
│   ├── events/
│   │   ├── page.js              # Events listing
│   │   └── [id]/page.js         # Event detail + registration
│   │
│   ├── admin/
│   │   ├── page.js              # Admin dashboard
│   │   ├── login/page.js        # Admin login
│   │   ├── events/
│   │   │   ├── page.js          # Manage events
│   │   │   ├── new/page.js      # Create event
│   │   │   └── [id]/
│   │   │       ├── page.js      # Edit event
│   │   │       └── form-builder/page.js  # Form builder
│   │   ├── participants/
│   │   │   └── [eventId]/page.js  # View participants
│   │   └── registrations/
│   │       └── page.js          # Review registrations
│   │
│   ├── auth/page.js             # User auth (login/signup)
│   ├── contact/page.js          # Contact form
│   ├── profile/page.js          # User profile
│   │
│   └── api/
│       └── [[...path]]/route.js # Catch-all API handler
│
├── components/
│   ├── Navbar.js                # Navigation
│   ├── Footer.js                # Footer
│   ├── EventCard.js             # Event display card
│   ├── DynamicForm.js           # Form renderer
│   ├── FormBuilder.js           # Form builder UI
│   ├── ProtectedRoute.js        # Auth wrapper
│   └── ui/                      # shadcn/ui components
│
├── context/
│   └── AuthContext.js           # Auth state management
│
├── hooks/
│   ├── use-admin-status.js      # Admin role hook
│   ├── use-mobile.jsx           # Mobile detection
│   └── use-toast.js             # Toast notifications
│
├── lib/
│   ├── supabase/
│   │   ├── client.js            # Client-side Supabase
│   │   └── server.js            # Server-side Supabase
│   ├── email.js                 # Email utilities
│   └── utils.js                 # Helper functions
│
├── public/                      # Static assets
├── SUPABASE_SETUP.sql          # Database schema
├── USER_GUIDE.md               # User documentation
├── ADMIN_GUIDE.md              # Admin documentation
├── DEVELOPER_GUIDE.md          # This file
├── EMAIL_SETUP.md              # Email configuration
├── README.md                   # Project overview
├── package.json                # Dependencies
├── tailwind.config.js          # Tailwind configuration
└── next.config.js              # Next.js configuration
```

---

## 🚀 Setup & Installation

### Prerequisites
- Node.js 18+
- Yarn package manager
- Supabase account and project

### 1. Clone Repository
```bash
git clone <repository-url>
cd ieee-club-website
```

### 2. Install Dependencies
```bash
yarn install
```

### 3. Environment Setup

Create `.env.local`:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Email Configuration (Optional)
NEXT_PUBLIC_SUPABASE_FUNCTION_URL=https://your-project.supabase.co/functions/v1/send-email
EMAIL_FROM=IEEE Club <noreply@ieeeclub.com>

# Site Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 4. Database Setup

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to SQL Editor
3. Copy content from `SUPABASE_SETUP.sql`
4. Execute the SQL

This creates:
- All database tables
- Row Level Security policies
- Helper functions
- Indexes
- Storage bucket

### 5. Create Admin User

Option A: Via Supabase Dashboard
1. Go to Authentication → Users
2. Click "Add user"
3. Enter email and password
4. After creation, run SQL:
```sql
INSERT INTO admin_users (user_id, role)
VALUES ('user-uuid-here', 'super_admin');
```

Option B: Via SQL
```sql
-- Get the user ID first, then insert
INSERT INTO admin_users (user_id, role)
SELECT id, 'super_admin'
FROM auth.users
WHERE email = 'admin@example.com';
```

### 6. Run Development Server
```bash
yarn dev
```

Visit: http://localhost:3000

---

## 🗄️ Database Schema

### Tables

#### `events`
Stores hackathon/event information.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| title | TEXT | Event name |
| description | TEXT | Event details |
| banner_url | TEXT | Banner image URL |
| event_date | TIMESTAMPTZ | Event start |
| event_end_date | TIMESTAMPTZ | Event end |
| is_active | BOOLEAN | Visibility toggle |
| registration_open | BOOLEAN | Registration toggle |
| registration_start | TIMESTAMPTZ | Registration opens |
| registration_end | TIMESTAMPTZ | Registration closes |
| form_fields | JSONB | Custom form schema |
| created_by | UUID | Admin who created event |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

#### `participants`
Stores event registrations.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| event_id | UUID | FK to events |
| user_id | UUID | FK to auth.users |
| responses | JSONB | Form submission data |
| status | TEXT | pending/approved/rejected |
| reviewed_by | UUID | Admin who reviewed |
| reviewed_at | TIMESTAMPTZ | Review timestamp |
| created_at | TIMESTAMPTZ | Registration timestamp |

#### `admin_users`
Defines admin roles.

| Column | Type | Description |
|--------|------|-------------|
| user_id | UUID | PK, FK to auth.users |
| role | TEXT | 'admin' or 'super_admin' |
| created_at | TIMESTAMPTZ | Creation timestamp |

#### `profiles`
User profile information.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | PK, FK to auth.users |
| name | TEXT | User's name |
| phone_number | TEXT | Contact number |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

#### `contact_submissions`
Contact form submissions.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Submitter name |
| email | TEXT | Submitter email |
| message | TEXT | Message content |
| created_at | TIMESTAMPTZ | Submission timestamp |

### JSONB Schema Examples

#### `form_fields` (in events table)
```json
[
  {
    "id": "field-1",
    "type": "text",
    "label": "Full Name",
    "required": true
  },
  {
    "id": "field-2",
    "type": "email",
    "label": "Email Address",
    "required": true
  },
  {
    "id": "field-3",
    "type": "dropdown",
    "label": "Team Size",
    "required": true,
    "options": ["1-2", "3-4", "5+"]
  }
]
```

#### `responses` (in participants table)
```json
{
  "Full Name": "John Doe",
  "Email Address": "john@example.com",
  "Team Size": "3-4",
  "GitHub Profile": "https://github.com/johndoe"
}
```

### Row Level Security (RLS)

All tables have RLS enabled with specific policies:

**Events:**
- Public read access
- Admins can create
- Only event owner or super_admin can update/delete

**Participants:**
- Users can create (register)
- Users can view their own registrations
- Admins can view/update participants for their events
- Super admins can view/update all participants

**Admin Users:**
- Users can read their own admin status
- Only super_admins can manage admin users

---

## 🔌 API Documentation

All API routes are handled by `/app/api/[[...path]]/route.js` using a catch-all pattern.

### Base URL
```
Development: http://localhost:3000/api
Production: https://your-domain.com/api
```

### Authentication
Protected endpoints require JWT token in Authorization header:
```
Authorization: Bearer <access_token>
```

---

### Events

#### GET /api/events
Get all events.

**Query Parameters:**
- `active` (boolean) - Filter active events
- `limit` (number) - Limit results

**Response:**
```json
{
  "success": true,
  "events": [
    {
      "id": "uuid",
      "title": "Hackathon 2025",
      "description": "24-hour coding event",
      "event_date": "2025-03-15T09:00:00Z",
      "is_active": true,
      "registration_open": true,
      "form_fields": [],
      "created_by": "uuid",
      "created_at": "2025-01-15T10:00:00Z"
    }
  ]
}
```

#### GET /api/events/:id
Get single event by ID.

**Response:**
```json
{
  "success": true,
  "event": { /* event object */ }
}
```

#### POST /api/events
Create new event (Admin only).

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "title": "New Hackathon",
  "description": "Event description",
  "event_date": "2025-03-15T09:00:00Z",
  "event_end_date": "2025-03-16T09:00:00Z",
  "registration_start": "2025-02-01T00:00:00Z",
  "registration_end": "2025-03-10T23:59:59Z",
  "is_active": true,
  "registration_open": true,
  "form_fields": []
}
```

**Response:**
```json
{
  "success": true,
  "event": { /* created event */ }
}
```

#### PUT /api/events/:id
Update event (Owner or Super Admin only).

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "title": "Updated Title",
  "is_active": false
}
```

#### DELETE /api/events/:id
Delete event (Owner or Super Admin only).

**Headers:**
```
Authorization: Bearer <token>
```

---

### Participants

#### POST /api/participants
Register for event.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "event_id": "uuid",
  "responses": {
    "Full Name": "John Doe",
    "Email": "john@example.com"
  }
}
```

**Response:**
```json
{
  "success": true,
  "participant": {
    "id": "uuid",
    "event_id": "uuid",
    "user_id": "uuid",
    "status": "pending",
    "responses": { /* ... */ },
    "created_at": "2025-01-15T10:00:00Z"
  }
}
```

#### GET /api/participants/:eventId
Get participants for event (Admin only).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "participants": [ /* array of participants */ ]
}
```

#### GET /api/participants/:eventId?userId=:userId
Check user's registration status.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "participant": { /* participant object or null */ }
}
```

#### GET /api/participants/pending
Get all pending registrations (Admin only).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "participants": [
    {
      "id": "uuid",
      "event_id": "uuid",
      "status": "pending",
      "responses": { /* ... */ },
      "event": {
        "id": "uuid",
        "title": "Event Name",
        "created_by": "uuid"
      }
    }
  ]
}
```

#### PUT /api/participants/:id/approve
Approve registration (Admin only).

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Response:**
```json
{
  "success": true,
  "participant": {
    "id": "uuid",
    "status": "approved",
    "reviewed_by": "uuid",
    "reviewed_at": "2025-01-15T12:00:00Z"
  }
}
```

#### PUT /api/participants/:id/reject
Reject registration (Admin only).

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Response:**
```json
{
  "success": true,
  "participant": {
    "id": "uuid",
    "status": "rejected",
    "reviewed_by": "uuid",
    "reviewed_at": "2025-01-15T12:00:00Z"
  }
}
```

#### GET /api/participants/count
Get total participant count.

**Response:**
```json
{
  "success": true,
  "count": 42
}
```

---

### Profile

#### GET /api/profile
Get current user's profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "profile": {
    "id": "uuid",
    "name": "John Doe",
    "phone_number": "+1234567890",
    "email": "john@example.com"
  }
}
```

#### PUT /api/profile
Update current user's profile.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "name": "John Doe",
  "phone_number": "+1234567890"
}
```

---

### Contact

#### POST /api/contact
Submit contact form.

**Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "message": "Hello, I have a question..."
}
```

**Response:**
```json
{
  "success": true,
  "submission": { /* submission object */ }
}
```

---

## 🔐 Authentication & Authorization

### Authentication Flow

1. **User Signs Up/Logs In**
   - Handled by Supabase Auth
   - JWT token stored in session

2. **Token Storage**
   - Stored in HTTP-only cookies by Supabase
   - Auto-refreshed on expiration

3. **Protected Routes**
   - Wrapped with `<ProtectedRoute>` component
   - Redirects to login if not authenticated

### Authorization Levels

1. **Public** - No auth required
   - View events
   - View event details
   - Contact form

2. **Authenticated** - Logged in users
   - Register for events
   - View own registrations
   - Edit profile

3. **Admin** - Admin role required
   - Create events
   - Manage own events
   - Approve/reject registrations for own events

4. **Super Admin** - Super admin role
   - All admin permissions
   - Manage any event
   - System-wide access

### Checking Admin Status

Client-side:
```javascript
import { useAuth } from '@/context/AuthContext'

function MyComponent() {
  const { user, isAdmin, isSuperAdmin, loading } = useAuth()
  
  if (loading) return <Loading />
  if (!isAdmin) return <Unauthorized />
  
  return <AdminContent />
}
```

Server-side (API):
```javascript
async function getAdminUser(request) {
  const authHeader = request.headers.get('Authorization')
  // Extract token, verify user, check admin_users table
  return { user, role, error }
}
```

---

## ✨ Features Implementation

### Dynamic Form Builder

**How it works:**
1. Admin creates form fields using FormBuilder component
2. Fields stored as JSONB in `events.form_fields`
3. DynamicForm component renders form based on schema
4. Submissions stored as JSONB in `participants.responses`

**Adding New Field Type:**

1. Update FormBuilder.js:
```javascript
const FIELD_TYPES = [
  // ... existing types
  { value: 'newtype', label: 'New Type' }
]
```

2. Update DynamicForm.js:
```javascript
case 'newtype':
  return <NewTypeInput {...props} />
```

### Registration Approval Workflow

**Flow:**
1. User submits registration → Status: `pending`
2. Admin receives email notification
3. Admin reviews in dashboard
4. Admin approves/rejects
5. Status updated, email sent to user
6. If rejected, user can re-register

**Database tracking:**
- `status`: current state
- `reviewed_by`: which admin reviewed
- `reviewed_at`: when reviewed

### Email Notifications

**Implementation:**
- Emails sent via `/app/lib/email.js`
- Supports Supabase Edge Functions
- Falls back to console logging if not configured
- See EMAIL_SETUP.md for configuration

**Email Templates:**
- Approval: Congratulations message
- Rejection: Polite rejection with re-registration option
- Admin Notification: New registration alert

---

## 🚢 Deployment

### Vercel Deployment (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Select your repository

3. **Configure Environment Variables**
   - Add all variables from `.env.local`
   - Ensure Supabase credentials are correct

4. **Deploy**
   - Vercel automatically builds and deploys
   - Visit your production URL

### Manual Deployment

**Requirements:**
- Node.js 18+ server
- Environment variables configured

**Steps:**
```bash
# Build
yarn build

# Start
yarn start
```

### Environment Variables for Production

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SUPABASE_FUNCTION_URL=https://your-project.supabase.co/functions/v1/send-email
NEXT_PUBLIC_SITE_URL=https://your-domain.com
EMAIL_FROM=IEEE Club <noreply@yourdomain.com>
```

---

## 🧪 Testing

### Manual Testing Checklist

**User Flow:**
- [ ] Sign up as new user
- [ ] Log in
- [ ] Browse events
- [ ] Register for event
- [ ] Check registration status
- [ ] Update profile

**Admin Flow:**
- [ ] Log in as admin
- [ ] Create event
- [ ] Build custom form
- [ ] Edit event
- [ ] View registrations
- [ ] Approve registration
- [ ] Reject registration
- [ ] Export CSV

**Super Admin Flow:**
- [ ] Log in as super admin
- [ ] View all events
- [ ] Edit any event
- [ ] View all registrations
- [ ] Approve registrations for any event

### Test Data

Use `/app/backend_test.py` if available for API testing.

---

## 🐛 Troubleshooting

### Common Issues

**"Relation does not exist" error**
- Solution: Run SUPABASE_SETUP.sql in Supabase SQL Editor

**Can't login as admin**
- Solution: Ensure user exists in `admin_users` table

**Forms not saving**
- Check browser console for errors
- Verify Supabase connection
- Check RLS policies

**Emails not sending**
- Verify email service is configured
- Check function logs in Supabase
- Ensure API keys are valid

**Images not uploading**
- Check storage bucket exists (`event-banners`)
- Verify storage policies
- Check file size limits

### Debug Mode

Enable console logging:
```javascript
// In any component
console.log('Debug:', data)

// API routes already log errors
```

### Checking Logs

**Supabase:**
- Dashboard → Logs → All logs

**Vercel:**
- Dashboard → Deployment → Runtime Logs

---

## 🔧 Advanced Configuration

### Custom Domain
1. Add domain in Vercel dashboard
2. Update DNS records
3. Update `NEXT_PUBLIC_SITE_URL` env var

### Rate Limiting
Implement in `/app/api/[[...path]]/route.js` if needed.

### Analytics
Add Google Analytics or similar in `layout.js`.

---

## 📞 Support

For questions or issues:
- Check documentation files
- Review Supabase dashboard logs
- Check browser console
- Contact system administrator

---

**Built with ❤️ for IEEE Student Branches**

Version: 2.0.0 (with Approval Workflow)  
Last Updated: January 2025
