import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Activity, ShoppingCart, Settings } from 'lucide-react';
import { t } from './i18n';
import { getLeaderboard } from './repositories/leaderboardRepo';

export default function Leaderboard() {
  const [leaders, setLeaders] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      try {
        const data = await getLeaderboard(10);
        if (isMounted) {
          setLeaders(data);
          setErrorMessage('');
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error.message || t('sync_error'));
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const formatLived = (ms) => {
    if (!ms || ms < 0) return '00:00:00';
    const diff = Math.floor(ms / 1000);
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    return `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
  };

  return (
    <div className="game-container leaderboard-container">
      <div className="game-content-shell leaderboard-content-shell">
        <section className="leaderboard-screen game-panel-card">
          <div className="leaderboard-header">
            <div className="leaderboard-title-group">
              <Trophy size={28} className="leaderboard-title-icon" />
              <h2 className="leaderboard-title">{t('lb_title')}</h2>
            </div>
          </div>

          {errorMessage ? (
            <div className="leaderboard-alert">{errorMessage}</div>
          ) : null}

          <div className="leader-list">
            {leaders.length === 0 ? (
              <div className="leaderboard-empty-state">
                <p>{t('lb_empty')}</p>
                <p>{t('lb_empty_desc')}</p>
              </div>
            ) : (
              leaders.map((l, idx) => (
                <div key={`${l.id}-${idx}`} className="leader-item">
                  <div className="leader-rank">#{idx + 1}</div>
                  <div className="leader-info">
                    <div className="leader-name">
                      {l.nickname || `${t('user_lb')} ${l.user_id?.substring(0, 6)}...`}
                    </div>
                    <div className="leader-time">{t('lived_lb')} {formatLived(l.timeLivedMs)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="nav-bar">
        <Link to="/" className="nav-item">
          <Activity size={24} />
          <span>{t('nav_pet')}</span>
        </Link>
        <Link to="/" className="nav-item">
          <ShoppingCart size={24} />
          <span>{t('nav_shop')}</span>
        </Link>
        <Link to="/" className="nav-item">
          <Settings size={24} />
          <span>{t('nav_settings')}</span>
        </Link>
        <button className="nav-item nav-button-reset active" type="button">
          <Trophy size={24} />
          <span>{t('nav_lb')}</span>
        </button>
      </div>
    </div>
  );
}
