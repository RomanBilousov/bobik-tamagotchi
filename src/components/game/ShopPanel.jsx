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

export default function ShopPanel({
  pet,
  onBuyPremiumFood,
  onBuyMedicine,
  onBuyMagicHat,
  onBuyEnvSunset,
  onBuyEnvNight,
}) {
  return (
    <div className="shop-grid">
      <h2 style={{fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem'}}>{t('shop_title')}</h2>
      <p style={{color: 'var(--text-secondary)', marginBottom: '1rem'}}>
        {t('shop_desc')}
      </p>

      <div className="shop-item">
        <div className="shop-item-icon">🥩</div>
        <div className="shop-item-info">
          <div className="shop-item-title">{t('super_steak')}</div>
          <div className="shop-item-desc">{t('steak_desc')}</div>
        </div>
        <button className="shop-item-buy" disabled={pet.coins < 30} onClick={onBuyPremiumFood}>
          <PriceBadge amount={30} />
        </button>
      </div>

      <div className="shop-item" style={{border: pet.isSick ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.1)'}}>
        <div className="shop-item-icon">💊</div>
        <div className="shop-item-info">
          <div className="shop-item-title">{t('health_pill')}</div>
          <div className="shop-item-desc">{t('pill_desc')}</div>
        </div>
        <button className="shop-item-buy" disabled={pet.coins < 50 || !pet.isSick} onClick={onBuyMedicine}>
          {pet.isSick ? <PriceBadge amount={50} /> : t('healthy')}
        </button>
      </div>

      {!pet.hasHat && (
        <div className="shop-item">
          <div className="shop-item-icon">🎩</div>
          <div className="shop-item-info">
            <div className="shop-item-title">{t('magic_hat')}</div>
            <div className="shop-item-desc">{t('hat_desc')}</div>
          </div>
          <button className="shop-item-buy" disabled={pet.coins < 200} onClick={onBuyMagicHat}>
            <PriceBadge amount={200} />
          </button>
        </div>
      )}

      {pet.environment !== 'sunset' && (
        <div className="shop-item">
          <div className="shop-item-icon">🌅</div>
          <div className="shop-item-info">
            <div className="shop-item-title">{t('env_sunset')}</div>
            <div className="shop-item-desc">{t('env_sunset_desc')}</div>
          </div>
          <button className="shop-item-buy" disabled={pet.coins < 100} onClick={onBuyEnvSunset}>
            <PriceBadge amount={100} />
          </button>
        </div>
      )}

      {pet.environment !== 'night' && (
        <div className="shop-item">
          <div className="shop-item-icon">🌃</div>
          <div className="shop-item-info">
            <div className="shop-item-title">{t('env_night')}</div>
            <div className="shop-item-desc">{t('env_night_desc')}</div>
          </div>
          <button className="shop-item-buy" disabled={pet.coins < 300} onClick={onBuyEnvNight}>
            <PriceBadge amount={300} />
          </button>
        </div>
      )}
    </div>
  );
}
