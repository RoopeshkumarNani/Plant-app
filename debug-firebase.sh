#!/bin/bash
# Test what's happening in Vercel by checking logs

echo "🔍 Checking Vercel deployment logs..."
echo ""
echo "To debug your Vercel issue, go to:"
echo "1. https://vercel.com/dashboard"
echo "2. Click on 'plant-app-sigma' project"
echo "3. Go to 'Deployments' tab"
echo "4. Click on the latest deployment (should be in progress or just finished)"
echo "5. Click 'Functions' and then click the 'server.js' function"
echo "6. Click on the most recent log entry"
echo ""
echo "Look for these messages:"
echo "✅ Firebase Admin SDK initialized = Good"
echo "❌ Firebase initialization failed = Problem with private key format"
echo "⚠️  Firebase credentials not found = Env variables not set"
echo ""
echo "Common Firebase Private Key Issue:"
echo "The FIREBASE_PRIVATE_KEY might have literal \\n instead of real newlines."
echo ""
echo "If you see: Firebase initialization failed: [error about PEM format]"
echo "Then the private key needs to be reformatted."
echo ""
echo "Run this to check local Firebase credentials:"
node -e "
const key = process.env.FIREBASE_PRIVATE_KEY || 'NOT SET';
if (key === 'NOT SET') {
  console.log('❌ FIREBASE_PRIVATE_KEY not set in .env');
} else {
  console.log('FIREBASE_PRIVATE_KEY first 100 chars:');
  console.log(key.substring(0, 100));
  console.log('');
  console.log('Contains actual newlines:', key.includes('\n') ? '✅ YES' : '❌ NO');
  console.log('Contains literal \\\\n:', key.includes('\\\\n') ? '⚠️  YES (might be problem)' : '✅ NO');
}
"
