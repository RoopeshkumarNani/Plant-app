# How to Get/Set Invite Token

## What is Invite Token?

The invite token is an optional security feature. If set, it protects your API endpoints from unauthorized access.

## Where to Set It

### Option 1: Render Environment Variables (Recommended)

1. Go to: https://dashboard.render.com/web/srv-d4c9t41r0fns738773e0/
2. Click "Environment" tab
3. Add new variable:
   - **Key**: `INVITE_TOKEN`
   - **Value**: Any secret string you want (e.g., `my-secret-token-123`)
4. Click "Save Changes"
5. Render will restart automatically

### Option 2: If Not Set

If `INVITE_TOKEN` is **NOT set** in Render, the endpoints work without authentication (no token needed).

## How to Use It

### If Token is Set:

When calling API endpoints, include the header:
```
x-invite-token: YOUR_TOKEN_VALUE
```

### Example with curl:

```bash
curl -X POST https://plant-app-backend-h28h.onrender.com/admin/clear-all \
  -H "x-invite-token: YOUR_TOKEN_VALUE"
```

### If Token is NOT Set:

You can call endpoints directly without any token:
```bash
curl -X POST https://plant-app-backend-h28h.onrender.com/admin/clear-all
```

## Check if Token is Required

1. Go to Render Dashboard → Environment tab
2. Look for `INVITE_TOKEN` variable
3. If it exists → You need to use it
4. If it doesn't exist → No token needed!

## Recommendation

For testing, you can **remove** the `INVITE_TOKEN` from Render environment variables to make it easier. Just delete the variable and save.

