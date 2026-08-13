# Super Admin Account Setup & Secret Portal User Guide

This guide provides step-by-step instructions for database administrators and developers on how to establish the **initial Super Admin account**, access the **Secret Super Admin Portal**, and manage admin accounts across **Petron San Pedro Platform** and **MKC Foods Corporation Platform**.

---

## 🔑 1. Portal Secret Route & Access Details

- **Secret Unlisted URL Paths**: 
  - `http://localhost:5173/super-admin` or `http://localhost:5173/admin-management`
  - `https://your-domain.com/super-admin` or `https://your-domain.com/admin-management`
- **Navigation Visibility**: Omitted from standard sidebar menus for regular admins (`role = 'admin'`).
- **Personnel Verification Passcode**: Default is `SUPER2026` (configurable in `.env` via `VITE_SUPERADMIN_VERIFICATION_CODE`).

---

## ⚙️ Recommended Supabase Authentication Setting: Confirm Email OFF

For internal enterprise admin portals where Super Admins provision accounts directly:
1. Go to your **Supabase Dashboard ➔ Authentication ➔ Providers ➔ Email**.
2. Set **Confirm email** to **OFF** (Disabled).
3. **Why this is recommended**:
   - Super Admins can provision admin accounts instantly without needing external confirmation emails.
   - When an account is created, a **Credentials Summary Modal** appears with a **Copy Credentials** button so the Super Admin can immediately hand off login details to the new user.

## 🛠️ 2. How to Create the INITIAL Super Admin Account

Because regular users and standard admins cannot elevate themselves to Super Admin, the **very first Super Admin account** must be assigned directly by the database owner via the **Supabase Dashboard SQL Editor**.

### Step 1: Run SQL Migration 024
In your **Supabase Dashboard ➔ SQL Editor**, copy and execute the following SQL script:

```sql
-- 1. Update profiles_role_check constraint to allow 'superadmin'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role = ANY (ARRAY['customer'::text, 'admin'::text, 'rider'::text, 'superadmin'::text]));

-- 2. Create public.is_super_admin() SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'superadmin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, anon, service_role;

-- 3. Create helper RPC for fetching admin accounts list securely
CREATE OR REPLACE FUNCTION public.get_admin_accounts_list()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  role text,
  is_active boolean,
  created_at timestamp with time zone,
  last_sign_in_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Access Denied: Super Admin privilege required';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role,
    COALESCE(p.is_active, true) as is_active,
    p.created_at,
    u.last_sign_in_at
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE p.role IN ('admin', 'superadmin')
  ORDER BY p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_accounts_list() TO authenticated, service_role;

-- 4. Promote your primary email to Super Admin
UPDATE public.profiles
SET role = 'superadmin', is_active = true, updated_at = NOW()
WHERE email = 'your_owner_email@example.com';
```

---

## 🚀 3. Accessing the Secret Super Admin Portal

1. Navigate to `http://localhost:5173/super-admin` in your web browser.
2. **Personnel Security Gate**:
   - Enter your Personnel Verification Passcode (e.g., `SUPER2026`).
   - The security gate will run an automated **Credential Analysis Animation** (`Analyzing Personnel Credentials...`) before verifying authorization.
3. **Super Admin Login**:
   - Sign in using your Super Admin email and password.
4. **Super Admin Control Center**:
   - You will gain full access to view active admins, register new accounts, promote/demote roles, suspend/activate access, and view security audit logs.

---

## 👥 4. Registering Additional Admin Accounts

Once logged into the **Super Admin Control Center**:

1. Click the **Register Admin** button in the top header.
2. Fill out the modal registration form:
   - **Full Name**: Admin's full name.
   - **Email Address**: Admin's email address.
   - **Initial Password**: Password (minimum 6 characters).
   - **Confirm Password**: Re-enter password for verification.
   - **Account Role**: Select **Admin** (standard operations) or **Super Admin** (full management portal access).
3. Click **Register Account**. The new admin account will immediately appear in the accounts list and can log in right away.

---

## ⚙️ 5. Managing Existing Admin Accounts

- **Promote / Demote**: Click **Promote Super Admin** or **Demote to Admin** next to any user row to toggle their administrative privileges.
- **Suspend / Activate**: Click **Suspend** to instantly block an admin account from logging in, or **Activate** to restore access.
- **Light / Dark Mode**: Click the **Light Mode / Dark Mode** button in the header bar or security gate to toggle visual themes.

---

## ❓ 6. Troubleshooting

- **Error: `violates check constraint "profiles_role_check"`**:
  - *Cause*: Database `profiles` table constraint has not been updated to accept `'superadmin'`.
  - *Fix*: Re-run Section 2 SQL script in your Supabase SQL Editor.
- **Error: `Access Denied: Super Admin privilege required`**:
  - *Cause*: Your logged-in account in `public.profiles` is still set to `role = 'admin'` or `role = 'customer'`.
  - *Fix*: Execute `UPDATE public.profiles SET role = 'superadmin' WHERE email = 'your_email@example.com';` in Supabase.
