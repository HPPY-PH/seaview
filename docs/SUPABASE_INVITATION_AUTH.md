# Supabase Invitation-Only Authentication

Updated: 2026-09-18

## Overview

The application uses Supabase Authentication for login and a database profile model for application access. It has three access paths:

- Administrators and staff use the dashboard.
- Invited guests use the guest portal.
- Authenticated users without a valid application profile or guest invitation are signed out and shown an access-restricted message.

Public self-registration is not an access path. A Supabase auth session alone does not grant application access.

## What Changed In The App

The application now treats a Supabase login session as authenticated only after it finds exactly one matching Guest record:

```text
Guest.auth_user_id = authenticated Supabase user ID
```

The Guest record must have one of these statuses:

```text
pending
accepted
```

The app rejects all other cases:

- No matching Guest record
- More than one matching Guest record
- `not_invited`
- `revoked`
- `review_required`

When access is rejected, the app signs the user out and displays:

> Access is invitation-only. Please contact staff for access.

For a Google account with no matching `User` profile and no linked Guest invitation, the app signs the user out and displays:

> Account does not exist in this application. Please contact staff for an invitation.

Google OAuth can create a Supabase Auth identity before the application can inspect the email, but that identity is immediately rejected and signed out when no application record exists. It cannot access the dashboard or guest portal until staff creates an approved profile or invitation.

This check runs after both Google OAuth and email/password authentication because it is centralized in `AuthContext`.

## Files Changed

- `src/api/base44Client.js`
  - Added `auth.getLinkedGuest(userId)`.
  - Returns a Guest only when exactly one record matches the authenticated user ID.
  - Duplicate user links fail closed.

- `src/lib/AuthContext.jsx`
  - Checks the linked Guest after Supabase returns the authenticated user.
  - Signs out users without an invited Guest profile.

- `src/App.jsx`
  - Routes invitation failures to the access-restricted screen.

- `src/components/UserNotRegisteredError.jsx`
  - Accepts a custom access-denied message.

- `supabase/functions/invite-guest/index.ts`
  - Sends invitation emails using Supabase admin APIs on the server only.
  - Requires an authenticated caller with `app_metadata.role` set to `admin` or `staff`.
  - Updates the Guest row to `pending` only after the email invitation succeeds.

- `supabase/functions/accept-guest-invitation/index.ts`
  - Verifies the invited email against the authenticated account.
  - Links `Guest.auth_user_id` and changes the invitation to `accepted`.

- `src/pages/Members.jsx`
  - Added the Members panel for staff and administrator accounts.
  - Supports inviting members, changing roles, changing active status, resetting passwords, searching, and filtering by All, Admins, or Staff.
  - Groups Activate/Deactivate and Delete under an Actions dropdown.
  - Shows success or error feedback after a password reset request.
  - Uses a confirmation dialog before deleting a member.

- `src/components/UserNotRegisteredError.jsx`
  - Added a Back to login action that signs out the current session before redirecting.

- `supabase/functions/invite-member/index.ts`
  - Sends staff invitations through the Supabase Admin API.
  - Requires only the invitee's email address and role; names are not entered manually.
  - Creates the application profile with `status = inactive` until first successful login.
  - Allows administrators to invite administrators or staff.
  - Allows staff to invite staff only.
  - Uses `APP_URL` or the request origin for the invitation redirect.

- `supabase/functions/delete-member/index.ts`
  - Allows administrators to delete another member.
  - Deletes both the `User` profile and the Supabase Auth account.
  - Prevents an administrator from deleting their own account.

- `supabase/functions/activate-member/index.ts`
  - Allows a newly invited member to activate their profile during first login.
  - Clears the one-time `pending_member_invitation` metadata marker.

- `src/api/base44Client.js`
  - Added `auth.getAppProfile(userId)` so authentication can check both role and status.

- `supabase/fix-user-rls.sql`
  - Replaces recursive `User` RLS policies.
  - Adds the `public.is_admin_user()` security-definer helper.
  - Allows users to access their own profile and administrators to manage profiles.

- `supabase/add-user-avatar.sql`
  - Adds the optional `User.avatar_url` field used for Google profile photos.

- `supabase/add-user-last-seen.sql`
  - Adds the `User.last_seen_at` field used for live member presence.

- `supabase/enable-user-realtime.sql`
  - Adds the `User` table to Supabase Realtime for immediate member status updates.

Google names and profile photos are copied from the signed-in user's Supabase metadata (`full_name`, `name`, `avatar_url`, or `picture`) into the application profile. The Members panel displays the saved image and falls back to the member's initial when no photo is available. New invitations therefore need only an email address.

Member presence is separate from access status. Authenticated staff and administrators update `last_seen_at` every 30 seconds. The Members panel subscribes to Supabase Realtime for immediate profile and presence changes. It shows Inactive when the profile has not been activated or has been deactivated, Online when an active member's last heartbeat is less than 90 seconds old, and Offline otherwise. A local timer recalculates expired presence without reloading the browser or polling the database.

