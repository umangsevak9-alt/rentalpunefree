const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://ddfsfemggwjtryosdgya.supabase.co';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_l4em_aFSdxQIpW2gLbShHA_r8Gjpt-j';

const supabase = createClient(url, key);

async function run() {
  try {
    const { data: subs, error } = await supabase.from('owner_submissions').select('*');
    if (error) {
      console.error('Error fetching submissions:', error);
    } else {
      console.log('Successfully fetched submissions! Total count:', subs.length);
      console.log('Submissions:', subs);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

run();
