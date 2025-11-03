# 🚨 IMPORTANT: Database Setup Required

## You MUST complete this setup before using the website!

The application is fully built and ready, but you need to create the database tables in Supabase first.

### Step 1: Open Supabase SQL Editor

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click on "SQL Editor" in the left sidebar

### Step 2: Run the Database Setup Script

1. Open the file `SUPABASE_SETUP.sql` (located in the root directory)
2. Copy ALL the content from that file
3. Paste it into the Supabase SQL Editor
4. Click "RUN" button

### Step 3: Verify Tables Created

After running the script, go to "Table Editor" in Supabase and verify these tables exist:
- ✅ events
- ✅ participants
- ✅ contact_submissions

Also verify the storage bucket:
- Go to "Storage" in Supabase
- Check that "event-banners" bucket exists

### Step 4: Create Your First Admin User

1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add user" → "Create new user"
3. Enter your email and password
4. Click "Create user"

**OR** you can use the signup feature at: http://localhost:3000/admin/login

### Step 5: Start Using the App!

Once the database is set up and you've created an admin user:

1. Visit: http://localhost:3000
2. Login as admin: http://localhost:3000/admin/login
3. Start creating events!

---

## ⚠️ Common Issues

### "Table does not exist" error
- **Solution**: You haven't run the SQL script yet. Go back to Step 1.

### "Row Level Security policy violation" error  
- **Solution**: The SQL script includes RLS policies. Make sure you ran the ENTIRE script.

### Can't upload images
- **Solution**: Check that the "event-banners" storage bucket was created by the SQL script.

### Can't login as admin
- **Solution**: Create a user in Supabase Dashboard → Authentication → Users

---

## 🎉 What You'll Be Able To Do

After setup:
- ✅ Create unlimited events
- ✅ Build custom registration forms (text, email, dropdown, etc.)
- ✅ Accept registrations from participants
- ✅ View all participants for each event
- ✅ Export participant data to CSV
- ✅ Upload event banners or use URLs
- ✅ Toggle event visibility and registration status
- ✅ Receive contact form submissions

---

**Need help?** Check the README.md for detailed documentation!
