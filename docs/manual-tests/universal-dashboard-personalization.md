# Universal Dashboard Personalization - Manual Smoke Test

Use this checklist to confirm personalization works for all roles.

## Roles to verify
- Super Admin
- Head
- HR
- Employee

## Preconditions
- User account can access `Profile` and dashboard.
- Test image files are available for avatar and banner upload.

## Steps (run per role)
1. Log in as the role.
2. Go to `Profile`.
3. In `Your Dashboard Preferences (All Roles)`, upload:
   - Profile Photo
   - Dashboard Banner Image
4. Click `Pick random 7-word quote`.
5. Click `Save dashboard settings`.
6. Go to dashboard and verify:
   - Hero banner image reflects uploaded banner.
   - Quote reflects saved/picked quote.
   - Avatar reflects uploaded image where avatar is displayed.

## Fallback checks
1. Clear `dashboard_quote` and `dashboard_banner_path` in DB (or test with fresh account).
2. Re-login and open dashboard.
3. Verify:
   - Quote falls back to local hardcoded pool/default display.
   - Banner falls back to `/leaf-background.jpg`.

## Non-functional checks
- Quote picker should not call external AI APIs.
- Saving preferences should work regardless of role.