## Staff And Member Management

The Members panel uses the `public."User"` profile table. Application roles are:

```text
admin
staff
guest
```

Permissions are split as follows:

| Action | Admin | Staff |
| --- | --- | --- |
| View member profiles | Yes | Yes |
| Invite staff | Yes | Yes |
| Invite administrators | Yes | No |
| Change member roles | Yes | No |
| Activate or deactivate members | Yes | No |
| Delete members | Yes | No |
| Reset a member password | Yes | Yes |

New staff profiles are created as `inactive` because the database status constraint does not allow `pending`. After the invited user successfully authenticates, `AuthContext` changes the profile status to `active`.

Deactivating an established staff or administrator changes the profile to `inactive` and blocks dashboard access at the next authentication check. Only a newly invited account carrying the one-time `pending_member_invitation` marker can be activated through first login.

The Members panel provides these filters:

- All members
- Admins
- Staff

The search field applies within the selected filter.

## Member Invitation Deployment

Deploy the member invitation function from the repository root:

```text
supabase functions deploy invite-member
```

The function requires these Supabase-managed environment values:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

The service-role key must remain in Supabase Function secrets. Never place it in Vite environment variables or browser code.

Use `APP_URLS` for multiple trusted environments. The function uses the request `Origin` when it matches this comma-separated allowlist, so local invitations return to localhost and staging invitations return to Webflow:

```text
APP_URLS=http://localhost:5173,https://seaview-e8ae1e.webflow.io
```

`APP_URL` remains as the fallback when a request has no matching allowed origin. Do not use arbitrary request origins without an allowlist.

Supabase Authentication email delivery must also be configured. A function can create an invitation successfully while email delivery remains unavailable if SMTP or the Supabase email provider is not configured.

## Member Deletion Deployment

Deploy the protected deletion function with:

```text
supabase functions deploy delete-member
```

The browser sends only the target member ID. The function validates the caller's authenticated session and checks that the caller's application role is `admin` before using the service-role API.

Deletion is permanent. The confirmation dialog warns that both the application profile and authentication account will be removed.

Deploy the first-login activation function as well:

```text
supabase functions deploy activate-member
```

## User RLS Fix

Run [supabase/fix-user-rls.sql](../supabase/fix-user-rls.sql) once in the Supabase SQL Editor.

The original policy issue was:

```text
infinite recursion detected in policy for relation "User"
```

This happened because an RLS policy queried the same `User` table to decide whether the current user was an administrator. The replacement `public.is_admin_user()` function uses `security definer` and has a fixed `search_path`, so the administrator check does not recursively invoke the table's policies.

If the SQL editor reports a syntax error near `reate`, the first character of `create or replace function` was lost while copying. Run the complete file from the beginning.

## Authentication Behavior

`src/lib/AuthContext.jsx` centralizes the authentication and authorization checks:

1. Get the current Supabase auth user.
2. Resolve only valid application roles: `admin`, `staff`, or `guest`.
3. Look up the matching `User` profile when auth metadata does not contain a valid application role.
4. Activate an administrator or staff profile after successful authentication.
5. For other users, require exactly one linked Guest record with `invite_status` equal to `pending` or `accepted`.
6. Sign out and show the restricted-access screen when the checks fail.

The default Supabase auth role, `authenticated`, is not an application role and is intentionally ignored.

The restricted-access screen includes a Back to login button. It signs out the current session and redirects to `/login`, which is useful when a browser has the wrong Google account active.

## Routing

- `/login`, `/forgot-password`, and `/reset-password` are public auth routes.
- `/` is the staff and administrator dashboard.
- `/portal` is for invited guests only.
- Staff and administrators can open `/portal` directly; invitation checks still apply to guest accounts.
- Users without a valid role or invitation are shown the restricted-access screen.

## Password Reset

The Members panel uses Supabase `resetPasswordForEmail`. The redirect target is:

```text
/reset-password
```

The panel displays a green success message when the request is accepted and a red error message if Supabase rejects it. Email delivery still depends on the Supabase email provider configuration.

## Supabase Dashboard Configuration

### Authentication URL Configuration

Set the Site URL to the deployed application:

```text
https://seaview-e8ae1e.webflow.io
```

Add these Redirect URLs:

```text
http://localhost:5173/
http://localhost:5173/login
https://seaview-e8ae1e.webflow.io/
https://seaview-e8ae1e.webflow.io/login
```

### Google Provider

Enable Google under **Authentication > Providers > Google**.

In Google Cloud Console, use this authorized redirect URI:

```text
https://dwefhnrjaknxqhjcdsby.supabase.co/auth/v1/callback
```

The Google callback URI is the Supabase callback URL, not the localhost or Webflow URL.

### Signup Setting

Leave user signups enabled while invited Google users are being linked. Supabase may create an auth user during OAuth, but the application will immediately sign out users who have no valid Guest link.

