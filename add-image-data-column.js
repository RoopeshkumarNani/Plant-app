#!/usr/bin/env node

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function addImageDataColumn() {
  try {
    console.log("🔧 Adding image_data column to images table...");

    // Using raw SQL to add the column if it doesn't exist
    const { error } = await supabase.rpc("execute_sql", {
      sql: `
        ALTER TABLE images
        ADD COLUMN IF NOT EXISTS image_data TEXT;
      `,
    });

    if (error && !error.message.includes("does not exist")) {
      console.error("❌ Error:", error);
      return;
    }

    console.log("✅ Column added successfully!");

    // Verify the table structure
    const { data: rows } = await supabase.from("images").select("*").limit(1);

    if (rows && rows.length > 0) {
      console.log("✅ Sample record keys:", Object.keys(rows[0]));
    }
  } catch (error) {
    console.error("❌ Exception:", error.message);
  }

  process.exit(0);
}

addImageDataColumn();
