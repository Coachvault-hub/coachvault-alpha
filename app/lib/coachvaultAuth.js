'use client';

import { createClient } from '@supabase/supabase-js';

export const DEMO_ORG = {
  id:'demo-org',
  name:'South Carroll Select',
  slug:'south-carroll-select'
};

export const DEMO_DIRECTOR = {
  id:'demo-director',
  email:'director@coachvault.demo',
  full_name:'Club Director',
  role:'director',
  organization_id:'demo-org'
};

export const DEMO_COACH = {
  id:'demo-coach',
  email:'coach@coachvault.demo',
  full_name:'Coach Demo',
  role:'coach',
  organization_id:'demo-org',
  team_name:'2032 Boys'
};

export function hasSupabaseConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

let client = null;
export function getSupabaseClient() {
  if (!hasSupabaseConfig()) return null;
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }
  return client;
}

export function saveDemoSession(user) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('coachvault-demo-session-v1', JSON.stringify({
    user,
    organization:DEMO_ORG,
    created_at:new Date().toISOString()
  }));
  document.cookie = `coachvault_demo_role=${user.role}; path=/; max-age=2592000; SameSite=Lax`;
}

export function loadDemoSession() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('coachvault-demo-session-v1');
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

export function clearDemoSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('coachvault-demo-session-v1');
  document.cookie = 'coachvault_demo_role=; path=/; max-age=0; SameSite=Lax';
}

export async function getCurrentCoachVaultSession() {
  const supabase = getSupabaseClient();
  if (!supabase) return loadDemoSession();

  const { data:{ session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const { data:profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, organization_id, team_name, organizations(id,name,slug)')
    .eq('id', session.user.id)
    .maybeSingle();

  if (!profile) return { user:session.user, organization:null };

  return {
    user:profile,
    organization:profile.organizations || null
  };
}

export async function signOutCoachVault() {
  const supabase = getSupabaseClient();
  if (supabase) await supabase.auth.signOut();
  clearDemoSession();
}

export function roleCanManage(role) {
  return role === 'director' || role === 'admin';
}
