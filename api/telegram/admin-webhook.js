/* eslint-env node */

import { callSupabaseRpc } from '../_lib/supabase.js';
import {
  answerTelegramCallback,
  editTelegramMessage,
  escapeTelegramHtml,
  getJsonBody,
  sendTelegramMessage,
} from '../_lib/telegram.js';

const TELEGRAM_ADMIN_BOT_TOKEN = process.env.TELEGRAM_ADMIN_BOT_TOKEN?.trim();
const ADMIN_RPC_SECRET = process.env.ADMIN_RPC_SECRET?.trim();
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

function formatDuration(ms) {
  if (!ms || ms <= 0) {
    return '—';
  }

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}ч ${minutes}м ${seconds}с`;
  }

  if (minutes > 0) {
    return `${minutes}м ${seconds}с`;
  }

  return `${seconds}с`;
}

function getDashboardKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '📈 Статы', callback_data: 'admin:stats' },
        { text: '🕘 События', callback_data: 'admin:recent' },
      ],
      [
        { text: '👥 Игроки', callback_data: 'admin:players' },
        { text: '🏆 Топ', callback_data: 'admin:top' },
      ],
    ],
  };
}

async function loadDashboard() {
  return callSupabaseRpc('get_admin_dashboard', {
    p_secret: ADMIN_RPC_SECRET,
  });
}

async function registerAdmin(messageOrQueryUser, chatId) {
  return callSupabaseRpc('register_admin_bot_chat', {
    p_secret: ADMIN_RPC_SECRET,
    p_chat_id: chatId,
    p_telegram_user_id: messageOrQueryUser.id,
    p_username: messageOrQueryUser.username || null,
    p_first_name: messageOrQueryUser.first_name || null,
    p_last_name: messageOrQueryUser.last_name || null,
  });
}

function renderStats(dashboard) {
  const totals = dashboard?.totals || {};
  return [
    '<b>Bobik Admin</b>',
    '',
    `👥 Игроков: <b>${totals.playersTotal ?? 0}</b>`,
    `📱 Telegram-профилей: <b>${totals.telegramPlayers ?? 0}</b>`,
    `🟢 Активны за 24ч: <b>${totals.active24h ?? 0}</b>`,
    `📆 Активны за 7д: <b>${totals.active7d ?? 0}</b>`,
    `🔐 Закрепили аккаунт: <b>${totals.securedAccounts ?? 0}</b>`,
    `🐶 Живых питомцев: <b>${totals.livePets ?? 0}</b>`,
    `👻 Завершённых забегов: <b>${totals.deadPets ?? 0}</b>`,
    `🧾 Событий: <b>${totals.eventCount ?? 0}</b>`,
  ].join('\n');
}

function renderRecentEvents(dashboard) {
  const events = Array.isArray(dashboard?.recentEvents) ? dashboard.recentEvents : [];

  if (!events.length) {
    return '<b>Последние события</b>\n\nПока пусто.';
  }

  const lines = events.slice(0, 12).map((event) => {
    const icon =
      event.eventType === 'telegram_session'
        ? '📲'
        : event.eventType === 'account_secured'
          ? '🔐'
          : event.eventType === 'pet_adopted'
            ? '🐶'
            : '•';
    const player =
      event.telegramUsername
        ? `${event.nickname} (@${event.telegramUsername})`
        : event.nickname;
    return `${icon} <b>${escapeTelegramHtml(event.eventType)}</b>\n${escapeTelegramHtml(player)}\n${formatDate(event.createdAt)}`;
  });

  return `<b>Последние события</b>\n\n${lines.join('\n\n')}`;
}

function renderPlayers(dashboard) {
  const players = Array.isArray(dashboard?.recentPlayers) ? dashboard.recentPlayers : [];

  if (!players.length) {
    return '<b>Игроки</b>\n\nПока пусто.';
  }

  const lines = players.slice(0, 10).map((player, index) => {
    const handle = player.telegramUsername ? ` (@${player.telegramUsername})` : '';
    const secured = player.hasPassword ? 'да' : 'нет';
    return [
      `${index + 1}. <b>${escapeTelegramHtml(player.nickname)}</b>${escapeTelegramHtml(handle)}`,
      `   Был в игре: ${formatDate(player.lastSeenAt)}`,
      `   Лучший забег: ${formatDuration(player.bestRunMs)}`,
      `   Монеты сейчас: ${player.liveCoins ?? 0}`,
      `   Аккаунт закреплён: ${secured}`,
    ].join('\n');
  });

  return `<b>Игроки</b>\n\n${lines.join('\n\n')}`;
}

function renderTop(dashboard) {
  const leaderboard = Array.isArray(dashboard?.leaderboard) ? dashboard.leaderboard : [];

  if (!leaderboard.length) {
    return '<b>Топ игроков</b>\n\nПока нет завершённых забегов.';
  }

  const medals = ['🥇', '🥈', '🥉'];
  const lines = leaderboard.slice(0, 5).map((entry, index) => {
    const prefix = medals[index] || `${index + 1}.`;
    return `${prefix} <b>${escapeTelegramHtml(entry.nickname)}</b> — ${formatDuration(entry.timeLivedMs)}`;
  });

  return `<b>Топ игроков</b>\n\n${lines.join('\n')}`;
}

function resolveView(view, dashboard) {
  if (view === 'recent') {
    return renderRecentEvents(dashboard);
  }

  if (view === 'players') {
    return renderPlayers(dashboard);
  }

  if (view === 'top') {
    return renderTop(dashboard);
  }

  return renderStats(dashboard);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!TELEGRAM_ADMIN_BOT_TOKEN || !ADMIN_RPC_SECRET) {
    res.status(500).json({ error: 'Admin bot env is not configured' });
    return;
  }

  try {
    const update = getJsonBody(req);
    const message = update.message;
    const callbackQuery = update.callback_query;

    if (!message && !callbackQuery) {
      res.status(200).json({ ok: true });
      return;
    }

    const from = callbackQuery?.from || message?.from;
    const chatId = callbackQuery?.message?.chat?.id || message?.chat?.id;
    const registration = await registerAdmin(from, chatId);

    if (!registration?.authorized) {
      if (callbackQuery) {
        await answerTelegramCallback(TELEGRAM_ADMIN_BOT_TOKEN, callbackQuery.id, 'Доступ закрыт');
      } else {
        await sendTelegramMessage(
          TELEGRAM_ADMIN_BOT_TOKEN,
          chatId,
          '⛔️ Доступ к админ-панели закрыт.',
        );
      }

      res.status(200).json({ ok: true });
      return;
    }

    const dashboard = await loadDashboard();

    if (callbackQuery) {
      const view = String(callbackQuery.data || '').replace('admin:', '') || 'stats';
      await answerTelegramCallback(TELEGRAM_ADMIN_BOT_TOKEN, callbackQuery.id, 'Обновлено');
      await editTelegramMessage(
        TELEGRAM_ADMIN_BOT_TOKEN,
        chatId,
        callbackQuery.message.message_id,
        resolveView(view, dashboard),
        { reply_markup: getDashboardKeyboard() },
      );

      res.status(200).json({ ok: true });
      return;
    }

    const text = String(message.text || '').trim().toLowerCase();
    let content;

    if (text === '/recent') {
      content = renderRecentEvents(dashboard);
    } else if (text === '/players') {
      content = renderPlayers(dashboard);
    } else if (text === '/top') {
      content = renderTop(dashboard);
    } else if (text === '/help') {
      content = [
        '<b>Bobik Admin</b>',
        '',
        '/stats — общий срез',
        '/recent — последние события',
        '/players — игроки',
        '/top — лидерборд',
      ].join('\n');
    } else {
      content = renderStats(dashboard);
    }

    await sendTelegramMessage(
      TELEGRAM_ADMIN_BOT_TOKEN,
      chatId,
      content,
      { reply_markup: getDashboardKeyboard() },
    );

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Admin webhook failed', error);
    res.status(500).json({ error: error.message || 'Admin webhook failed' });
  }
}
