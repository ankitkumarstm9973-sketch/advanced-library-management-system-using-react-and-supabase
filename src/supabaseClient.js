import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fkmibhvurekkuzcnlxfg.supabase.co'

const supabaseAnonKey = 'sb_publishable_QU7xbDwPWcXFWZ240wuSlA_Vo9PiIiB'

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
)