/* eslint-env node */

import { callSupabaseRpc } from '../_lib/supabase.js';
import {
  escapeTelegramHtml,
  getBearerToken,
  getJsonBody,
  sendTelegramMessage,
  validateTelegramInitData,
} from '../_lib/telegram.js';

const TELEGRAM_GAME_BOT_TOKEN = process.env.TELEGRAM_GAME_BOT_TOKEN?.trim();
const TELEGRAM_ADMIN_BOT_TOKEN = process.env.TELEGRAM_ADMIN_BOT_TOKEN?.trim();
const ADMIN_RPC_SECRET = process.env.ADMIN_RPC_SECRET?.trim();
const REOPEN_NOTIFY_COOLDOWN_MS = 15 * 60 * 1000;

function buildPlayerLabel(record, telegramUser) {
  const name =
    [telegramUser?.first_name, telegramUser?.last_name].filter(Boolean).join(' ').trim() ||
    record?.nickname ||
    'Игрок';
  const username = telegramUser?.username || record?.telegramUsername;
  return username ? `${name} (@${username})` : name;
}

function shouldNotifyReopen(previousSeenAt) {
  if (!previousSeenAt) {
    return true;
  }

  const previous = new Date(previousSeenAt).getTime();
  if (!Number.isFinite(previous)) {
    return true;
  }

  return Date.now() - previous >= REOPEN_NOTIFY_COOLDOWN_MS;
}

async function loadAdminChatIds() {
  if (!ADMIN_RPC_SECRET) {
    return [];
  }

  const result = await callSupabaseRpc('list_admin_bot_chats', {
    p_secret: ADMIN_RPC_SECRET,
  });

  return Array.isArray(result) ? result.map((row) => row.chat_id).filter(Boolean) : [];
}

async function notifyAdmin(text) {
  if (!TELEGRAM_ADMIN_BOT_TOKEN) {
    return;
  }

  const chatIds = await loadAdminChatIds();
  if (!chatIds.length) {
    return;
  }

  await Promise.allSettled(chatIds.map((chatId) => sendTelegramMessage(TELEGRAM_ADMIN_BOT_TOKEN, chatId, text)));
}

function buildNotificationText(eventType, record, telegramUser, payload = {}) {
  const player = escapeTelegramHtml(buildPlayerLabel(record, telegramUser));
  const nickname = escapeTelegramHtml(record?.nickname || 'Игрок');
  const source = escapeTelegramHtml(record?.source || payload?.source || 'web');

  if (eventType === 'session_started') {
    if (record?.isFirstSession) {
      return `🆕 <b>Новый игрок</b>\n${player}\nПрофиль: <b>${nickname}</b>\nИсточник: <b>${source}</b>`;
    }

    return `↩️ <b>Игрок вернулся</b>\n${player}\nПрофиль: <b>${nickname}</b>\nИсточник: <b>${source}</b>`;
  }

  if (eventType === 'account_secured') {
    return `🔐 <b>Аккаунт закреплён</b>\n${player}\nПрофиль: <b>${nickname}</b>`;
  }

  if (eventType === 'pet_adopted') {
    return `🐶 <b>Новый питомец</b>\n${player}\nПрофиль: <b>${nickname}</b>`;
  }

  return `📊 <b>Новое событие</b>\n${player}\nТип: <b>${escapeTelegramHtml(eventType)}</b>`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const accessToken = getBearerToken(req);
    if (!accessToken) {
      res.status(401).json({ error: 'Missing access token' });
      return;
    }

    const body = getJsonBody(req);
    const eventType = String(body.type || '').trim().toLowerCase();
    const payload = body.payload && typeof body.payload === 'object' ? body.payload : {};

    if (!eventType) {
      res.status(400).json({ error: 'Missing event type' });
      return;
    }

    let result;
    let telegramUser = null;
    const source = body.telegramInitData ? 'telegram' : body.source || 'web';

    if (eventType === 'session_started' && body.telegramInitData && TELEGRAM_GAME_BOT_TOKEN) {
      const telegramData = validateTelegramInitData(body.telegramInitData, TELEGRAM_GAME_BOT_TOKEN);
      telegramUser = telegramData.user;

      result = await callSupabaseRpc(
        'sync_telegram_session',
        {
          p_telegram_user_id: telegramUser?.id,
          p_telegram_username: telegramUser?.username || null,
          p_telegram_first_name: telegramUser?.first_name || null,
          p_telegram_last_name: telegramUser?.last_name || null,
          p_telegram_language_code: telegramUser?.language_code || null,
          p_telegram_photo_url: telegramUser?.photo_url || null,
          p_telegram_is_premium: Boolean(telegramUser?.is_premium),
          p_start_param: telegramData.startParam || body.startParam || null,
          p_payload: {
            ...payload,
            authDate: telegramData.authDate,
            queryId: telegramData.queryId,
          },
        },
        accessToken,
      );

      if (result?.isFirstSession || shouldNotifyReopen(result?.previousSeenAt)) {
        await notifyAdmin(buildNotificationText(eventType, { ...result, source }, telegramUser, payload));
      }
    } else {
      result = await callSupabaseRpc(
        'record_player_event',
        {
          p_event_type: eventType,
          p_source: source,
          p_payload: payload,
        },
        accessToken,
      );

      if (eventType === 'account_secured' || eventType === 'pet_adopted') {
        await notifyAdmin(buildNotificationText(eventType, { ...result, source }, telegramUser, payload));
      }
    }

    res.status(200).json({
      ok: true,
      result,
    });
  } catch (error) {
    console.error('Analytics tracking failed', error);
    res.status(500).json({
      error: error.message || 'Analytics tracking failed',
    });
  }
}
