import { useState } from 'react';
import { t, cycleLang, getLang } from './i18n';
import Scene3D from './Scene3D';
import {
  SUPABASE_CONFIG_ERROR,
  isSupabaseConfigured,
  supabase,
} from './lib/supabase/client';

export default function Auth({ appError }) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();

    if (!isSupabaseConfigured || !supabase) {
      setErrorMessage(appError || SUPABASE_CONFIG_ERROR);
      return;
    }

    setLoading(true);
    setErrorMessage('');

    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      setErrorMessage(error.message || t('auth_sign_in_failed'));
      setLoading(false);
      return;
    }

    setLoading(false);
  };

  const blockingMessage = appError || errorMessage;

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

      <div className="glass-card">
        {blockingMessage ? (
          <div className="app-alert app-alert--compact">{blockingMessage}</div>
        ) : null}
        <form onSubmit={handleAuth}>
          <button
            className="btn-primary auth-submit-btn"
            disabled={loading || !isSupabaseConfigured}
            type="submit"
          >
            {loading ? t('loading') : t('play_guest')}
          </button>
        </form>
      </div>
    </div>
  );
}
