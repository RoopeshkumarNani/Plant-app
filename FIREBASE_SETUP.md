# Firebase + Render Hybrid Setup

## Step 1: Enable Firebase Realtime Database

1. Go to: https://console.firebase.google.com/project/my-soulmates/database
2. Click **"Create Database"**
3. Select **"Start in production mode"**
4. Choose region: **us-central1**

## Step 2: Add Credentials to Render

Go to: https://dashboard.render.com/services/plant-app-backend-h28h

### Environment Variables to Add:

```
FIREBASE_PROJECT_ID=my-soulmates
FIREBASE_PRIVATE_KEY_ID=f589f6f1d4f47b3fa665cef09421ef7d1a2b650b
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCxo1kjTjeBu9LY\nNGg3392mZA80MxrD5/wB8lZlmkHUp+pa6uX/HtGjL1aOigKFU2p684dteLW6ltcC\njeumgBaVDplqrY7n7UEgkfDneMlrYyvkz2qs4l/UYf5itGrzFON2RG7uwbmTXw7p\nruNzw4Oo2ChJBYGaUvn5FB46EwV0FusC6gEf6GRe4xTbq92PIpg/XFYAuetAa+qb\nHSG1mvN2Eoe8bQZk0BzgCnNqImn/iQ5l34oHI/vWfR7/GMhvNEprB+ApXRKk5er2\nO8iT5wk9YE/Um6VG8nJ6zivKKpoBZfpMku16fibOUF3NOYvbxvU/J2VKCYPC/0k+\n4Guy6SOVAgMBAAECggEACKJD3C9vteKHJkhbIxFtGH/sgpZT9V76egMT/UQ4xuPn\nxBt+qkkOhLvxnQ6gKL1xLiCqsxYW3xwjFIC0ChetAU8AWJWu8x7Y94L1uTUUX8p7\ngQIue9CqOmG47Ns6si3luwMrJnehVBm0A9pNkSbY6K/45UkF5OumMrEDocGi6413\nbVN0nNNNxViA+/U8D4hlhjaWAXg3GzZ1wYHPQhvOGWRtWEDguiaDEysM/VZTrr/C\nAopafh42HlzUp2Z3YRCk2WjEHkciTCBDK+DqgHuKSFM/D5t7SqHxZqAaZ6Z+tguA\nQBSdDzkonvXN1lVYN7qLZ+DSmqZ6vYAM3uYXqZm5gQKBgQDtZ9maBc5R9DDumFX3\nnKBFI/8+WGIBs4UkCX8a2LB1oT7gz+Z9kOGGk8T5vuN+pGb6ROD4uBb2I4eHEVCl\nF1GyPQfYfZt2xsFLIHr3MQXYkAxzI+q27Ph/h0Gtoqd7GFTEC5awAnShpuFi3j4K\nF0qDYIdqmEigkARhpw8Y809yXQKBgQC/jR2/supkcozHSLq7c32GVThR1v4syMix\nkYuIvqpk+07FTVMgiMSyc9spe9RuAIXIE5IKd2SNGbNy8NpYh/9EHDBzHrCGSAYI\nn70XJAc5J0HorUWlvi1GYbF8kRjzrrPoRs8/1uhrv4KGqACo5qlp2jaNAdIHNK9G\nZ64TqDxSmQKBgGc1LZFbEs3oFdm0GjNyQO6t7onhDIJm0+vNwRcfut74gYhkeXR/\nJrxFw207glUNDcOhbBhUl47b9VBPw7pxv8933tBMEuj5EREjBrIt+reiL/diVui9\nbm6qk2/z9VF7S2aLDzBncOLR1MwRh/EFHRyuO1Co8XH0CiOV5+dV52T1AoGAQCTH\nQ3xsVTquvcUzErZ34FYFSBKQhvqtihjM+vuuH6awGA3uukRSade2GkwnNLbkFb3H\n981HVKC4oNLaqy7PYkV2S/aI8k6IBrdHIMqlyJPG1F3BpuDqVFk+kBIeoutrv2qG\n2D/lEL/Ou7zii6zCKnoyLkHfzR3tW8w4VMjPenECgYBYvoUYLsvHHgDSuUbbjEsv\nBzpjdScU789jAf9sstwEGDW0KOsoqPk1BOdhepthljv0dit1lcgvgiSUShylnjAX\nyWFprmGM6NrsCMA/a5CFM11Mo6osGpZfP9s14sOn/dr/goEriHgDnaydTFnX5xKZ\nmg5dMhkM5NRJaWSMQYnKxQ==\n-----END PRIVATE KEY-----\n
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@my-soulmates.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=110143004379709851929
```

**Important:** After adding environment variables, click **"Save"** and Render will auto-redeploy.

## Step 3: Verify Setup

Wait 2-3 minutes for Render to redeploy, then check logs for:
```
✅ Firebase Admin SDK initialized
```

If you see this, Firebase is connected! ✨
