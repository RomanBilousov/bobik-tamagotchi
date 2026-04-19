import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { t, cycleLang, getLang } from './i18n';
import Scene3D from './Scene3D';
import { restoreAccountSession } from './services/accountService';
import {
  SUPABASE_CONFIG_ERROR,
  isSupabaseConfigured,
  supabase,
} from './lib/supabase/client';
import { triggerTelegramHaptic } from './lib/telegram/webApp';

export default function Auth({ appError, session, onLogout }) {
  const navigate = useNavigate();
  const [guestLoading, setGuestLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loginName, setLoginName] = useState('');
  const [password, setPassword] = useState('');

  const handleGuestAuth = async (event) => {
    event.preventDefault();

    if (session) {
      navigate('/');
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setErrorMessage(appError || SUPABASE_CONFIG_ERROR);
      return;
    }

    setGuestLoading(true);
    setErrorMessage('');

    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      triggerTelegramHaptic('error');
      setErrorMessage(error.message || t('auth_sign_in_failed'));
      setGuestLoading(false);
      return;
    }

    triggerTelegramHaptic('success');
    setGuestLoading(false);
    navigate('/');
  };

  const handleRestore = async (event) => {
    event.preventDefault();

    if (!isSupabaseConfigured || !supabase) {
      setErrorMessage(appError || SUPABASE_CONFIG_ERROR);
      return;
    }

    if (!loginName.trim() || !password.trim()) {
      setErrorMessage(t('auth_restore_missing'));
      return;
    }

    let createdTempSession = false;

    try {
      setRestoreLoading(true);
      setErrorMessage('');

      if (!session) {
        const { error } = await supabase.auth.signInAnonymously();
        if (error) {
          throw error;
        }

        createdTempSession = true;
      }

      await restoreAccountSession({
        loginName,
        password,
      });

      triggerTelegramHaptic('success');
      setPassword('');
      navigate('/');
    } catch (error) {
      triggerTelegramHaptic('error');
      setErrorMessage(error?.message || t('auth_restore_failed'));

      if (createdTempSession) {
        await supabase.auth.signOut();
      }
    } finally {
      setRestoreLoading(false);
    }
  };

  const handleSwitchAccount = async () => {
    setErrorMessage('');
    triggerTelegramHaptic('light');
    await onLogout?.();
  };

  const blockingMessage = appError || errorMessage;
  const isBusy = guestLoading || restoreLoading;
  const showSessionActions = Boolean(session && !isBusy);

  return (
    <div className="auth-container auth-shell">
      <button className="auth-language-chip" onClick={cycleLang} type="button">
        🌍 {getLang().toUpperCase()}
      </button>

      <div className="auth-scene">
        <Scene3D isSick={false} aliveMins={20} activeHat={null} hasHat={false} genetics="golden" environment="day" actionState="idle" />
      </div>

      <h1>Bobik</h1>
      <p>
        {t('auth_title')}
        <br/>
        <span className="auth-support-copy">
          {isSupabaseConfigured ? t('auth_guest_mode') : t('auth_setup_hint')}
        </span>
      </p>

      {showSessionActions ? (
        <div className="glass-card auth-card-stack">
          {blockingMessage ? (
            <div className="app-alert app-alert--compact">{blockingMessage}</div>
          ) : null}

          <div className="auth-card-copy">
            <div className="shop-item-title">{t('auth_session_title')}</div>
            <div className="shop-item-desc">{t('auth_session_desc')}</div>
          </div>

          <div className="auth-button-stack">
            <button className="btn-primary auth-submit-btn" onClick={() => navigate('/')} type="button">
              {t('auth_continue')}
            </button>
            <button className="shop-item-buy shop-item-buy--muted auth-secondary-btn" onClick={handleSwitchAccount} type="button">
              {t('auth_switch_account')}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="glass-card auth-card-stack">
            {blockingMessage ? (
              <div className="app-alert app-alert--compact">{blockingMessage}</div>
            ) : null}

            <div className="auth-card-copy">
              <div className="shop-item-title">{t('play_guest')}</div>
              <div className="shop-item-desc">{t('auth_guest_cta')}</div>
            </div>

            <form onSubmit={handleGuestAuth}>
              <button
                className="btn-primary auth-submit-btn"
                disabled={isBusy || !isSupabaseConfigured}
                type="submit"
              >
                {guestLoading ? t('loading') : t('play_guest')}
              </button>
            </form>
          </div>

          <div className="glass-card auth-card-stack auth-card-stack--secondary">
            <div className="auth-card-copy">
              <div className="shop-item-title">{t('auth_restore_title')}</div>
              <div className="shop-item-desc">{t('auth_restore_desc')}</div>
            </div>

            <form className="auth-restore-form" onSubmit={handleRestore}>
              <input
                autoComplete="username"
                className="settings-input"
                disabled={isBusy}
                onChange={(event) => setLoginName(event.target.value)}
                placeholder={t('auth_login_name')}
                type="text"
                value={loginName}
              />
              <input
                autoComplete="current-password"
                className="settings-input"
                disabled={isBusy}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={t('auth_password')}
                type="password"
                value={password}
              />
              <button
                className="shop-item-buy auth-submit-btn auth-secondary-btn"
                disabled={isBusy || !isSupabaseConfigured}
                type="submit"
              >
                {restoreLoading ? t('loading') : t('auth_restore_button')}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
