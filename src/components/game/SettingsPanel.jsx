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
    <div className="shop-grid screen-surface settings-screen">
      <div className="screen-header">
        <span className="screen-kicker">{t('nav_settings')}</span>
        <h2 className="screen-title">{t('settings_title')}</h2>
        <p className="screen-description">{t('settings_desc')}</p>
      </div>

      <section className="settings-card settings-card--form">
        <div className="settings-card-copy">
          <div className="shop-item-title">{t('profile')}</div>
          <div className="shop-item-desc">{t('profile_desc')}</div>
        </div>

        <div className="settings-input-row">
          <input
            className="settings-input"
            type="text"
            value={profileName}
            onChange={(event) => onProfileNameChange(event.target.value)}
            placeholder={t('your_name')}
          />
          <button className="shop-item-buy settings-action-btn" onClick={onSaveProfile} type="button">
            {t('save_data')}
          </button>
        </div>
      </section>

      <section className="settings-card">
        <div className="settings-card-copy">
          <div className="shop-item-title">{t('language')}</div>
          <div className="shop-item-desc">{t('current_lang')}</div>
        </div>
        <button className="shop-item-buy settings-action-btn" onClick={onCycleLang} type="button">
          {getLang().toUpperCase()}
        </button>
      </section>

      <section className="settings-card">
        <div className="settings-card-copy">
          <div className="shop-item-title">{t('sfx')}</div>
          <div className="shop-item-desc">{isMuted ? t('sfx_off') : t('sfx_on')}</div>
        </div>
        <button className="shop-item-buy settings-action-btn" onClick={onToggleMute} type="button">
          {isMuted ? t('turn_on_sound') : t('turn_off_sound')}
        </button>
      </section>

      <section className="settings-card settings-card--danger">
        <div className="settings-card-copy">
          <div className="settings-danger-title">{t('exit_game')}</div>
          <div className="shop-item-desc">{t('exit_desc')}</div>
        </div>
        <button className="shop-item-buy settings-action-btn settings-action-btn--danger" onClick={onLogout} type="button">
          {t('exit_btn')}
        </button>
      </section>
    </div>
  );
}
