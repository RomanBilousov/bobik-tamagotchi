import { Trophy, Activity, ShoppingCart, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { t } from '../../i18n';

export default function BottomNav({ hasActivePet, activeTab, onTabChange, isSick }) {
  return (
    <div className="nav-bar">
      {hasActivePet ? (
        <>
          <button className={`nav-item ${activeTab === 'pet' ? 'active' : ''}`} onClick={() => onTabChange('pet')} style={{background:'none',border:'none'}}>
            <Activity size={24} />
            <span>{t('nav_pet')}</span>
          </button>
          <button className={`nav-item ${activeTab === 'shop' ? 'active' : ''}`} onClick={() => onTabChange('shop')} style={{background:'none',border:'none', position:'relative'}}>
            <ShoppingCart size={24} />
            <span>{t('nav_shop')}</span>
            {isSick && <div style={{position:'absolute', top: 4, right: 8, width: 8, height: 8, background: '#ef4444', borderRadius: '50%'}}></div>}
          </button>
          <button className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => onTabChange('settings')} style={{background:'none',border:'none'}}>
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

