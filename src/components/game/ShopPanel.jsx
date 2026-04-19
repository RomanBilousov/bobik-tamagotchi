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

function ShopItem({
  icon,
  title,
  description,
  status,
  statusTone = 'muted',
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

export default function ShopPanel({
  pet,
  onBuyPremiumFood,
  onBuyMedicine,
  onBuyEnvSunset,
  onBuyEnvNight,
}) {
  const canBuySteak = pet.coins >= 30;
  const canBuyMedicine = pet.coins >= 50 && pet.isSick;
  const canBuySunset = pet.coins >= 100 && pet.environment !== 'sunset';
  const canBuyNight = pet.coins >= 300 && pet.environment !== 'night';

  return (
    <div className="shop-grid screen-surface">
      <div className="screen-header">
        <span className="screen-kicker">{t('nav_shop')}</span>
        <h2 className="screen-title">{t('shop_title')}</h2>
        <p className="screen-description">{t('shop_desc')}</p>
      </div>

      <ShopItem
        icon="🥩"
        title={t('super_steak')}
        description={t('steak_desc')}
        status={canBuySteak ? t('shop_state_ready') : t('shop_state_need_coins')}
        statusTone={canBuySteak ? 'ready' : 'muted'}
        disabled={!canBuySteak}
        onClick={onBuyPremiumFood}
        action={<PriceBadge amount={30} />}
      />

      <ShopItem
        icon="💊"
        title={t('health_pill')}
        description={t('pill_desc')}
        status={pet.isSick ? t('shop_state_urgent') : t('healthy')}
        statusTone={pet.isSick ? 'danger' : 'owned'}
        disabled={!canBuyMedicine}
        onClick={onBuyMedicine}
        action={pet.isSick ? <PriceBadge amount={50} /> : t('healthy')}
        tone={pet.isSick ? 'danger' : 'default'}
      />

      <ShopItem
        icon="🌅"
        title={t('env_sunset')}
        description={t('env_sunset_desc')}
        status={
          pet.environment === 'sunset'
            ? t('shop_state_active')
            : canBuySunset
              ? t('shop_state_ready')
              : t('shop_state_need_coins')
        }
        statusTone={pet.environment === 'sunset' ? 'active' : canBuySunset ? 'ready' : 'muted'}
        disabled={!canBuySunset}
        onClick={onBuyEnvSunset}
        action={pet.environment === 'sunset' ? t('shop_state_active') : <PriceBadge amount={100} />}
        tone={pet.environment === 'sunset' ? 'active' : 'default'}
      />

      <ShopItem
        icon="🌃"
        title={t('env_night')}
        description={t('env_night_desc')}
        status={
          pet.environment === 'night'
            ? t('shop_state_active')
            : canBuyNight
              ? t('shop_state_ready')
              : t('shop_state_need_coins')
        }
        statusTone={pet.environment === 'night' ? 'active' : canBuyNight ? 'ready' : 'muted'}
        disabled={!canBuyNight}
        onClick={onBuyEnvNight}
        action={pet.environment === 'night' ? t('shop_state_active') : <PriceBadge amount={300} />}
        tone={pet.environment === 'night' ? 'active' : 'default'}
      />
    </div>
  );
}
