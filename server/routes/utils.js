const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');

const supabase_url = process.env.SUPABASE_URL;
const supabase_key = process.env.SUPABASE_KEY;
const openaisecret = process.env.OPENAI_API_KEY;

const supabase = createClient(supabase_url, supabase_key);

const openai = new OpenAI({
  apiKey: openaisecret,
});

module.exports = {supabase, openai };