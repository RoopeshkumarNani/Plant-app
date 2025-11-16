/**
 * Automated Supabase Setup Script
 * This script helps set up your Supabase database and storage
 * 
 * Usage: node setup-supabase.js
 * 
 * Prerequisites:
 * 1. Have SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 * 2. Or pass them as environment variables
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yvpoabomcnwegjvfwtav.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY not found in environment');
  console.error('   Please set it in .env file or as environment variable');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function setupDatabase() {
  console.log('📊 Setting up database tables...\n');
  
  const schemaPath = path.join(__dirname, 'supabase-schema.sql');
  if (!fs.existsSync(schemaPath)) {
    console.error('❌ supabase-schema.sql not found!');
    return false;
  }
  
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  
  // Split by semicolons and execute each statement
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  console.log(`   Found ${statements.length} SQL statements to execute\n`);
  
  // Note: We can't execute SQL directly via JS client
  // This script will prepare the SQL for you to run in Supabase Dashboard
  console.log('⚠️  Note: SQL execution must be done in Supabase Dashboard');
  console.log('   1. Go to: https://supabase.com/dashboard/project/_/sql');
  console.log('   2. Copy the SQL from supabase-schema.sql');
  console.log('   3. Paste and run it\n');
  
  return true;
}

async function setupStorage() {
  console.log('📦 Setting up storage bucket...\n');
  
  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError.message);
      return false;
    }
    
    const imagesBucket = buckets?.find(b => b.name === 'images');
    
    if (imagesBucket) {
      console.log('✅ Storage bucket "images" already exists');
      console.log(`   Public: ${imagesBucket.public ? 'Yes' : 'No'}`);
      
      if (!imagesBucket.public) {
        console.log('⚠️  Warning: Bucket is not public. Making it public...');
        // Note: Making bucket public requires dashboard access
        console.log('   Please make it public in Supabase Dashboard → Storage → images → Settings');
      }
    } else {
      console.log('📝 Creating storage bucket "images"...');
      console.log('⚠️  Note: Bucket creation must be done in Supabase Dashboard');
      console.log('   1. Go to: https://supabase.com/dashboard/project/_/storage/buckets');
      console.log('   2. Click "Create bucket"');
      console.log('   3. Name: images');
      console.log('   4. Make it Public');
      console.log('   5. Click "Create"\n');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error setting up storage:', error.message);
    return false;
  }
}

async function testConnection() {
  console.log('🔍 Testing Supabase connection...\n');
  
  try {
    // Test database connection
    const { data: plants, error: dbError } = await supabase
      .from('plants')
      .select('id')
      .limit(1);
    
    if (dbError) {
      if (dbError.message.includes('relation "plants" does not exist')) {
        console.log('⚠️  Database tables not created yet');
        console.log('   Run the SQL schema in Supabase Dashboard first\n');
      } else {
        console.error('❌ Database error:', dbError.message);
        return false;
      }
    } else {
      console.log('✅ Database connection successful');
      console.log(`   Found ${plants?.length || 0} plants in database\n`);
    }
    
    // Test storage connection
    const { data: buckets, error: storageError } = await supabase.storage.listBuckets();
    
    if (storageError) {
      console.error('❌ Storage error:', storageError.message);
      return false;
    } else {
      console.log('✅ Storage connection successful');
      console.log(`   Found ${buckets?.length || 0} buckets\n`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Supabase Setup Script\n');
  console.log('='.repeat(50));
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`Service Key: ${SUPABASE_SERVICE_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log('='.repeat(50));
  console.log();
  
  // Test connection first
  const connectionOk = await testConnection();
  
  if (!connectionOk) {
    console.log('\n⚠️  Connection test failed. Please check:');
    console.log('   1. SUPABASE_URL is correct');
    console.log('   2. SUPABASE_SERVICE_ROLE_KEY is correct');
    console.log('   3. You have access to the Supabase project\n');
  }
  
  // Setup database
  await setupDatabase();
  
  // Setup storage
  await setupStorage();
  
  console.log('\n' + '='.repeat(50));
  console.log('📋 Next Steps:');
  console.log('='.repeat(50));
  console.log();
  console.log('1. Run SQL Schema:');
  console.log('   - Go to: https://supabase.com/dashboard');
  console.log('   - Click "SQL Editor"');
  console.log('   - Copy contents of supabase-schema.sql');
  console.log('   - Paste and click "Run"');
  console.log();
  console.log('2. Create Storage Bucket:');
  console.log('   - Go to: Storage → Buckets');
  console.log('   - Click "Create bucket"');
  console.log('   - Name: images');
  console.log('   - Make it Public');
  console.log();
  console.log('3. Set Storage Policies (in SQL Editor):');
  console.log('   CREATE POLICY "Public Access" ON storage.objects');
  console.log('   FOR SELECT USING (bucket_id = \'images\');');
  console.log();
  console.log('4. Add to Render Environment Variables:');
  console.log('   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
  console.log();
  console.log('5. Test the setup:');
  console.log('   node setup-supabase.js');
  console.log();
  console.log('✅ Setup complete when all tests pass!\n');
}

main().catch(console.error);

