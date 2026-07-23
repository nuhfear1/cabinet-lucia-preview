(() => {
  'use strict';

  const api = {};

  const getConfig = () => window.CABINET_LUCIA_BACKEND || Object.freeze({
    enabled: false,
    baseUrl: '',
    timeoutMs: 8000,
    environment: 'preview'
  });

  const requestId = () => globalThis.crypto?.randomUUID?.() || `req-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const idempotencyKey = () => globalThis.crypto?.randomUUID?.() || `booking-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const request = async (path, options = {}) => {
    const config = getConfig();
    if (!config.enabled || !config.baseUrl) return { enabled: false, data: null };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs || 8000);
    try {
      const response = await fetch(`${config.baseUrl}${path}`, {
        ...options,
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-store',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Id': requestId(),
          ...(options.headers || {})
        }
      });

      const body = await response.json().catch(() => null);
      if (!response.ok) {
        const error = new Error(body?.error?.message || 'Le service est momentanément indisponible.');
        error.code = body?.error?.code || `HTTP_${response.status}`;
        error.status = response.status;
        throw error;
      }
      return { enabled: true, data: body };
    } finally {
      clearTimeout(timeout);
    }
  };

  api.askAssistant = async (question) => request('/api/public/assistant', {
    method: 'POST',
    body: JSON.stringify({ question })
  });

  api.submitAppointmentRequest = async (payload, key) => request('/api/public/appointment-requests', {
    method: 'POST',
    headers: { 'Idempotency-Key': key },
    body: JSON.stringify(payload)
  });

  api.createIdempotencyKey = idempotencyKey;
  api.getConfig = getConfig;
  window.CabinetLuciaApi = Object.freeze(api);
})();
