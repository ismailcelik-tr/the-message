# Push Notification Admin Tool

The v1 push stack uses Expo Push Service. Do not enable Apple Broadcast Capability, and do not create APNs SSL certificates in the App ID configuration for this flow.

## Apple and EAS setup

1. Apple Developer > Identifiers > `com.themessage.cagri`
   - Enable `Push Notifications`.
   - Leave `Broadcast Capability` unchecked.
   - Do not create Development or Production SSL certificates in the Push Notifications `Configure` modal.
2. Configure APNs credentials through EAS:
   ```bash
   cd apps/mobile
   eas credentials
   ```
3. Build a new iOS binary after the capability change.

## Backend setup

Add these environment variables to the API runtime:

```bash
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
ADMIN_PUSH_SECRET=<long-random-secret>
EXPO_ACCESS_TOKEN=<optional-expo-access-token>
```

Apply `supabase/migrations/006_push_notifications.sql` before using the admin tool.

For scheduled sends, call this endpoint every minute from Cloud Scheduler or an equivalent cron:

```http
POST /api/admin/push/process-due
x-admin-push-secret: <ADMIN_PUSH_SECRET>
```

## Admin web tool

Run locally:

```bash
npm run admin:dev
```

Open `http://localhost:5174`, enter `ADMIN_PUSH_SECRET`, compose a notification, preview it, choose filters, then send immediately or schedule it in Turkey time.
