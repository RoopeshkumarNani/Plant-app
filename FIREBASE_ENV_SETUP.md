# Firebase Environment Variables for Vercel

Your Firebase credentials have been extracted and are ready to be added to Vercel.

## Steps to Add Environment Variables to Vercel

1. Go to: https://vercel.com/dashboard
2. Click on your project: **plant-app-sigma**
3. Go to: **Settings → Environment Variables**
4. Add these 5 variables one at a time

---

## Variable 1: FIREBASE_PROJECT_ID

**Variable Name:** `FIREBASE_PROJECT_ID`

**Value:**

```
my-soulmates
```

---

## Variable 2: FIREBASE_PRIVATE_KEY_ID

**Variable Name:** `FIREBASE_PRIVATE_KEY_ID`

**Value:**

```
c34fa7f23e226c9815b706fb6756aaf3df14304a
```

---

## Variable 3: FIREBASE_CLIENT_EMAIL

**Variable Name:** `FIREBASE_CLIENT_EMAIL`

**Value:**

```
firebase-adminsdk-fbsvc@my-soulmates.iam.gserviceaccount.com
```

---

## Variable 4: FIREBASE_CLIENT_ID

**Variable Name:** `FIREBASE_CLIENT_ID`

**Value:**

```
110143004379709851929
```

---

## Variable 5: FIREBASE_PRIVATE_KEY

**Variable Name:** `FIREBASE_PRIVATE_KEY`

**Value (keep the `\n` characters exactly as shown):**

```
-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDO6ktJYEKJnHAdo8kzoyb\noPbn99WpkRG+wIfRzdaKVky3NOipKChYbx13eSP3DRzBuRFhdOGc/Lwf2\nVXNdFr2FKv8M9vA9vx5xbaGizt5VLWqio9vuCJEOR+7puh01GswSOq3DOtMkr\n/pD\nuZdGomXu6KNUc1ORqi0Nnedy6\n/OL7JxosWutGGwPegjBgQVwb+IuGFU\nZToA5Ioe6\ndl+d4IWRL2mpOIkjM5y\nAiCMcCcEOsGOd6SWfEENQphCGCCtyJ\nxw24XI7lqWCmLga\nAoKTDpyCvhw18\nVVdEUXXFlIxxm7vNY27IuAcpBaBIJc\nyAeK39tOycEHMXbm7k540\nn1OwCg6\n1AgMBAAECggEAKalEAmCm1QVSD624J\n7T8cvtmtQsSYmDjKhAUI6E2XK53\nJODGvgSc4ff43vZMXeK6DiGltxNRuoe\nSL1eSNFaNT0BSfT5FLfGKxCTiTCEh4\n/2S\ngG/Eqv8/kaQLJzVJhzU/jJYTA\nYGZHMRv++3k1xyAsKNXq3vTAjvE+X5\nnKRz3+x6K\nxdJpgwNtKdY5CCWLZkk\nytUV96E9nD2vzs8vgX0xAFLPFMF5cK\nsFBPBgObPMYoApI\noRtHVOZxM8Xu6\n94oeSo3cw2YG1guyQb6BWp+Jq69eYh\neMaZpxU1/mgGbYFd1xdgb\nk4ly1OY\nM4gxj07NJMihmAwoPJ8FvPuaRJ46J4\npbOQQKBgQDrEwe5fQq92GN+ghZ5\n8\nxNZxoUFUNr/8raEJJDLUMsz0Bp8K14\ngA1av71wXqLZY1rRL5UPebsDSa5Yfi\nC3u\nn580SL0bLA/+6EiAVrRzpvFiR\nPeC6R4rp5TNzZCjlrBPphQasI7rFae\nXZerdtOxp\nwHD3i7Nvu+AygjuiigU\newUds1QKBgQDhVY/x7f7pzINopgO4l\nu3zJaOG7FiL6LyG\nHgnk1FT0nPN7t\nuFRCVSsmMCES+JR4FW10YnO32oV7ly\n5mOF6Ia5z4W8J71g0Ds7/\n3ztTZKb\nkChOL9jz0p2fn+nGkwFax2dd6A1TUj\ncEqBfOFyM1S6e5UIp+PjZ9GhEM2\nt\nagtIZOKYQKBgDnRMWou1hCBg18fMdY\nGsjC3ggofq+2dzcRMlgxbr87rlUgLB\npiL\nGawmDBmJlmfdTvUHy5yO0wAuE\n/tnbByvx+F9Ln3bZYfFq+dc6/8yBVa\ntLc9V9OS5\n0ACaWcPSkUTVzUYPPOe\nXKOQ03gJvuGH+Qgqwoo6NwAPMQkyk8\n8NvuFiNAoGAUOAG\n1AxZq8xtdcfwG\nfaB3P0rXifB+CVGVNS/NFRJUaprcYH\nICO/SZkhFALbDuiNMX/+e\n+JMTXl+\n5BBwtAUrJdGn7EpPHEpgmD4wtnNbJV\n5uOPHPamOzkzEwFMd6evyKyxeYg\nM\nlHWfKC6MNBLcXDoy2XJ4xovin26Kg6\n1F82vSMECgYABmLdFW5yErsR1XPl3G\nUgW\ntPnzxmJCZ4JbZeRlONglzhByr\n1LQqIQbPv1LTyY6REn5EB26sWVuGsG\nsep70rouC\n63hs3ZUvjsNOsQ2YssN\nqxzgheGAzVI8DSvqi5ZB1tuaGNUSQR\nBivveeccDkbBS5L\nsvy9RQp7oHVpk\noJdhn8vmQ==\n-----END PRIVATE KEY-----\n
```

---

## ⚠️ Important Notes

1. **Copy the ENTIRE value** for the private key, including the BEGIN and END lines
2. **Keep all the `\n` characters exactly as they are** - do NOT replace them with actual newlines
3. After adding all 5 variables, **Vercel will automatically redeploy** your backend
4. The deployment should complete in 2-3 minutes
5. Once deployed, image uploads will use Firebase Storage and persist reliably

---

## What This Fixes

- ✅ Image uploads will now use Firebase Storage (permanent storage)
- ✅ Images will persist after page refresh
- ✅ No more "net::ERR_TOO_MANY_REDIRECTS" errors
- ✅ Plant images stay in Plants section
- ✅ Flower images stay in Flowers section

---

## Testing After Setup

1. Upload a new plant or flower image
2. Check browser console - you should see: `✅ Image uploaded to Firebase Storage: [URL]`
3. Verify the image displays in the gallery
4. Refresh the page - image should still be there
5. Try deleting an image - should work without errors

---

## If Something Goes Wrong

If you see errors in the browser console like:

- `❌ CRITICAL: Both Firebase AND Supabase uploads failed!`
- `❌ Missing environment variable: FIREBASE_PROJECT_ID`

Then one or more of these environment variables wasn't added correctly. Double-check the values above and ensure they're exactly as shown (no extra spaces, keep `\n` in the private key).
