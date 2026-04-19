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
import LooksPanel from './components/game/LooksPanel';
import SettingsPanel from './components/game/SettingsPanel';
import ShopPanel from './components/game/ShopPanel';
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
    showFlyout(event, `+${earned} ${t('coins_short')}`, '#fbbf24');
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
      showFlyout(event, `-30 ${t('coins_short')}`, '#ef4444');
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
      showFlyout(event, `-200 ${t('coins_short')}`, '#ef4444');
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
  const evolution = getEvolutionData(aliveMins, t);
  const evolutionProgress = evolution.nextT
    ? ((aliveMins - evolution.currentT) / (evolution.nextT - evolution.currentT)) * 100
    : 100;
  const canFeed = Boolean(pet && pet.energy >= 5);
  const canPlay = Boolean(pet && pet.energy >= 10);
  const canWork = Boolean(pet && pet.energy >= 20 && pet.hunger >= 30);
  const needsCare = Boolean(pet && (pet.hunger < 20 || pet.energy < 20 || pet.happiness < 20));
  const petStateTone = pet?.isSick ? 'danger' : needsCare ? 'warning' : 'stable';
  const sceneStats = [
    { key: 'hunger', label: STATS.hunger.label, value: pet?.hunger ?? 0, colorClass: STATS.hunger.color },
    { key: 'energy', label: STATS.energy.label, value: pet?.energy ?? 0, colorClass: STATS.energy.color },
    { key: 'happiness', label: STATS.happiness.label, value: pet?.happiness ?? 0, colorClass: STATS.happiness.color },
  ];

  return (
    <div className="game-container">
      {errorMessage ? (
        <div className="app-alert">
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
          <div className="game-header-actions">
            <button
              onClick={handleEnvironmentCycle}
              className="environment-chip"
            >
              {pet.environment === 'day' ? t('day') : (pet.environment === 'sunset' ? t('sunset') : t('night'))}
            </button>

            <button className="coins-display coins-display-button" onClick={() => setActiveTab('shop')} type="button">
              <Coins size={16} />
              <span className="coins-display-value">{pet.coins || 0}</span>
            </button>
          </div>
        )}
      </div>

      <div className="game-content-shell">
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
            onBuyEnvSunset={buyEnvSunset}
            onBuyEnvNight={buyEnvNight}
          />
        ) : activeTab === 'looks' ? (
          <LooksPanel
            pet={pet}
            onBuyMagicHat={buyMagicHat}
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
          <div className="game-main-layout">
            <section className="game-stage-column">
              <div className="pet-stage-card">
                <div className="pet-display">
                  <div className="particles-container">
                    {particles.map((particle) => (
                      <div key={particle.id} className="particle" style={{'--vx': particle.vx, '--vy': particle.vy}}>
                        {particle.emoji}
                      </div>
                    ))}
                  </div>

                  <div className="pet-display-canvas">
                    <Scene3D isSick={pet.isSick} aliveMins={aliveMins} hasHat={pet.hasHat} genetics={pet.genetics} environment={pet.environment} actionState={actionState} onPetClick={handlePetClick} />
                  </div>

                  <div className="pet-scene-overlay">
                    <div className="pet-scene-name">Bobik</div>

                    <div className="pet-scene-growth-inline">
                      <div className="pet-scene-growth-header">
                        <span>{t('pet_growth_label')}</span>
                        <span>{evolution.nextT ? `${Math.round(Math.min(100, Math.max(0, evolutionProgress)))}%` : t('pet_growth_complete')}</span>
                      </div>
                      <div className="pet-scene-growth-bar">
                        <div
                          className="pet-scene-growth-fill"
                          style={{ width: `${Math.min(100, Math.max(0, evolutionProgress))}%` }}
                        />
                      </div>
                    </div>

                    {(pet.isSick || needsCare) ? (
                      <div className={`pet-scene-alert pet-scene-alert--${petStateTone}`}>
                        <div className="pet-scene-alert-title">{statusMessage}</div>
                      </div>
                    ) : null}

                    <div className="pet-scene-footer">
                      <span className="pet-evolution-chip pet-evolution-chip--scene pet-scene-stage-chip">{evolution.name}</span>
                      <div className="pet-scene-stats">
                        {sceneStats.map((stat) => (
                          <div key={stat.key} className="pet-scene-stat">
                            <span className="pet-scene-stat-label">{stat.label}</span>
                            <div className="pet-scene-stat-track">
                              <div
                                className={`pet-scene-stat-fill ${stat.colorClass}`}
                                style={{ width: `${Math.max(0, Math.min(100, stat.value))}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="pet-action-dock">
                  <button className="action-btn action-btn-toolbar btn-act-feed" onClick={actFeed} disabled={!canFeed} type="button">
                    <span className="action-btn-icon">🍖</span>
                    <span>{t('action_food')}</span>
                  </button>

                  <button className="action-btn action-btn-toolbar btn-act-sleep" onClick={actSleep} type="button">
                    <span className="action-btn-icon">💤</span>
                    <span>{t('action_sleep_btn')}</span>
                  </button>

                  <button className="action-btn action-btn-toolbar btn-act-play" onClick={actPlay} disabled={!canPlay} type="button">
                    <span className="action-btn-icon">🎾</span>
                    <span>{t('action_play_btn')}</span>
                  </button>

                  <button className="action-btn action-btn-toolbar btn-act-work" onClick={actWork} disabled={!canWork} type="button">
                    <span className="action-btn-icon">💎</span>
                    <span>{t('action_treasure')}</span>
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>

      <BottomNav hasActivePet={Boolean(pet && !pet.died_at)} activeTab={activeTab} onTabChange={setActiveTab} isSick={Boolean(pet?.isSick)} />
    </div>
  );
}
