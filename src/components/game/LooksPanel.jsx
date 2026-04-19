import { Coins } from 'lucide-react';
import { t } from '../../i18n';

function PriceBadge({ amount }) {
  return (
    <span className="price-badge">
      <span>{amount}</span>
      <Coins size={16} className="price-badge-icon" />
    </span>
  );
}

function LooksFeatureItem({
  icon,
  title,
  description,
  status,
  statusTone,
  disabled,
  onClick,
  action,
  tone = 'default',
}) {
  return (
    <div className={`shop-item shop-item--${tone}`}>
      <div className="shop-item-icon" aria-hidden="true">{icon}</div>
      <div className="shop-item-info">
        <div className="shop-item-header">
          <div className="shop-item-title">{title}</div>
          <span className={`status-badge status-badge--${statusTone}`}>{status}</span>
        </div>
        <div className="shop-item-desc">{description}</div>
      </div>
      <button className="shop-item-buy" disabled={disabled} onClick={onClick} type="button">
        {action}
      </button>
    </div>
  );
}

function LooksCategoryCard({ icon, title, description }) {
  return (
    <section className="look-category-card game-panel-card">
      <div className="look-category-icon" aria-hidden="true">{icon}</div>
      <div className="look-category-copy">
        <div className="look-category-title-row">
          <div className="shop-item-title">{title}</div>
          <span className="status-badge status-badge--muted">{t('shop_state_soon')}</span>
        </div>
        <div className="shop-item-desc">{description}</div>
      </div>
    </section>
  );
}

export default function LooksPanel({ pet, onBuyMagicHat }) {
  const canBuyHat = pet.coins >= 200 && !pet.hasHat;

  return (
    <div className="looks-screen screen-surface">
      <div className="screen-header">
        <span className="screen-kicker">{t('nav_looks')}</span>
        <h2 className="screen-title">{t('looks_title')}</h2>
        <p className="screen-description">{t('looks_desc')}</p>
      </div>

      <section className="looks-block game-panel-card">
        <div className="looks-block-header">
          <div>
            <div className="looks-block-title">{t('looks_accessories')}</div>
            <div className="shop-item-desc">{t('looks_accessories_desc')}</div>
          </div>
        </div>

        <LooksFeatureItem
          icon="🎩"
          title={t('magic_hat')}
          description={t('hat_desc')}
          status={
            pet.hasHat
              ? t('shop_state_owned')
              : canBuyHat
                ? t('shop_state_ready')
                : t('shop_state_need_coins')
          }
          statusTone={pet.hasHat ? 'owned' : canBuyHat ? 'ready' : 'muted'}
          disabled={!canBuyHat}
          onClick={onBuyMagicHat}
          action={pet.hasHat ? t('shop_state_owned') : <PriceBadge amount={200} />}
          tone={pet.hasHat ? 'owned' : 'default'}
        />
      </section>

      <section className="looks-category-grid">
        <LooksCategoryCard
          icon="🎨"
          title={t('looks_colors')}
          description={t('looks_colors_desc')}
        />
        <LooksCategoryCard
          icon="🐕"
          title={t('looks_breeds')}
          description={t('looks_breeds_desc')}
        />
        <LooksCategoryCard
          icon="🧥"
          title={t('looks_outfits')}
          description={t('looks_outfits_desc')}
        />
      </section>

      <section className="looks-note-card game-panel-card">
        <div className="looks-note-title">{t('looks_soon')}</div>
        <div className="shop-item-desc">{t('looks_soon_desc')}</div>
      </section>
    </div>
  );
}
