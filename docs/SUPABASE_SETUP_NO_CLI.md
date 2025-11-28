# ZORA CORE - Supabase Setup Guide (No CLI Required)

This guide explains how to set up and repair the ZORA CORE database using only the Supabase browser interface. No command line tools are required.

## Prerequisites

Before starting, ensure you have:

1. A Supabase project created at [supabase.com](https://supabase.com)
2. Access to the Supabase dashboard for your project
3. The ZORA CORE API deployed with correct environment variables

## Step 1: Verify API Connection

First, confirm that your API can connect to Supabase.

1. Open your browser and go to: `https://api.zoracore.dk/api/status`
2. You should see a JSON response like:
   ```json
   {
     "service": "ZORA CORE API",
     "version": "0.5.0",
     "environment": "production",
     "supabase": {
       "connected": true,
       "url": "https://your-project.supabase.co"
     }
   }
   ```
3. If `supabase.connected` is `false`, check your Cloudflare Workers secrets:
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_SERVICE_KEY` - Your service role key (from Project Settings > API)

## Step 2: Apply the Schema Script

This step repairs or initializes your database. The script is safe to run multiple times.

### 2.1 Open the SQL Editor

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New query** to create a new SQL query

### 2.2 Get the Schema Script

1. Open the schema script on GitHub:
   - URL: `https://github.com/ZORA-CORE/ZORA-CORE/blob/main/supabase/SUPABASE_SCHEMA_V1_FULL.sql`
2. Click the **Raw** button to view the raw SQL
3. Select all the text (Ctrl+A or Cmd+A)
4. Copy it (Ctrl+C or Cmd+C)

### 2.3 Run the Script

1. Go back to the Supabase SQL Editor
2. Paste the script into the query editor (Ctrl+V or Cmd+V)
3. Click **Run** (or press Ctrl+Enter)
4. Wait for the script to complete

### 2.4 Expected Results

After running the script, you should see:

- **Success messages** in the output panel
- Some `NOTICE` messages about dropped/created objects (this is normal)
- A final message: `Schema is correctly configured!`

**Note:** Warnings like "relation already exists" or "index already exists" are OK. These mean the object was already created and the script skipped it.

### 2.5 Verify Tables Exist

1. Click **Table Editor** in the left sidebar
2. You should see these tables:
   - `tenants`
   - `users`
   - `memory_events`
   - `journal_entries`
   - `climate_profiles`
   - `climate_missions`

If any tables are missing, try running the script again.

## Step 3: Bootstrap Your First Tenant

Now that the database is ready, create your first tenant and user.

### 3.1 Open Admin Setup

1. Go to: `https://zoracore.dk/admin/setup`
2. You'll see an "Admin Secret" input field

### 3.2 Enter Your Admin Secret

1. Enter your `ZORA_BOOTSTRAP_SECRET` value
   - This is the secret you set in Cloudflare Workers
   - It protects the admin interface from unauthorized access
2. Click **Authenticate**

### 3.3 Check System Status

After authenticating, you'll see the **System Status** section showing:

- JWT Secret Configured: Should be "Yes"
- Bootstrap Secret Configured: Should be "Yes"
- Supabase Connected: Should be "Yes"
- Tenants Exist: Will be "No" if this is your first setup
- Founder Exists: Will be "No" if this is your first setup

### 3.4 Create Your Tenant

1. In the **Bootstrap Tenant** section:
   - Enter a **Tenant Name** (e.g., "ZORA CORE" or your organization name)
   - Enter your **Founder Email** (your email address)
2. Click **Bootstrap Tenant**
3. You should see a success message

## Step 4: Generate a JWT Token

Now create a login token for yourself.

### 4.1 View Your User

1. In the **Manage Tenants & Users** section, you should see your new tenant
2. Click on your tenant to expand it
3. You'll see your founder user listed

### 4.2 Generate Token

1. Find your user in the list
2. Click **Generate Token** next to your user
3. A text area will appear with your JWT token
4. Click **Copy** to copy the token to your clipboard

**Important:** Save this token somewhere safe. You'll need it to log in.

## Step 5: Log In

### 5.1 Go to Login Page

1. Open: `https://zoracore.dk/login`

### 5.2 Enter Your Token

1. Paste your JWT token into the token input field
2. Click **Sign in**

### 5.3 Verify Access

After logging in, you should be able to access:

- **Climate OS** at `/climate` - Create and manage climate profiles
- **Agents** at `/agents` - View agent dashboards and memory
- **Journal** at `/journal` - View system events

## Troubleshooting

### "Could not find the table 'public.tenants' in the schema cache"

This error means the `tenants` table doesn't exist. Run the schema script again (Step 2).

### "ERROR: 42725: function name 'search_memories_by_embedding' is not unique"

This error means there are duplicate functions. The schema script fixes this automatically. Run the script again (Step 2).

### "Invalid token format" on login

Make sure you're pasting a valid JWT token. A JWT token:
- Has three parts separated by dots (`.`)
- Looks like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0ZW5hbnRfaWQiOi...`

If you see this error, generate a new token from `/admin/setup`.

### Admin Setup shows "Supabase Connected: No"

1. Check that your Supabase project is active
2. Verify the `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` secrets in Cloudflare Workers
3. Try refreshing the page

### Tables exist but Admin Setup still fails

1. Check the Supabase logs (Database > Logs in the dashboard)
2. Look for any SQL errors
3. Try running the schema script again

## Checking Function Duplicates (Advanced)

If you want to check for duplicate functions before running the repair script:

1. Open SQL Editor in Supabase
2. Run this query:
   ```sql
   SELECT oid::regprocedure AS function_signature
   FROM pg_proc
   WHERE proname = 'search_memories_by_embedding';
   ```
3. If you see more than one row, there are duplicates
4. The schema script will fix this automatically

## Schema Version

This guide is for **ZORA CORE Schema V1**.

The canonical schema script is located at:
- Repository: `supabase/SUPABASE_SCHEMA_V1_FULL.sql`
- GitHub: `https://github.com/ZORA-CORE/ZORA-CORE/blob/main/supabase/SUPABASE_SCHEMA_V1_FULL.sql`

## Related Documentation

- [Developer Setup](./DEVELOPER_SETUP.md) - Full development environment setup
- [Deployment Overview](./DEPLOYMENT_OVERVIEW.md) - Production deployment guide
- [Database Schema](./DATABASE_SCHEMA_v0_1.md) - Detailed schema documentation

---

*ZORA CORE Supabase Setup Guide - Iteration 0010*
