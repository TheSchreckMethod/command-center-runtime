import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// RLS is disabled on all media/runtime tables — anon key has full access
const SUPABASE_DEFAULTS = {
  url: 'https://juuisrycwhietlnizudj.supabase.co',
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1dWlzcnljd2hpZXRsbml6dWRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0MDMyMDksImV4cCI6MjA4Nzk3OTIwOX0.dhH1NhPupXvtXtl35cXWBHQGj-SPAehQ9kLuMd9jF34',
};

@Injectable()
export class SupabaseService {
  readonly client: SupabaseClient;

  constructor() {
    this.client = createClient(
      process.env.SUPABASE_URL || SUPABASE_DEFAULTS.url,
      process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_DEFAULTS.key,
      { auth: { persistSession: false } },
    );
  }
}
