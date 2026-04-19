import { supabase } from '../lib/supabase/client';
import { getTelegramStartParam, getTelegramWebApp, isTelegramMiniApp } from '../lib/telegram/webApp';

async function getAccessToken() {
  if (!supabase) {
    return '';
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }

  return data.session?.access_token || '';
}

export async function trackPlayerEvent(type, payload = {}, options = {}) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return null;
  }

  const includeTelegram = options.includeTelegram ?? isTelegramMiniApp();
  const webApp = getTelegramWebApp();

  const response = await fetch('/api/analytics/track', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      type,
      source: includeTelegram ? 'telegram' : 'web',
      payload,
      startParam: getTelegramStartParam(),
      telegramInitData: includeTelegram ? webApp?.initData || '' : '',
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || 'Could not track analytics event');
  }

  return data?.result || null;
}

export async function trackPlayerEventSafely(type, payload = {}, options = {}) {
  try {
    return await trackPlayerEvent(type, payload, options);
  } catch (error) {
    console.error(`Analytics event failed: ${type}`, error);
    return null;
  }
}
