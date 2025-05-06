// pos-backend/supabase.js
import { createClient } from '@supabase/supabase-js';


const supabaseUrl = 'https://akykmjgkxmzhtbluefxu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFreWttamdreG16aHRibHVlZnh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1MzQyMjgsImV4cCI6MjA2MTExMDIyOH0.VZEPGDZTKah7n-NHd3waWzK3rifQL2CCm16e1HlSMyw';


export const supabase = createClient(supabaseUrl, supabaseAnonKey);
