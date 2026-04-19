import { useCallback, useEffect, useState } from 'react';
import { Coins } from 'lucide-react';
import { playSound, toggleMute, getMuteState, setMuteState } from './SoundHelper';
import Scene3D from './Scene3D';
import { t, cycleLang, getLang, getNextLang } from './i18n';
import {
  DEFAULT_PROFILE_NAME,
  applyRuntimeDecayTick,
  buildPetState,
  calculateTimeAlive,
  createStatsConfig,
  getEvolutionData,
  getStatusMessage,
} from './domain/petLogic';
import { syncLocalSettingsFromProfile } from './lib/storage/legacyLocalStorage';
import BottomNav from './components/game/BottomNav';
import SettingsPanel from './components/game/SettingsPanel';
import ShopPanel from './components/game/ShopPanel';
import StatBar from './components/game/StatBar';
import {
  adoptPet,
  loadGameData,
  persistPet,
  saveProfileSettings,
} from './services/gameService';

const STATS = createStatsConfig(t);

export default function GameApp({ session, onLogout }) {
  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [timeAliveStr, setTimeAliveStr] = useState('00:00:00');
  const [particles, setParticles] = useState([]);
  const [flyouts, setFlyouts] = useState([]);
  const [actionState, setActionState] = useState('idle');
  const [playedWarning, setPlayedWarning] = useState(false);
  const [activeTab, setActiveTab] = useState('pet');
  const [isMuted, setIsMuted] = useState(getMuteState());
  const [profileName, setProfileName] = useState(DEFAULT_PROFILE_NAME);

  const reportError = useCallback((error, fallback = t('sync_error')) => {
    setErrorMessage(error?.message || fallback);
  }, []);

  const persistPetState = useCallback(async (nextPet) => {
    return persistPet(session.user.id, nextPet);
  }, [session.user.id]);

  const fetchPet = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      const { pet: loadedPet, profile } = await loadGameData(session.user.id, STATS);

      if (profile) {
        setProfileName(profile.nickname || DEFAULT_PROFILE_NAME);
        syncLocalSettingsFromProfile(profile);

        if (typeof profile.isMuted === 'boolean') {
          setMuteState(profile.isMuted);
          setIsMuted(profile.isMuted);
        }
      }

      setPet(loadedPet ?? null);
      setLoading(false);
    } catch (error) {
      reportError(error);
      setLoading(false);
    }
  }, [reportError, session.user.id]);

  useEffect(() => {
    void fetchPet();
  }, [fetchPet]);

  const triggerParticle = (emoji) => {
    const id = Date.now() + Math.random();
    const vx = (Math.random() - 0.5) * 100 + 'px';
    const vy = (Math.random() - 0.5) * 50 + 'px';
    setParticles((currentParticles) => [...currentParticles, { id, emoji, vx, vy }]);
    setTimeout(() => setParticles((currentParticles) => currentParticles.filter((particle) => particle.id !== id)), 1000);
  };

  const showFlyout = (event, text, color) => {
    let x;
    let y;

    if (event && event.currentTarget) {
      const rect = event.currentTarget.getBoundingClientRect();
      x = rect.left + rect.width / 2;
      y = rect.top;
    } else {
      x = event.clientX || window.innerWidth / 2;
      y = event.clientY || window.innerHeight / 2;
    }

    const id = Date.now() + Math.random();
    setFlyouts((currentFlyouts) => [...currentFlyouts, { id, x, y, text, color }]);
    setTimeout(() => setFlyouts((currentFlyouts) => currentFlyouts.filter((flyout) => flyout.id !== id)), 1000);
  };

  useEffect(() => {
    if (!pet || pet.died_at) {
      return undefined;
    }

    const interval = setInterval(() => {
      setTimeAliveStr(calculateTimeAlive(new Date(pet.born_at), new Date()));
    }, 1000);

    return () => clearInterval(interval);
  }, [pet]);

  useEffect(() => {
    if (!pet || pet.died_at) {
      return undefined;
    }

    const interval = setInterval(() => {
      setPet((previousPet) => {
        if (!previousPet || previousPet.died_at) {
          return previousPet;
        }

        const nextPet = applyRuntimeDecayTick(previousPet, STATS);

        if (!previousPet.isSick && nextPet.isSick) {
          playSound('warning');
        }

        if ((nextPet.hunger < 20 || nextPet.energy < 20 || nextPet.happiness < 20) && !playedWarning) {
          playSound('warning');
          setPlayedWarning(true);
        } else if (nextPet.hunger >= 20 && nextPet.energy >= 20 && nextPet.happiness >= 20) {
          setPlayedWarning(false);
        }

        void persistPetState(nextPet).catch((error) => reportError(error));
        return nextPet;
      });
    }, 10000);

    return () => clearInterval(interval);
  }, [pet, persistPetState, playedWarning, reportError]);

  const createPet = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      const createdPet = await adoptPet(session.user.id);
      setPet(createdPet);
      setActiveTab('pet');
      playSound('play');
    } catch (error) {
      reportError(error);
    } finally {
      setLoading(false);
    }
  };

  const syncAction = (updates) => {
    if (!pet || pet.died_at) {
      return;
    }

    const nextPet = buildPetState(pet, updates);
    setPet(nextPet);
    void persistPetState(nextPet).catch((error) => reportError(error));
  };

  const triggerActionAnim = (type, duration = 3000) => {
    setActionState(type);
    setTimeout(() => setActionState((previousState) => (previousState === type ? 'idle' : previousState)), duration);
  };

  const actFeed = (event) => {
    if (pet.energy < 5) {
      showFlyout(event, t('needs_sleep'), '#ef4444');
      return;
    }

    syncAction({ hunger: pet.hunger + 20, energy: pet.energy - 5 });
    playSound('feed');
    triggerParticle('🍖');
    showFlyout(event, '+20 Голод', '#10b981');
    triggerActionAnim('feed', 3000);
  };

  const actPlay = (event) => {
    if (pet.energy < 10) {
      showFlyout(event, t('too_tired'), '#ef4444');
      return;
    }

    syncAction({ happiness: pet.happiness + 20, energy: pet.energy - 10 });
    playSound('play');
    triggerParticle('🎾');
    showFlyout(event, '+20 Счастье', '#f59e0b');
    triggerActionAnim('play', 3000);
  };

  const actSleep = (event) => {
    syncAction({ energy: pet.energy + 30, happiness: pet.happiness - 5, hunger: pet.hunger - 5 });
    playSound('sleep');
    triggerParticle('💤');
    showFlyout(event, '+30 Энергия', '#6366f1');
    triggerActionAnim('sleep', 6000);
  };

  const actWork = (event) => {
    if (pet.energy < 20 || pet.hunger < 30) {
      showFlyout(event, t('needs_food'), '#ef4444');
      return;
    }

    const earned = 15 + Math.floor(Math.random() * 26);
    syncAction({
      energy: pet.energy - 20,
      hunger: pet.hunger - 30,
      coins: (pet.coins || 0) + earned,
    });

    playSound('play');
    triggerParticle('💰');
    showFlyout(event, `+${earned} 🪙`, '#fbbf24');
    triggerActionAnim('work', 4000);
  };

  const handlePetClick = () => {
    if (actionState !== 'idle') {
      return;
    }

    triggerActionAnim('bark', 1500);
    playSound('bark');
    syncAction({ happiness: Math.min(100, (pet?.happiness || 0) + 1) });

    const rect = document.querySelector('.pet-display').getBoundingClientRect();
    const fakeEvent = { clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 };
    triggerParticle('💬');
    showFlyout(fakeEvent, '+1 💖', '#f43f5e');
  };

  const buyPremiumFood = (event) => {
    if (pet.coins >= 30) {
      syncAction({ coins: pet.coins - 30, hunger: pet.hunger + 50, happiness: pet.happiness + 10 });
      playSound('feed');
      triggerParticle('🥩');
      showFlyout(event, '-30 🪙', '#ef4444');
    }
  };

  const buyMedicine = (event) => {
    if (pet.coins >= 50 && pet.isSick) {
      syncAction({ coins: pet.coins - 50, isSick: false });
      playSound('heal');
      triggerParticle('💊');
      showFlyout(event, '+ Вылечен!', '#10b981');
    }
  };

  const buyMagicHat = (event) => {
    if (pet.coins >= 200 && !pet.hasHat) {
      syncAction({ coins: pet.coins - 200, hasHat: true });
      playSound('play');
      triggerParticle('✨');
      showFlyout(event, '-200 🪙', '#ef4444');
    }
  };

  const buyEnvSunset = (event) => {
    if (pet.coins >= 100 && pet.environment !== 'sunset') {
      syncAction({ coins: pet.coins - 100, environment: 'sunset' });
      playSound('play');
      triggerParticle('🌅');
      showFlyout(event, t('new_bg'), '#10b981');
    }
  };

  const buyEnvNight = (event) => {
    if (pet.coins >= 300 && pet.environment !== 'night') {
      syncAction({ coins: pet.coins - 300, environment: 'night' });
      playSound('play');
      triggerParticle('🌃');
      showFlyout(event, t('night_unlocked'), '#8b5cf6');
    }
  };

  const handleUpdateProfile = async (event) => {
    try {
      const updatedProfile = await saveProfileSettings(session.user.id, {
        nickname: profileName,
        lang: getLang(),
        isMuted,
      });

      setProfileName(updatedProfile.nickname);
      syncLocalSettingsFromProfile(updatedProfile);
      playSound('play');
      showFlyout(event, t('saved_ok'), '#10b981');
    } catch (error) {
      reportError(error, t('profile_save_error'));
      showFlyout(event, t('profile_save_error'), '#ef4444');
    }
  };

  const handleToggleMute = async () => {
    const nextMuted = toggleMute();
    setIsMuted(nextMuted);

    try {
      const updatedProfile = await saveProfileSettings(session.user.id, { isMuted: nextMuted });
      syncLocalSettingsFromProfile(updatedProfile);
    } catch (error) {
      reportError(error, t('profile_save_error'));
    }
  };

  const handleCycleLang = async () => {
    const nextLang = getNextLang();

    try {
      const updatedProfile = await saveProfileSettings(session.user.id, { lang: nextLang });
      syncLocalSettingsFromProfile(updatedProfile);
    } catch (error) {
      reportError(error, t('profile_save_error'));
    }

    cycleLang();
  };

  const handleEnvironmentCycle = () => {
    if (!pet || pet.died_at) {
      return;
    }

    const envs = ['day', 'sunset', 'night'];
    const nextEnv = envs[(envs.indexOf(pet.environment) + 1) % envs.length] || 'day';
    const updatedPet = buildPetState(pet, { environment: nextEnv });
    setPet(updatedPet);
    void persistPetState(updatedPet).catch((error) => reportError(error));
  };

  if (loading) {
    return <div className="auth-container">{t('loading')}</div>;
  }

  let aliveMins = 0;
  if (pet && !pet.died_at) {
    aliveMins = (new Date() - new Date(pet.born_at)) / (1000 * 60);
  }
  const statusMessage = getStatusMessage(pet, aliveMins, t);

  return (
    <div className="game-container">
      {errorMessage ? (
        <div className="glass-card" style={{ padding: '1rem', marginBottom: '1rem', border: '1px solid rgba(239, 68, 68, 0.35)', color: '#fecaca' }}>
          {errorMessage}
        </div>
      ) : null}

      {flyouts.map((flyout) => (
        <div key={flyout.id} className="flyout" style={{ left: flyout.x, top: flyout.y, color: flyout.color }}>
          {flyout.text}
        </div>
      ))}

      <div className="game-header">
        <div className="time-alive">
          {(pet && !pet.died_at) ? timeAliveStr : (pet && pet.died_at ? t('dead') : '---')}
        </div>

        {pet && !pet.died_at && (
          <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
            <button
              onClick={handleEnvironmentCycle}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '12px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}
            >
              {pet.environment === 'day' ? t('day') : (pet.environment === 'sunset' ? t('sunset') : t('night'))}
            </button>

            <div className="coins-display" onClick={() => setActiveTab('shop')}>
              <Coins size={16} />
              <span style={{fontSize: '1.2rem', marginLeft: '0.2rem'}}>{pet.coins || 0}</span>
            </div>
          </div>
        )}
      </div>

      {!pet ? (
        <div className="auth-container" style={{ padding: 0 }}>
          <div className="glass-card">
            <h2>{t('adopt_pet')}</h2>
            <p>{t('adopt_desc')}</p>
            <button className="btn-primary" onClick={() => void createPet()}>{t('take_bobik')}</button>
          </div>
        </div>
      ) : pet.died_at ? (
        <div className="dead-pet-screen">
          <div className="pet-avatar" style={{ filter: 'grayscale(1)', animation: 'none', fontSize: '8rem' }}>👻</div>
          <h2>{t('bobik_died')}</h2>
          <p>{t('lived_for')} {calculateTimeAlive(new Date(pet.born_at), new Date(pet.died_at))}</p>
          <button className="btn-primary" onClick={() => void createPet()}>{t('adopt_new')}</button>
        </div>
      ) : activeTab === 'shop' ? (
        <ShopPanel
          pet={pet}
          onBuyPremiumFood={buyPremiumFood}
          onBuyMedicine={buyMedicine}
          onBuyMagicHat={buyMagicHat}
          onBuyEnvSunset={buyEnvSunset}
          onBuyEnvNight={buyEnvNight}
        />
      ) : activeTab === 'settings' ? (
        <SettingsPanel
          profileName={profileName}
          onProfileNameChange={setProfileName}
          onSaveProfile={handleUpdateProfile}
          onCycleLang={handleCycleLang}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onLogout={onLogout}
        />
      ) : (
        <>
          <div className="pet-display" style={{position: 'relative', width: '100%', height: '35vh', minHeight: '260px', marginBottom: '1.5rem'}}>
            <div className="particles-container">
              {particles.map((particle) => (
                <div key={particle.id} className="particle" style={{'--vx': particle.vx, '--vy': particle.vy}}>
                  {particle.emoji}
                </div>
              ))}
            </div>

            <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, cursor: 'grab', borderRadius: '24px', overflow: 'hidden' }}>
              <Scene3D isSick={pet.isSick} aliveMins={aliveMins} hasHat={pet.hasHat} genetics={pet.genetics} environment={pet.environment} actionState={actionState} onPetClick={handlePetClick} />
            </div>

            <div className="pet-status" style={{ position: 'absolute', bottom: '-2.5rem', width: '100%', textAlign: 'center', zIndex: 10, textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
              <div className="pet-name">
                Bobik <span style={{fontSize: '1rem', fontWeight: 500, color: '#fbbf24'}}>{getEvolutionData(aliveMins, t).name}</span>
              </div>

              {(() => {
                const evolution = getEvolutionData(aliveMins, t);
                if (!evolution.nextT) {
                  return null;
                }

                const progress = ((aliveMins - evolution.currentT) / (evolution.nextT - evolution.currentT)) * 100;
                return (
                  <div style={{width: '200px', height: '4px', background: 'rgba(0,0,0,0.5)', margin: '0.2rem auto', borderRadius: '4px', overflow: 'hidden'}}>
                    <div style={{width: `${Math.min(100, Math.max(0, progress))}%`, height: '100%', background: '#fbbf24', transition: 'width 1s linear'}}/>
                  </div>
                );
              })()}

              <div className="pet-status-msg" style={{color: pet.isSick ? '#ef4444' : 'var(--text-primary)', marginTop: '0.2rem'}}>
                {statusMessage}
                {pet.isSick && <div style={{fontSize: '0.85rem', marginTop: '0.1rem'}}>{t('disease_warning')}</div>}
              </div>
            </div>
          </div>

          <div className="stats-container" style={{ marginTop: 'auto', marginBottom: '1rem' }}>
            <StatBar label={STATS.hunger.label} value={pet.hunger} colorClass={STATS.hunger.color} />
            <StatBar label={STATS.energy.label} value={pet.energy} colorClass={STATS.energy.color} />
            <StatBar label={STATS.happiness.label} value={pet.happiness} colorClass={STATS.happiness.color} />
          </div>

          <div className="action-buttons">
            <button className="action-btn btn-act-feed" onClick={actFeed} style={{opacity: pet.energy < 5 ? 0.3 : 1}}>
              <span style={{fontSize:'1.5rem'}}>🍖</span> {t('action_food')}
            </button>
            <button className="action-btn btn-act-play" onClick={actPlay} style={{opacity: pet.energy < 10 ? 0.3 : 1}}>
              <span style={{fontSize:'1.5rem'}}>🎾</span> {t('action_play_btn')}
            </button>
            <button className="action-btn btn-act-sleep" onClick={actSleep}>
              <span style={{fontSize:'1.5rem'}}>💤</span> {t('action_sleep_btn')}
            </button>
            <button className="action-btn btn-act-work" onClick={actWork} style={{opacity: (pet.energy < 20 || pet.hunger < 30) ? 0.3 : 1}}>
              <span style={{fontSize:'1.5rem'}}>💎</span> {t('action_treasure')}
            </button>
          </div>
        </>
      )}

      <BottomNav hasActivePet={Boolean(pet && !pet.died_at)} activeTab={activeTab} onTabChange={setActiveTab} isSick={Boolean(pet?.isSick)} />
    </div>
  );
}
