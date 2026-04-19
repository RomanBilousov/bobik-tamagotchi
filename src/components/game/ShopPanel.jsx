import { useState } from 'react';
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

function ShopCategoryButton({ active, label, onClick }) {
  return (
    <button
      className={`shop-category-tab ${active ? 'shop-category-tab--active' : ''}`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
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
  onBuyMagicHat,
  onBuyEnvSunset,
  onBuyEnvNight,
}) {
  const [activeCategory, setActiveCategory] = useState('care');

  const canBuySteak = pet.coins >= 30;
  const canBuyMedicine = pet.coins >= 50 && pet.isSick;
  const canBuyHat = pet.coins >= 200 && !pet.hasHat;
  const canBuySunset = pet.coins >= 100 && pet.environment !== 'sunset';
  const canBuyNight = pet.coins >= 300 && pet.environment !== 'night';

  const categories = [
    { key: 'care', label: t('shop_cat_care'), title: t('shop_cat_care'), description: t('shop_cat_care_desc') },
    { key: 'hats', label: t('shop_cat_hats'), title: t('shop_cat_hats'), description: t('shop_cat_hats_desc') },
    { key: 'clothes', label: t('shop_cat_clothes'), title: t('shop_cat_clothes'), description: t('shop_cat_clothes_desc') },
    { key: 'appearance', label: t('shop_cat_appearance'), title: t('shop_cat_appearance'), description: t('shop_cat_appearance_desc') },
    { key: 'locations', label: t('shop_cat_locations'), title: t('shop_cat_locations'), description: t('shop_cat_locations_desc') },
  ];

  const itemsByCategory = {
    care: [
      {
        icon: '🥩',
        title: t('super_steak'),
        description: t('steak_desc'),
        status: canBuySteak ? t('shop_state_ready') : t('shop_state_need_coins'),
        statusTone: canBuySteak ? 'ready' : 'muted',
        disabled: !canBuySteak,
        onClick: onBuyPremiumFood,
        action: <PriceBadge amount={30} />,
      },
      {
        icon: '💊',
        title: t('health_pill'),
        description: t('pill_desc'),
        status: pet.isSick ? t('shop_state_urgent') : t('healthy'),
        statusTone: pet.isSick ? 'danger' : 'owned',
        disabled: !canBuyMedicine,
        onClick: onBuyMedicine,
        action: pet.isSick ? <PriceBadge amount={50} /> : t('healthy'),
        tone: pet.isSick ? 'danger' : 'default',
      },
    ],
    hats: [
      {
        icon: '🎩',
        title: t('magic_hat'),
        description: t('hat_desc'),
        status: pet.hasHat ? t('shop_state_owned') : canBuyHat ? t('shop_state_ready') : t('shop_state_need_coins'),
        statusTone: pet.hasHat ? 'owned' : canBuyHat ? 'ready' : 'muted',
        disabled: !canBuyHat,
        onClick: onBuyMagicHat,
        action: pet.hasHat ? t('shop_state_owned') : <PriceBadge amount={200} />,
        tone: pet.hasHat ? 'owned' : 'default',
      },
    ],
    clothes: [
      {
        icon: '🧥',
        title: t('looks_outfits'),
        description: t('looks_outfits_desc'),
        status: t('shop_state_soon'),
        statusTone: 'muted',
        disabled: true,
        onClick: () => {},
        action: t('shop_state_soon'),
      },
      {
        icon: '🧣',
        title: t('shop_clothes_sets'),
        description: t('shop_clothes_sets_desc'),
        status: t('shop_state_soon'),
        statusTone: 'muted',
        disabled: true,
        onClick: () => {},
        action: t('shop_state_soon'),
      },
    ],
    appearance: [
      {
        icon: '🎨',
        title: t('looks_colors'),
        description: t('looks_colors_desc'),
        status: t('shop_state_soon'),
        statusTone: 'muted',
        disabled: true,
        onClick: () => {},
        action: t('shop_state_soon'),
      },
      {
        icon: '🐕',
        title: t('looks_breeds'),
        description: t('looks_breeds_desc'),
        status: t('shop_state_soon'),
        statusTone: 'muted',
        disabled: true,
        onClick: () => {},
        action: t('shop_state_soon'),
      },
    ],
    locations: [
      {
        icon: '🌅',
        title: t('env_sunset'),
        description: t('env_sunset_desc'),
        status: pet.environment === 'sunset' ? t('shop_state_active') : canBuySunset ? t('shop_state_ready') : t('shop_state_need_coins'),
        statusTone: pet.environment === 'sunset' ? 'active' : canBuySunset ? 'ready' : 'muted',
        disabled: !canBuySunset,
        onClick: onBuyEnvSunset,
        action: pet.environment === 'sunset' ? t('shop_state_active') : <PriceBadge amount={100} />,
        tone: pet.environment === 'sunset' ? 'active' : 'default',
      },
      {
        icon: '🌃',
        title: t('env_night'),
        description: t('env_night_desc'),
        status: pet.environment === 'night' ? t('shop_state_active') : canBuyNight ? t('shop_state_ready') : t('shop_state_need_coins'),
        statusTone: pet.environment === 'night' ? 'active' : canBuyNight ? 'ready' : 'muted',
        disabled: !canBuyNight,
        onClick: onBuyEnvNight,
        action: pet.environment === 'night' ? t('shop_state_active') : <PriceBadge amount={300} />,
        tone: pet.environment === 'night' ? 'active' : 'default',
      },
    ],
  };

  const activeCategoryMeta = categories.find((category) => category.key === activeCategory) || categories[0];
  const activeItems = itemsByCategory[activeCategoryMeta.key] || [];

  return (
    <div className="shop-grid shop-screen screen-surface">
      <div className="screen-header">
        <span className="screen-kicker">{t('nav_shop')}</span>
        <h2 className="screen-title">{t('shop_title')}</h2>
        <p className="screen-description">{t('shop_desc')}</p>
      </div>

      <div className="shop-category-bar">
        {categories.map((category) => (
          <ShopCategoryButton
            key={category.key}
            active={activeCategory === category.key}
            label={category.label}
            onClick={() => setActiveCategory(category.key)}
          />
        ))}
      </div>

      <section className="shop-catalog-shell game-panel-card">
        <div className="shop-catalog-header">
          <div className="shop-catalog-title">{activeCategoryMeta.title}</div>
          <div className="shop-catalog-description">{activeCategoryMeta.description}</div>
        </div>

        <div className="shop-catalog-grid">
          {activeItems.map((item) => (
            <ShopItem
              key={`${activeCategoryMeta.key}-${item.title}`}
              icon={item.icon}
              title={item.title}
              description={item.description}
              status={item.status}
              statusTone={item.statusTone}
              disabled={item.disabled}
              onClick={item.onClick}
              action={item.action}
              tone={item.tone}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
