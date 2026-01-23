import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zdvedfnpipgygvikoooa.supabase.co';
const SUPABASE_ANON_KEY =
  'sb_publishable_1EEA1MtGEqz8vWJAApQM6Q_FnjK-aaw';

// TODO: Move URL and key into environment variables before production.

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

