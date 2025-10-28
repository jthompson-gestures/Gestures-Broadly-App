// src/data/04_personaRepo.js
import { supabase } from '../lib/03_supabaseClient';

// --- Personas ---
export async function listPersonas() {
  const { data, error } = await supabase
    .from('personas')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function upsertPersona(p) {
  const { data, error } = await supabase
    .from('personas')
    .upsert(p, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePersona(id) {
  const { error } = await supabase.from('personas').delete().eq('id', id);
  if (error) throw error;
}

// --- Favorites ---
export async function listFavorites(personaId) {
  const { data, error } = await supabase
    .from('persona_favorites')
    .select('*')
    .eq('persona_id', personaId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function addFavorite(personaId, category, value, wiki_url = '') {
  const { data, error } = await supabase
    .from('persona_favorites')
    .insert({ persona_id: personaId, category, value, wiki_url })
    .select()
    .single();
  if (error) throw error;
  return data;
}
