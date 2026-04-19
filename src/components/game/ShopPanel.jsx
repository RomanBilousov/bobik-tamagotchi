import { useState } from 'react';
import { Coins } from 'lucide-react';
import { t } from '../../i18n';
import { HAT_CATALOG, normalizeHatState } from '../../domain/hats';

function PriceBadge({ amount }) {
  return (
    <span className="price-badge">
      <span>{amount}</span>
      <Coins size={16} className="price-badge-icon" />
    </span>
  );
}

function ShopCategoryButton({ active, label, emoji, onClick }) {
  return (
    <button
      className={`shop-category-tab ${active ? 'shop-category-tab--active' : ''}`}
      onClick={onClick}
      type="button"
    >
      <span className="shop-category-tab-emoji" aria-hidden="true">{emoji}</span>
      <span className="shop-category-tab-label">{label}</span>
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
      <div className="shop-item-main">
        <div className={`shop-item-icon-wrap shop-item-icon-wrap--${tone}`} aria-hidden="true">
          <div className="shop-item-icon">{icon}</div>
        </div>
        <div className="shop-item-info">
          <div className="shop-item-header">
            <div className="shop-item-title">{title}</div>
            <span className={`status-badge status-badge--${statusTone}`}>{status}</span>
          </div>
          <div className="shop-item-desc">{description}</div>
        </div>
      </div>
      <button className={`shop-item-buy ${disabled ? 'shop-item-buy--muted' : ''}`} disabled={disabled} onClick={onClick} type="button">
        {action}
      </button>
    </div>
  );
}

export default function ShopPanel({
  pet,
  onBuyPremiumFood,
  onBuyMedicine,
  onHatAction,
  onBuyEnvSunset,
  onBuyEnvNight,
}) {
  const [activeCategory, setActiveCategory] = useState('care');
  const hatState = normalizeHatState(pet);

  const canBuySteak = pet.coins >= 30;
  const canBuyMedicine = pet.coins >= 50 && pet.isSick;
  const canBuySunset = pet.coins >= 100 && pet.environment !== 'sunset';
  const canBuyNight = pet.coins >= 300 && pet.environment !== 'night';

  const categories = [
    { key: 'care', label: t('shop_cat_care'), emoji: '🍲' },
    { key: 'hats', label: t('shop_cat_hats'), emoji: '🎩' },
    { key: 'clothes', label: t('shop_cat_clothes'), emoji: '👕' },
    { key: 'appearance', label: t('shop_cat_appearance'), emoji: '🐶' },
    { key: 'locations', label: t('shop_cat_locations'), emoji: '🌳' },
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
    hats: HAT_CATALOG.map((hat) => {
      const isOwned = hatState.ownedHats.includes(hat.id);
      const isActive = hatState.activeHat === hat.id;
      const canBuyHat = pet.coins >= hat.price;

      return {
        icon: hat.icon,
        title: t(hat.titleKey),
        description: t(hat.descriptionKey),
        status: isActive
          ? t('shop_state_active')
          : isOwned
            ? t('shop_state_owned')
            : canBuyHat
              ? t('shop_state_ready')
              : t('shop_state_need_coins'),
        statusTone: isActive ? 'active' : isOwned ? 'owned' : canBuyHat ? 'ready' : 'muted',
        disabled: isActive || (!isOwned && !canBuyHat),
        onClick: (event) => onHatAction(hat.id, hat.price, event),
        action: isActive ? t('shop_state_active') : isOwned ? t('shop_action_wear') : <PriceBadge amount={hat.price} />,
        tone: isActive ? 'active' : isOwned ? 'owned' : 'default',
      };
    }),
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
      <div className="shop-category-bar">
        {categories.map((category) => (
          <ShopCategoryButton
            key={category.key}
            active={activeCategory === category.key}
            label={category.label}
            emoji={category.emoji}
            onClick={() => setActiveCategory(category.key)}
          />
        ))}
      </div>

      <section className="shop-catalog-shell game-panel-card">
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
