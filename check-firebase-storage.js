const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase
const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SDK || '{}');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'my-soulmates.appspot.com'
});

const bucket = admin.storage().bucket();

async function checkFirebaseStorage() {
  try {
    console.log("Ì¥• Checking Firebase Storage...\n");
    const [files] = await bucket.getFiles({ maxResults: 10 });
    
    if (files.length === 0) {
      console.log("‚ùå No files in Firebase Storage");
    } else {
      console.log(`‚úÖ Found ${files.length} files in Firebase Storage:\n`);
      files.forEach((file, idx) => {
        console.log(`   ${idx + 1}. ${file.name}`);
      });
    }
  } catch (e) {
    console.error("‚ùå Error checking Firebase Storage:", e.message);
  }
}

checkFirebaseStorage();