To prevent even temporary auth-user creation, disable public signups and provision invited users through a trusted server-side admin flow. Do not use the service-role key in the browser.

## Deploy The Invitation Function

Install and authenticate the Supabase CLI, then run these commands from the repository root:

```text
supabase login
supabase link --project-ref dwefhnrjaknxqhjcdsby
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key APP_URL=https://seaview-e8ae1e.webflow.io
supabase functions deploy invite-guest
```

The service-role key belongs only in Supabase Function secrets. Never add it to `.env`, Vite variables, Git, or browser code.

For local testing, use:

```text
supabase secrets set APP_URL=http://localhost:5173
supabase functions serve invite-guest
```

The app calls the deployed function through `supabase.functions.invoke('invite-guest')` when staff clicks **Invite to Portal**.

Invitation emails redirect to `/portal`, not `/register`. Public registration has been removed from the application routes and login page. Guests can enter only through a staff-created invitation.

When the invitation link creates or restores the authenticated session, the app calls `accept-guest-invitation`. That server function checks the invitation email, links the authenticated UUID to `Guest.auth_user_id`, and marks the Guest as `accepted` before portal access is granted.

Authenticated guests are redirected to `/portal` when they visit `/`. Staff and administrators retain the dashboard at `/`. This routing behavior is included in the frontend build and must be redeployed after code changes.

## Staff And Admin Roles

The application allows dashboard access without a Guest link only when the authenticated Supabase user has one of these values in `app_metadata.role`:

```text
admin
staff
```

Guest users must instead have a matching `Guest.auth_user_id` and an allowed invitation status. Set staff/admin metadata through a trusted server or the Supabase Admin API; do not let a browser user set their own role.

The invitation function also checks this role before sending mail.

## Database Preparation

The existing Guest data must contain these fields:

```text
auth_user_id
invite_status
```

Use these invite statuses:

```text
not_invited
pending
accepted
revoked
review_required
```

For an invited guest, staff should create or update one Guest record:

```text
email: guest@example.com
auth_user_id: null until account linking
invite_status: pending
invited: true
```

Do not link accounts permanently by email. Email can identify an invitation, but the final relationship must be the authenticated user ID.

## Required Server-Side/RLS Work

The browser check improves the user experience but is not the complete security boundary. Apply database policies or a server-side function so that:

- Admins can manage all users, Guests, and invitations.
- Staff can manage operational records and invitations.
- Guests can read only rows belonging to their own `Guest.auth_user_id = auth.uid()`.
- Guests cannot set or change their own `Guest.auth_user_id`.
- Only a trusted staff/admin operation can link a Supabase user to a Guest.
- Duplicate or uncertain email matches go to `review_required` instead of being merged.

The account-linking operation should be atomic:

1. Receive the authenticated user ID and invitation ID.
2. Confirm the invitation is pending.
3. Confirm exactly one Guest profile is associated with the invitation.
4. Confirm the Guest is not already linked to another user.
5. Set `Guest.auth_user_id = auth.uid()`.
6. Set `invite_status = accepted`.
7. Record the accepting user and timestamp.

The repository currently has entity definitions for Guest permissions, but the final RLS policies must be verified against the actual Supabase tables in the project. Run policy changes in the Supabase SQL Editor after confirming the real table names and columns.

## Roles

Use these application roles in the User/profile record:

```text
admin
staff
guest
```

Do not rely on Google metadata or frontend-only role checks for authorization. Roles must be enforced by RLS or trusted server-side code.

## Environment Variables

The staging build must have these variables configured before `npm run build`:

```env
VITE_SUPABASE_URL=https://dwefhnrjaknxqhjcdsby.supabase.co
VITE_SUPABASE_ANON_KEY=your_publishable_or_anon_key
```

Never place a `service_role` key in `.env` used by Vite or in any frontend bundle. Rotate any service-role key that was previously exposed or committed.

## Test Plan

Use separate test accounts for each case:

1. Google account with no Guest record: rejected and signed out.
2. Google account linked to `pending` Guest: allowed.
3. Google account linked to `accepted` Guest: allowed.
4. Guest with `revoked` status: rejected and signed out.
5. Guest with `review_required` status: rejected.
6. Duplicate `Guest.auth_user_id` rows: rejected.
7. Duplicate email profiles: sent to staff review; never auto-merged.
8. Email/password account with no Guest link: rejected the same way as Google.
9. Guest attempts to read another Guest's booking or invoice: blocked by RLS.
10. Staff resends an invitation: status remains `pending` and the resend is audited.

## Validation Performed

The following focused checks passed after the code changes:

```text
npx eslint src/api/base44Client.js src/lib/AuthContext.jsx src/App.jsx src/components/UserNotRegisteredError.jsx --quiet
```

No Supabase dashboard settings, production secrets, or database policies can be changed from this repository. Those steps are listed above for manual completion in the Supabase project.
