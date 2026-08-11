import crypto from 'crypto';

export function getCoachVaultBlobToken() {
  // Prefer a CoachVault-specific name so multiple Blob stores in one Vercel
  // project cannot silently route upload/read operations to different stores.
  const token =
    process.env.COACHVAULT_BLOB_READ_WRITE_TOKEN ||
    process.env.BLOB_READ_WRITE_TOKEN ||
    '';

  return token;
}

export function blobTokenFingerprint(token = getCoachVaultBlobToken()) {
  if (!token) return 'missing';
  return crypto.createHash('sha256').update(token).digest('hex').slice(0,12);
}

export function blobTokenSource() {
  if (process.env.COACHVAULT_BLOB_READ_WRITE_TOKEN) return 'COACHVAULT_BLOB_READ_WRITE_TOKEN';
  if (process.env.BLOB_READ_WRITE_TOKEN) return 'BLOB_READ_WRITE_TOKEN';
  return 'missing';
}

export function assertCoachVaultBlobToken() {
  const token = getCoachVaultBlobToken();
  if (!token) {
    const error = new Error(
      'CoachVault does not have a Blob read/write token in this deployment.'
    );
    error.code = 'BLOB_TOKEN_MISSING';
    throw error;
  }
  return token;
}
