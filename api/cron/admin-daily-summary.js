/* eslint-env node */

import { callSupabaseRpc } from '../_lib/supabase.js';
import { escapeTelegramHtml, sendTelegramMessage } from '../_lib/telegram.js';

const TELEGRAM_ADMIN_BOT_TOKEN = process.env.TELEGRAM_ADMIN_BOT_TOKEN?.trim();
const ADMIN_RPC_SECRET = process.env.ADMIN_RPC_SECRET?.trim();
const CRON_USER_AGENT = 'vercel-cron/1.0';
const KYIV_TIMEZONE = 'Europe/Kiev';

function formatDate(value) {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: KYIV_TIMEZONE,
  }).format(new Date(value));
}

async function loadAdminChatIds() {
  const result = await callSupabaseRpc('list_admin_bot_chats', {
    p_secret: ADMIN_RPC_SECRET,
  });

  return Array.isArray(result) ? result.map((row) => row.chat_id).filter(Boolean) : [];
}

async function loadDailySummary() {
  return callSupabaseRpc('get_admin_daily_summary', {
    p_secret: ADMIN_RPC_SECRET,
  });
}

function renderDailySummary(summary) {
  const totals = summary?.totals || {};
  const newPlayers = Array.isArray(summary?.newPlayers) ? summary.newPlayers : [];
  const topEventPlayers = Array.isArray(summary?.topEventPlayers) ? summary.topEventPlayers : [];

  const blocks = [
    '🌅 <b>Ежедневная сводка Bobik</b>',
    `${formatDate(summary?.sinceAt)} → ${formatDate(summary?.untilAt)}`,
    '',
    `🆕 Новых реальных игроков: <b>${totals.newPlayers ?? 0}</b>`,
    `🧪 Новых гостевых профилей: <b>${totals.newGuestProfiles ?? 0}</b>`,
    `🏷️ Новых тестовых профилей: <b>${totals.newTestProfiles ?? 0}</b>`,
    `↩️ Возвратов: <b>${totals.returningSessions ?? 0}</b>`,
    `🔐 Закрепили аккаунт: <b>${totals.securedAccounts ?? 0}</b>`,
    `🐶 Новых питомцев: <b>${totals.petsAdopted ?? 0}</b>`,
    `💎 Кладов найдено: <b>${totals.treasuresFound ?? 0}</b>`,
    `🥩 Кормов куплено: <b>${totals.premiumFoodBought ?? 0}</b>`,
    `💊 Лечений: <b>${totals.medicineBought ?? 0}</b>`,
    `🎩 Покупок шапок: <b>${totals.hatPurchases ?? 0}</b>`,
    `✨ Смен шапок: <b>${totals.hatEquips ?? 0}</b>`,
    `👻 Смертей: <b>${totals.petDeaths ?? 0}</b>`,
  ];

  if (newPlayers.length) {
    blocks.push('', '<b>Новые игроки</b>');
    newPlayers.forEach((player, index) => {
      const handle = player.telegramUsername ? ` (@${player.telegramUsername})` : '';
      blocks.push(`${index + 1}. ${escapeTelegramHtml(player.nickname)}${escapeTelegramHtml(handle)}`);
    });
  }

  if (topEventPlayers.length) {
    blocks.push('', '<b>Самые активные за сутки</b>');
    topEventPlayers.forEach((player, index) => {
      const handle = player.telegramUsername ? ` (@${player.telegramUsername})` : '';
      blocks.push(`${index + 1}. ${escapeTelegramHtml(player.nickname)}${escapeTelegramHtml(handle)} — ${player.eventCount}`);
    });
  }

  return blocks.join('\n');
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!TELEGRAM_ADMIN_BOT_TOKEN || !ADMIN_RPC_SECRET) {
    res.status(500).json({ error: 'Daily summary env is not configured' });
    return;
  }

  const userAgent = String(req.headers['user-agent'] || '');
  if (!userAgent.includes(CRON_USER_AGENT)) {
    res.status(401).json({ error: 'Unauthorized cron caller' });
    return;
  }

  try {
    const [summary, chatIds] = await Promise.all([loadDailySummary(), loadAdminChatIds()]);

    if (!chatIds.length) {
      res.status(200).json({ ok: true, skipped: 'no admin chats registered' });
      return;
    }

    const message = renderDailySummary(summary);
    const results = await Promise.allSettled(
      chatIds.map((chatId) => sendTelegramMessage(TELEGRAM_ADMIN_BOT_TOKEN, chatId, message)),
    );

    res.status(200).json({
      ok: true,
      sentTo: chatIds.length,
      failed: results.filter((result) => result.status === 'rejected').length,
    });
  } catch (error) {
    console.error('Daily summary cron failed', error);
    res.status(500).json({ error: error.message || 'Daily summary cron failed' });
  }
}
