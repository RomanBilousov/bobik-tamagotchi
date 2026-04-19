import { useEffect, useState } from 'react';
import { Medal, Trophy } from 'lucide-react';
import { t } from './i18n';
import { buildFunNickname } from './lib/profile/funNickname';
import { getLeaderboard } from './repositories/leaderboardRepo';

const TOP_RANK_CLASSES = {
  0: 'leader-item--top-1',
  1: 'leader-item--top-2',
  2: 'leader-item--top-3',
};

const TOP_MEDAL_CLASSES = {
  0: 'leader-rank-badge--gold',
  1: 'leader-rank-badge--silver',
  2: 'leader-rank-badge--bronze',
};

function formatLived(ms) {
  if (!ms || ms < 0) {
    return '00:00:00';
  }

  const diff = Math.floor(ms / 1000);
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  return `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
}

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

  return (
    <section className="leaderboard-screen game-panel-card">
      <div className="leaderboard-header">
        <div className="leaderboard-title-group">
          <Trophy size={28} className="leaderboard-title-icon" />
          <div className="leaderboard-heading-copy">
            <h2 className="leaderboard-title">{t('lb_title')}</h2>
            <p className="leaderboard-subtitle">{t('lb_best_per_user')}</p>
          </div>
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
          leaders.map((leader, index) => {
            const rowClassName = TOP_RANK_CLASSES[index] || '';
            const medalClassName = TOP_MEDAL_CLASSES[index] || '';

            return (
              <article key={leader.user_id || leader.id || index} className={`leader-item ${rowClassName}`.trim()}>
                <div className="leader-rank">
                  {index < 3 ? (
                    <span className={`leader-rank-badge ${medalClassName}`.trim()}>
                      <Medal size={18} />
                      <span>#{index + 1}</span>
                    </span>
                  ) : (
                    <span className="leader-rank-text">#{index + 1}</span>
                  )}
                </div>

                <div className="leader-info">
                  <div className="leader-name">
                    {leader.nickname || buildFunNickname(leader.user_id || leader.id)}
                  </div>
                  <div className="leader-time">{t('lived_lb')} {formatLived(leader.timeLivedMs)}</div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
