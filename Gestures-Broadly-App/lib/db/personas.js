// src/lib/db/personas.js
import { supabase } from '../../03_supabaseClient'; // adjust if your client lives elsewhere

export async function listPersonas() {
  return await supabase
    .from('personas')
    .select('id, name, active, created_at')
    .order('created_at', { ascending: false });
}

export async function addPersona(name) {
  return await supabase
    .from('personas')
    .insert({ name, active: true }) // owner_id auto-filled by trigger
    .select('id, name, active, created_at')
    .single();
}

export async function setPersonaActive(id, active) {
  return await supabase
    .from('personas')
    .update({ active })
    .eq('id', id)
    .select('id, name, active, created_at')
    .single();
}

export async function removePersona(id) {
  return await supabase
    .from('personas')
    .delete()
    .eq('id', id);
}
