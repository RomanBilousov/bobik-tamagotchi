import { Trophy, Activity, ShoppingCart, Settings, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { t } from '../../i18n';

export default function BottomNav({ hasActivePet, activeTab, onTabChange, isSick }) {
  return (
    <div className="nav-bar">
      {hasActivePet ? (
        <>
          <button className={`nav-item nav-button-reset ${activeTab === 'pet' ? 'active' : ''}`} onClick={() => onTabChange('pet')} type="button">
            <Activity size={24} />
            <span>{t('nav_pet')}</span>
          </button>
          <button className={`nav-item nav-button-reset ${activeTab === 'shop' ? 'active' : ''}`} onClick={() => onTabChange('shop')} type="button">
            <ShoppingCart size={24} />
            <span>{t('nav_shop')}</span>
            {isSick && <div className="nav-item-dot"></div>}
          </button>
          <button className={`nav-item nav-button-reset ${activeTab === 'looks' ? 'active' : ''}`} onClick={() => onTabChange('looks')} type="button">
            <Sparkles size={24} />
            <span>{t('nav_looks')}</span>
          </button>
          <button className={`nav-item nav-button-reset ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => onTabChange('settings')} type="button">
            <Settings size={24} />
            <span>{t('nav_settings')}</span>
          </button>
        </>
      ) : (
        <Link to="/" className="nav-item active">
          <Activity size={24} />
          <span>{t('nav_home')}</span>
        </Link>
      )}

      <Link to="/leaderboard" className="nav-item">
        <Trophy size={24} />
        <span>{t('nav_lb')}</span>
      </Link>
    </div>
  );
}
