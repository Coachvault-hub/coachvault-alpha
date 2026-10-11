'use client';

export async function getCurrentCoachVaultSession() {
  try {
    const response = await fetch('/api/auth/session',{ cache:'no-store' });
    if (!response.ok) return null;
    return await response.json();
  } catch (_) {
    return null;
  }
}

export async function signOutCoachVault() {
  try { await fetch('/api/auth/session',{ method:'DELETE' }); } catch (_) {}
}

export function roleCanManage(role) {
  return role === 'administrator' || role === 'admin' || role === 'director';
}

export function hasSupabaseConfig() {
  return false;
}
