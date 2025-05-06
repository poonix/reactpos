import { supabase } from '../pos-backend/supabase';

// Get single setting by key
export async function getSetting(key) {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', key)
    .single(); // hanya ambil 1 data

  if (error) {
    console.error('Error getting setting:', error.message);
    return null;
  }

  return data?.value;
}

// Update setting by key
export async function updateSetting(key, value) {
  const { data, error } = await supabase
    .from('settings')
    .update({ value })
    .eq('key', key);

  if (error) {
    console.error('Error updating setting:', error.message);
    return false;
  }

  return true;
}

// Get all settings
export async function getAllSettings() {
  const { data, error } = await supabase
    .from('settings')
    .select('*');

  if (error) {
    console.error('Error getting all settings:', error.message);
    return [];
  }

  return data;
}
