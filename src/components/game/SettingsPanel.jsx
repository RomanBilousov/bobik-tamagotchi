import { getLang, t } from '../../i18n';

export default function SettingsPanel({
  profileName,
  onProfileNameChange,
  onSaveProfile,
  accountLoginName,
  onAccountLoginNameChange,
  accountHasPassword,
  accountCurrentPassword,
  onAccountCurrentPasswordChange,
  accountNewPassword,
  onAccountNewPasswordChange,
  accountConfirmPassword,
  onAccountConfirmPasswordChange,
  onSaveAccountAccess,
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

      <section className="settings-card settings-card--form">
        <div className="settings-card-copy">
          <div className="shop-item-title">{t('account_access_title')}</div>
          <div className="shop-item-desc">
            {accountHasPassword ? t('account_access_desc_change') : t('account_access_desc_create')}
          </div>
        </div>

        <div className="settings-form-grid">
          <input
            autoComplete="username"
            className="settings-input"
            onChange={(event) => onAccountLoginNameChange(event.target.value)}
            placeholder={t('account_login_name')}
            type="text"
            value={accountLoginName}
          />

          {accountHasPassword ? (
            <input
              autoComplete="current-password"
              className="settings-input"
              onChange={(event) => onAccountCurrentPasswordChange(event.target.value)}
              placeholder={t('account_current_password')}
              type="password"
              value={accountCurrentPassword}
            />
          ) : null}

          <input
            autoComplete="new-password"
            className="settings-input"
            onChange={(event) => onAccountNewPasswordChange(event.target.value)}
            placeholder={t('account_new_password')}
            type="password"
            value={accountNewPassword}
          />

          <input
            autoComplete="new-password"
            className="settings-input"
            onChange={(event) => onAccountConfirmPasswordChange(event.target.value)}
            placeholder={t('account_confirm_password')}
            type="password"
            value={accountConfirmPassword}
          />

          <div className="settings-inline-note">{t('account_access_hint')}</div>

          <button className="shop-item-buy settings-action-btn settings-action-btn--wide" onClick={onSaveAccountAccess} type="button">
            {accountHasPassword ? t('account_change_password') : t('account_set_password')}
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
