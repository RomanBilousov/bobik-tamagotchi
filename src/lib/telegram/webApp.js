function getBrowserWindow() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window;
}

export function getTelegramWebApp() {
  return getBrowserWindow()?.Telegram?.WebApp ?? null;
}

export function isTelegramMiniApp() {
  return Boolean(getTelegramWebApp());
}

function setCssVar(name, value) {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.style.setProperty(name, value);
}

function syncViewportVars(webApp) {
  if (!webApp) {
    return;
  }

  const viewportHeight = Number(webApp.viewportHeight) || 0;
  const viewportStableHeight = Number(webApp.viewportStableHeight) || viewportHeight;
  const inset = webApp.contentSafeAreaInset || webApp.safeAreaInset || {};

  if (viewportHeight > 0) {
    setCssVar('--tg-viewport-height', `${viewportHeight}px`);
  }

  if (viewportStableHeight > 0) {
    setCssVar('--tg-viewport-stable-height', `${viewportStableHeight}px`);
  }

  setCssVar('--tg-safe-area-top', `${Math.max(0, inset.top || 0)}px`);
  setCssVar('--tg-safe-area-right', `${Math.max(0, inset.right || 0)}px`);
  setCssVar('--tg-safe-area-bottom', `${Math.max(0, inset.bottom || 0)}px`);
  setCssVar('--tg-safe-area-left', `${Math.max(0, inset.left || 0)}px`);
}

export function initTelegramMiniApp() {
  const webApp = getTelegramWebApp();
  if (!webApp || typeof document === 'undefined') {
    return () => {};
  }

  document.documentElement.classList.add('telegram-mini-app');
  document.body.classList.add('telegram-mini-app');
  syncViewportVars(webApp);

  try {
    webApp.ready();
    webApp.expand();
    webApp.setHeaderColor?.('secondary_bg_color');
    webApp.setBackgroundColor?.('bg_color');
    webApp.setBottomBarColor?.('bottom_bar_bg_color');

    if (webApp.isVersionAtLeast?.('7.7')) {
      webApp.disableVerticalSwipes?.();
    }
  } catch (error) {
    console.error('Failed to initialize Telegram Mini App bridge', error);
  }

  const syncLayout = () => syncViewportVars(webApp);
  webApp.onEvent?.('themeChanged', syncLayout);
  webApp.onEvent?.('viewportChanged', syncLayout);
  webApp.onEvent?.('safeAreaChanged', syncLayout);
  webApp.onEvent?.('contentSafeAreaChanged', syncLayout);

  return () => {
    webApp.offEvent?.('themeChanged', syncLayout);
    webApp.offEvent?.('viewportChanged', syncLayout);
    webApp.offEvent?.('safeAreaChanged', syncLayout);
    webApp.offEvent?.('contentSafeAreaChanged', syncLayout);
  };
}

function mapLanguageCode(code) {
  const normalized = String(code || '').trim().toLowerCase();

  if (normalized.startsWith('uk')) {
    return 'ua';
  }

  if (normalized.startsWith('ru')) {
    return 'ru';
  }

  return 'en';
}

export function getTelegramProfileDefaults() {
  const user = getTelegramWebApp()?.initDataUnsafe?.user;
  if (!user) {
    return {};
  }

  const nickname = [user.first_name, user.last_name].filter(Boolean).join(' ').trim().slice(0, 40);
  const defaults = {};

  if (nickname) {
    defaults.nickname = nickname;
  }

  if (user.language_code) {
    defaults.lang = mapLanguageCode(user.language_code);
  }

  return defaults;
}

export function getTelegramStartParam() {
  const browserWindow = getBrowserWindow();
  const params = new URLSearchParams(browserWindow?.location?.search || '');
  return (
    params.get('tgWebAppStartParam') ||
    getTelegramWebApp()?.initDataUnsafe?.start_param ||
    ''
  ).trim();
}

export function getTelegramInitialTab(defaultTab = 'pet') {
  const startParam = getTelegramStartParam().toLowerCase();

  if (startParam === 'leaderboard' || startParam === 'rating') {
    return 'leaderboard';
  }

  if (startParam === 'shop' || startParam === 'store') {
    return 'shop';
  }

  if (startParam === 'settings') {
    return 'settings';
  }

  return defaultTab;
}

export function bindTelegramBackButton(isVisible, onClick) {
  const backButton = getTelegramWebApp()?.BackButton;
  if (!backButton) {
    return () => {};
  }

  if (!isVisible) {
    backButton.hide();
    return () => {};
  }

  const handleClick = () => {
    onClick?.();
  };

  backButton.show();
  backButton.onClick?.(handleClick);

  return () => {
    backButton.offClick?.(handleClick);
    backButton.hide();
  };
}

export function triggerTelegramHaptic(kind = 'selection') {
  const haptic = getTelegramWebApp()?.HapticFeedback;
  if (!haptic) {
    return;
  }

  try {
    if (kind === 'success' || kind === 'error' || kind === 'warning') {
      haptic.notificationOccurred?.(kind);
      return;
    }

    if (kind === 'light' || kind === 'medium' || kind === 'heavy' || kind === 'rigid' || kind === 'soft') {
      haptic.impactOccurred?.(kind);
      return;
    }

    haptic.selectionChanged?.();
  } catch (error) {
    console.error('Failed to trigger Telegram haptic feedback', error);
  }
}
