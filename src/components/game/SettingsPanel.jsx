import { getLang, t } from '../../i18n';

export default function SettingsPanel({
  profileName,
  onProfileNameChange,
  onSaveProfile,
  onCycleLang,
  isMuted,
  onToggleMute,
  onLogout,
}) {
  return (
    <div className="shop-grid">
      <h2 style={{fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem'}}>{t('settings_title')}</h2>
      <p style={{color: 'var(--text-secondary)', marginBottom: '1rem'}}>
        {t('settings_desc')}
      </p>

      <div className="shop-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '1rem' }}>
        <div className="shop-item-info">
          <div className="shop-item-title">{t('profile')}</div>
          <div className="shop-item-desc">{t('profile_desc')}</div>
        </div>
        <input type="text" value={profileName} onChange={(event) => onProfileNameChange(event.target.value)} placeholder={t('your_name')} style={{background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid var(--glass-border)', padding: '0.75rem', borderRadius: '12px'}} />
        <button className="shop-item-buy" onClick={onSaveProfile}>
          {t('save_data')}
        </button>
      </div>

      <div className="shop-item">
        <div className="shop-item-info">
          <div className="shop-item-title">🌍 {t('language')}</div>
          <div className="shop-item-desc">{t('current_lang')}</div>
        </div>
        <button className="shop-item-buy" onClick={onCycleLang}>
          {getLang().toUpperCase()}
        </button>
      </div>

      <div className="shop-item">
        <div className="shop-item-info">
          <div className="shop-item-title">{t('sfx')}</div>
          <div className="shop-item-desc">{isMuted ? t('sfx_off') : t('sfx_on')}</div>
        </div>
        <button className="shop-item-buy" onClick={onToggleMute}>
          {isMuted ? t('turn_on_sound') : t('turn_off_sound')}
        </button>
      </div>

      <div className="shop-item" style={{border: '1px solid rgba(239, 68, 68, 0.4)'}}>
        <div className="shop-item-info">
          <div className="shop-item-title" style={{color: '#ef4444'}}>{t('exit_game')}</div>
          <div className="shop-item-desc">{t('exit_desc')}</div>
        </div>
        <button className="shop-item-buy" style={{background: '#ef4444'}} onClick={onLogout}>
          {t('exit_btn')}
        </button>
      </div>
    </div>
  );
}

