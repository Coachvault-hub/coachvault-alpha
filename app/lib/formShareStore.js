'use client';

import { readLocal, writeLocal } from './roadmapStore';

export const SHARE_KEY = 'coachvault-form-shares-v1';

export function makeShareToken() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replaceAll('-','');
  }
  return `${Date.now()}${Math.random().toString(36).slice(2,12)}`;
}

export function getShares() {
  return readLocal(SHARE_KEY, []);
}

export function saveShares(shares) {
  writeLocal(SHARE_KEY, shares);
}

export function createShare({
  form,
  createdBy,
  organizationId,
  scope='team',
  teamName='',
  label='',
  allowAnonymous=true
}) {
  const token = makeShareToken();
  return {
    id:`share-${token}`,
    token,
    form_id:form.id,
    form_snapshot:form,
    created_by:createdBy?.id || '',
    created_by_name:createdBy?.full_name || createdBy?.email || '',
    organization_id:organizationId || '',
    scope,
    team_name:teamName || '',
    label:label || form.name,
    allow_anonymous:Boolean(allowAnonymous),
    active:true,
    created_at:new Date().toISOString()
  };
}

export function shareUrl(token) {
  if (typeof window === 'undefined') return `/form/${token}`;
  return `${window.location.origin}/form/${token}`;
}
