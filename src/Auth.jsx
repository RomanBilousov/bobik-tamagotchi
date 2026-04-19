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
    <div className="auth-container" style={{ position: 'relative' }}>
      <button 
        onClick={cycleLang} 
        style={{
          position: 'absolute', top: 16, right: 16, 
          background: 'rgba(255,255,255,0.2)', border: 'none', 
          color: '#fff', padding: '6px 12px', borderRadius: '12px', 
          cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', zIndex: 100
        }}
      >
        🌍 {getLang().toUpperCase()}
      </button>

      <div style={{ width: '100%', height: '35vh', minHeight: '250px', marginBottom: '1.5rem', borderRadius: '24px', overflow: 'hidden' }}>
         <Scene3D isSick={false} aliveMins={20} hasHat={false} genetics="golden" environment="day" actionState="idle" />
      </div>

      <h1>Bobik</h1>
      <p>
        {t('auth_title')}
        <br/>
        <span style={{fontSize: '0.8rem', color: '#10b981'}}>
          {isSupabaseConfigured ? t('auth_guest_mode') : t('auth_setup_hint')}
        </span>
      </p>

      <div className="glass-card">
        {blockingMessage ? (
          <div style={{ marginBottom: '1rem', color: '#fecaca', fontSize: '0.9rem' }}>
            {blockingMessage}
          </div>
        ) : null}
        <form onSubmit={handleAuth}>
          <button
            className="btn-primary"
            disabled={loading || !isSupabaseConfigured}
            type="submit"
            style={{marginTop: '2rem', padding: '1rem', fontSize: '1.2rem'}}
          >
            {loading ? t('loading') : t('play_guest')}
          </button>
        </form>
      </div>
    </div>
  );
}
