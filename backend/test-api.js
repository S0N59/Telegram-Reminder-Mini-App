// Simple test script for the API
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envFile = readFileSync(join(__dirname, '.env.local'), 'utf-8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

// Test Supabase connection
console.log('🧪 Testing Backend Configuration...\n');

// Test 1: Check environment variables
console.log('1️⃣ Checking environment variables...');
const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'TELEGRAM_BOT_TOKEN'];
let allPresent = true;

required.forEach(key => {
  if (envVars[key] && envVars[key] !== `your_${key.toLowerCase().replace(/_/g, '-')}`) {
    console.log(`   ✅ ${key}: ${envVars[key].substring(0, 20)}...`);
  } else {
    console.log(`   ❌ ${key}: Missing or not configured`);
    allPresent = false;
  }
});

if (!allPresent) {
  console.log('\n❌ Please configure all environment variables in .env.local');
  process.exit(1);
}

// Test 2: Test Supabase connection
console.log('\n2️⃣ Testing Supabase connection...');
try {
  const supabase = createClient(envVars.SUPABASE_URL, envVars.SUPABASE_ANON_KEY);
  
  // Try to query the reminders table
  const { data, error } = await supabase
    .from('reminders')
    .select('id')
    .limit(1);
  
  if (error) {
    if (error.message.includes('relation "reminders" does not exist')) {
      console.log('   ⚠️  Database table "reminders" does not exist');
      console.log('   📝 Please create the table using the SQL from SETUP.md');
    } else {
      console.log(`   ❌ Database error: ${error.message}`);
    }
  } else {
    console.log('   ✅ Database connection successful!');
    console.log(`   ✅ Table "reminders" exists`);
  }
} catch (error) {
  console.log(`   ❌ Connection failed: ${error.message}`);
}

// Test 3: Check Telegram bot token format
console.log('\n3️⃣ Checking Telegram bot token...');
const botToken = envVars.TELEGRAM_BOT_TOKEN;
if (botToken && botToken.match(/^\d+:[A-Za-z0-9_-]+$/)) {
  console.log('   ✅ Bot token format is valid');
} else {
  console.log('   ⚠️  Bot token format might be invalid');
}

console.log('\n✅ Basic configuration test completed!');
console.log('\n📝 Next steps:');
console.log('   1. Make sure the "reminders" table exists in Supabase');
console.log('   2. Run: npm run dev');
console.log('   3. Test: curl http://localhost:3000/api/health');
