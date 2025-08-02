import { supabase } from '../lib/supabase';

export async function createProfile({ id, username }: { id: string; username: string }) {
  const { error } = await supabase.from('profiles').upsert([
    { id, username, rating: 1200 }
  ]);
  if (error) throw error;
}

export async function getProfile(id: string) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function updateProfile(id: string, updates: Partial<{ username: string; avatar_url: string; rating: number }>) {
  const { error } = await supabase.from('profiles').update(updates).eq('id', id);
  if (error) throw error;
}

export async function getAllProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('username', { ascending: true });
  if (error) throw error;
  return data || [];
}
