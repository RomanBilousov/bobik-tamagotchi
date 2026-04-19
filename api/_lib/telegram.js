import crypto from 'node:crypto';

export function getJsonBody(req) {
  if (!req.body) {
    return {};
  }

  if (typeof req.body === 'string') {
    return JSON.parse(req.body);
  }

  return req.body;
}

export function getBearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization || '';
  if (!header.startsWith('Bearer ')) {
    return '';
  }

  return header.slice('Bearer '.length).trim();
}

export function validateTelegramInitData(initData, botToken, maxAgeSeconds = 3600) {
  if (!initData || !botToken) {
    throw new Error('Missing Telegram init data');
  }

  const params = new URLSearchParams(initData);
  const receivedHash = params.get('hash');

  if (!receivedHash) {
    throw new Error('Telegram hash is missing');
  }

  const entries = [];
  for (const [key, value] of params.entries()) {
    if (key === 'hash') {
      continue;
    }
    entries.push([key, value]);
  }

  entries.sort(([left], [right]) => left.localeCompare(right));
  const dataCheckString = entries.map(([key, value]) => `${key}=${value}`).join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  if (calculatedHash !== receivedHash) {
    throw new Error('Telegram init data signature is invalid');
  }

  const authDate = Number(params.get('auth_date') || 0);
  if (!authDate || Date.now() / 1000 - authDate > maxAgeSeconds) {
    throw new Error('Telegram init data is outdated');
  }

  const userRaw = params.get('user');
  const user = userRaw ? JSON.parse(userRaw) : null;

  return {
    authDate,
    startParam: params.get('start_param') || params.get('tgWebAppStartParam') || '',
    queryId: params.get('query_id') || '',
    user,
  };
}

async function telegramApi(botToken, method, payload) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.description || `Telegram API error: ${method}`);
  }

  return data.result;
}

export function escapeTelegramHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

export async function sendTelegramMessage(botToken, chatId, text, extra = {}) {
  return telegramApi(botToken, 'sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...extra,
  });
}

export async function editTelegramMessage(botToken, chatId, messageId, text, extra = {}) {
  return telegramApi(botToken, 'editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...extra,
  });
}

export async function answerTelegramCallback(botToken, callbackQueryId, text) {
  return telegramApi(botToken, 'answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text,
    show_alert: false,
  });
}

export async function setTelegramWebhook(botToken, url) {
  return telegramApi(botToken, 'setWebhook', {
    url,
    allowed_updates: ['message', 'callback_query'],
    drop_pending_updates: false,
  });
}

export async function setTelegramCommands(botToken, commands) {
  return telegramApi(botToken, 'setMyCommands', {
    commands,
  });
}
