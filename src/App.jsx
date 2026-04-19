import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import Auth from './Auth';
import GameApp from './GameApp';
import {
  SUPABASE_CONFIG_ERROR,
  isSupabaseConfigured,
  supabase,
} from './lib/supabase/client';
import { ensureProfile } from './repositories/profileRepo';
import {
  getPetCount,
  importLegacyLeaderboard,
  importLegacyPet,
} from './repositories/petRepo';
import {
  clearLegacySensitiveData,
  hasLegacyMigrationRun,
  markLegacyMigrationRun,
  readLegacyLeaderboard,
  readLegacyPet,
  readLegacyProfileSettings,
  syncLocalSettingsFromProfile,
} from './lib/storage/legacyLocalStorage';

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isAuthBootstrapRace(error) {
  const message = error?.message || '';
  return message.includes('row-level security policy') || message.includes('Authentication required');
}

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [appError, setAppError] = useState('');

  const bootstrapUser = useCallback(async (nextSession) => {
    if (!nextSession) {
      clearLegacySensitiveData();
      return;
    }

    const userId = nextSession.user.id;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const legacyProfile = readLegacyProfileSettings();
        const profile = await ensureProfile(userId, legacyProfile);
        syncLocalSettingsFromProfile(profile);

        if (!hasLegacyMigrationRun(userId)) {
          try {
            const petCount = await getPetCount(userId);

            if (petCount === 0) {
              const legacyPet = readLegacyPet();
              const legacyLeaderboard = readLegacyLeaderboard();
              const isLegacyPetAlreadyInLeaderboard =
                legacyPet?.died_at &&
                legacyLeaderboard.some(
                  (entry) =>
                    entry?.born_at === legacyPet.born_at &&
                    entry?.died_at === legacyPet.died_at,
                );

              if (legacyPet && !isLegacyPetAlreadyInLeaderboard) {
                await importLegacyPet(userId, legacyPet);
              }

              if (legacyLeaderboard.length > 0) {
                await importLegacyLeaderboard(userId, legacyLeaderboard);
              }
            }
          } catch (error) {
            console.error('Skipping legacy data migration', error);
          } finally {
            markLegacyMigrationRun(userId);
          }
        }

        clearLegacySensitiveData();
        return;
      } catch (error) {
        if (!isAuthBootstrapRace(error) || attempt === 2) {
          throw error;
        }

        await wait(150 * (attempt + 1));
      }
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (!isSupabaseConfigured) {
      clearLegacySensitiveData();
      setAppError(SUPABASE_CONFIG_ERROR);
      setLoading(false);
      return () => {
        isMounted = false;
      };
    }

    const handleSessionChange = async (nextSession) => {
      if (!isMounted) {
        return;
      }

      setLoading(true);

      if (!nextSession) {
        setSession(null);
        clearLegacySensitiveData();
        setAppError('');
        setLoading(false);
        return;
      }

      try {
        await bootstrapUser(nextSession);
        if (isMounted) {
          setSession(nextSession);
          setAppError('');
        }
      } catch (error) {
        if (isMounted) {
          setSession(nextSession);
          setAppError(error.message || SUPABASE_CONFIG_ERROR);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void (async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (error) {
        setAppError(error.message);
        setLoading(false);
        return;
      }

      await handleSessionChange(data.session);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'INITIAL_SESSION') {
        return;
      }

      if (event === 'TOKEN_REFRESHED') {
        setSession(nextSession ?? null);
        return;
      }

      void handleSessionChange(nextSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [bootstrapUser]);

  const handleLogout = async () => {
    clearLegacySensitiveData();

    if (!supabase) {
      setSession(null);
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      setAppError(error.message);
      return;
    }

    setSession(null);
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'white' }}>Загрузка...</div>;
  }

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route 
          path="/" 
          element={session ? <GameApp session={session} onLogout={handleLogout} /> : <Navigate to="/auth" replace />} 
        />
        <Route 
          path="/auth" 
          element={<Auth appError={appError} session={session} onLogout={handleLogout} />} 
        />
        <Route 
          path="/leaderboard" 
          element={session ? <GameApp session={session} onLogout={handleLogout} initialTab="leaderboard" /> : <Navigate to="/auth" replace />} 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
