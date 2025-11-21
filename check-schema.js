const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkSchema() {
  try {
    // Try a simple query to see what columns exist
    const { data, error } = await supabase
      .from('plants')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error("❌ Error:", error.message);
    } else {
      console.log("✅ Plants table columns:");
      if (data && data.length > 0) {
        console.log(Object.keys(data[0]));
      } else {
        console.log("(empty table - trying select *)");
        const { data: emptyData } = await supabase
          .from('plants')
          .select();
        console.log("Returned structure:", emptyData);
      }
    }
  } catch (e) {
    console.error("Error:", e.message);
  }
}

checkSchema();
