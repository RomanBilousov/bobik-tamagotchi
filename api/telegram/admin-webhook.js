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
      [
        { text: '🌅 Сводка', callback_data: 'admin:daily' },
      ],
    ],
  };
}

async function loadDashboard() {
  return callSupabaseRpc('get_admin_dashboard', {
    p_secret: ADMIN_RPC_SECRET,
  });
}

async function loadPlayerDetail(userId) {
  return callSupabaseRpc('get_admin_player_detail', {
    p_secret: ADMIN_RPC_SECRET,
    p_user_id: userId,
  });
}

async function loadDailySummary() {
  return callSupabaseRpc('get_admin_daily_summary', {
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
        : ['account_secured', 'account_password_changed'].includes(event.eventType)
          ? '🔐'
          : event.eventType === 'pet_adopted'
            ? '🐶'
            : event.eventType === 'pet_died'
              ? '👻'
              : event.eventType === 'treasure_found'
                ? '💎'
                : event.eventType === 'hat_purchased'
                  ? '🎩'
                  : event.eventType === 'hat_equipped'
                    ? '✨'
                    : event.eventType === 'premium_food_bought'
                      ? '🥩'
                      : event.eventType === 'medicine_bought'
                        ? '💊'
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

function getPlayersKeyboard(dashboard) {
  const players = Array.isArray(dashboard?.recentPlayers) ? dashboard.recentPlayers : [];
  const rows = players.slice(0, 8).map((player, index) => {
    const handle = player.telegramUsername ? `@${player.telegramUsername}` : player.nickname;
    return [
      {
        text: `${index + 1}. ${handle}`.slice(0, 48),
        callback_data: `admin:player:${player.userId}`,
      },
    ];
  });

  rows.push([{ text: '⬅️ Назад', callback_data: 'admin:stats' }]);

  return {
    inline_keyboard: rows,
  };
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

function renderDailySummary(summary) {
  const totals = summary?.totals || {};
  const newPlayers = Array.isArray(summary?.newPlayers) ? summary.newPlayers : [];
  const topEventPlayers = Array.isArray(summary?.topEventPlayers) ? summary.topEventPlayers : [];

  const blocks = [
    '<b>Сводка за 24 часа</b>',
    `${formatDate(summary?.sinceAt)} → ${formatDate(summary?.untilAt)}`,
    '',
    `🆕 Новых игроков: <b>${totals.newPlayers ?? 0}</b>`,
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

function renderPlayerDetail(detail) {
  const profile = detail?.profile || {};
  const pet = detail?.pet || null;
  const totals = detail?.totals || {};
  const events = Array.isArray(detail?.recentEvents) ? detail.recentEvents : [];
  const handle = profile.telegramUsername ? ` (@${profile.telegramUsername})` : '';

  const lines = [
    `<b>${escapeTelegramHtml(profile.nickname || 'Игрок')}</b>${escapeTelegramHtml(handle)}`,
    `ID: <code>${escapeTelegramHtml(profile.id || '—')}</code>`,
    `Telegram ID: <code>${escapeTelegramHtml(profile.telegramUserId || '—')}</code>`,
    `Язык: <b>${escapeTelegramHtml(profile.lang || '—')}</b>`,
    `Аккаунт закреплён: <b>${profile.hasPassword ? 'да' : 'нет'}</b>`,
    `Первый вход: <b>${formatDate(profile.firstSeenAt)}</b>`,
    `Последний вход: <b>${formatDate(profile.lastSeenAt)}</b>`,
    `Последнее событие: <b>${formatDate(profile.lastEventAt)}</b>`,
    '',
    `<b>Питомцы</b>`,
    `Всего: <b>${totals.totalPets ?? 0}</b>`,
    `Живых: <b>${totals.livePets ?? 0}</b>`,
    `Завершённых: <b>${totals.deadPets ?? 0}</b>`,
    `Лучший забег: <b>${formatDuration(totals.bestRunMs)}</b>`,
  ];

  if (pet) {
    lines.push(
      '',
      '<b>Текущий питомец</b>',
      `Монеты: <b>${pet.coins ?? 0}</b>`,
      `Голод: <b>${Math.round(Number(pet.hunger ?? 0))}%</b>`,
      `Энергия: <b>${Math.round(Number(pet.energy ?? 0))}%</b>`,
      `Счастье: <b>${Math.round(Number(pet.happiness ?? 0))}%</b>`,
      `Болеет: <b>${pet.isSick ? 'да' : 'нет'}</b>`,
      `Локация: <b>${escapeTelegramHtml(pet.environment || '—')}</b>`,
      `Активная шапка: <b>${escapeTelegramHtml(pet.activeHat || '—')}</b>`,
    );
  }

  if (events.length) {
    lines.push('', '<b>Последние события</b>');
    events.slice(0, 6).forEach((event) => {
      lines.push(`• ${escapeTelegramHtml(event.eventType)} — ${formatDate(event.createdAt)}`);
    });
  }

  return lines.join('\n');
}

function getPlayerDetailKeyboard(userId) {
  return {
    inline_keyboard: [
      [{ text: '⬅️ К игрокам', callback_data: 'admin:players' }],
      [{ text: '🔄 Обновить карточку', callback_data: `admin:player:${userId}` }],
    ],
  };
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

  if (view === 'daily') {
    return renderDailySummary(dashboard);
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
      const callbackData = String(callbackQuery.data || '');
      const payload = callbackData.replace('admin:', '') || 'stats';
      await answerTelegramCallback(TELEGRAM_ADMIN_BOT_TOKEN, callbackQuery.id, 'Обновлено');

      if (payload.startsWith('player:')) {
        const userId = payload.slice('player:'.length);
        const detail = await loadPlayerDetail(userId);
        await editTelegramMessage(
          TELEGRAM_ADMIN_BOT_TOKEN,
          chatId,
          callbackQuery.message.message_id,
          renderPlayerDetail(detail),
          { reply_markup: getPlayerDetailKeyboard(userId) },
        );
      } else if (payload === 'players') {
        await editTelegramMessage(
          TELEGRAM_ADMIN_BOT_TOKEN,
          chatId,
          callbackQuery.message.message_id,
          renderPlayers(dashboard),
          { reply_markup: getPlayersKeyboard(dashboard) },
        );
      } else if (payload === 'daily') {
        const summary = await loadDailySummary();
        await editTelegramMessage(
          TELEGRAM_ADMIN_BOT_TOKEN,
          chatId,
          callbackQuery.message.message_id,
          renderDailySummary(summary),
          { reply_markup: getDashboardKeyboard() },
        );
      } else {
        await editTelegramMessage(
          TELEGRAM_ADMIN_BOT_TOKEN,
          chatId,
          callbackQuery.message.message_id,
          resolveView(payload, dashboard),
          { reply_markup: getDashboardKeyboard() },
        );
      }

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
    } else if (text === '/daily') {
      const summary = await loadDailySummary();
      content = renderDailySummary(summary);
    } else if (text === '/help') {
      content = [
        '<b>Bobik Admin</b>',
        '',
        '/stats — общий срез',
        '/recent — последние события',
        '/players — игроки',
        '/top — лидерборд',
        '/daily — сводка за 24 часа',
      ].join('\n');
    } else {
      content = renderStats(dashboard);
    }

    const replyMarkup =
      text === '/players'
        ? getPlayersKeyboard(dashboard)
        : getDashboardKeyboard();

    await sendTelegramMessage(
      TELEGRAM_ADMIN_BOT_TOKEN,
      chatId,
      content,
      { reply_markup: replyMarkup },
    );

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Admin webhook failed', error);
    res.status(500).json({ error: error.message || 'Admin webhook failed' });
  }
}
