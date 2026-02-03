// Minimal webhook guard. Returns null when webhooks are enabled.
// If webhooks are disabled for a provider, return an object { status, body } to send to the client.
export function requireWebhookEnabled(provider) {
  // Allow overriding per-provider via environment variable: WEBHOOKS_ENABLED (default 1) or <PROVIDER>_WEBHOOK_ENABLED
  const globalEnabled = String(process.env.WEBHOOKS_ENABLED || '1').trim() === '1';
  const specific = String(process.env[`${provider}_WEBHOOK_ENABLED`] || process.env[`${provider.toUpperCase()}_WEBHOOK_ENABLED`] || '').trim();
  if (specific) {
    if (specific === '1') return null;
    return { status: 403, body: { error: 'webhooks_disabled' } };
  }
  if (globalEnabled) return null;
  return { status: 403, body: { error: 'webhooks_disabled' } };
}
