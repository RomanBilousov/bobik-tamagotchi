import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import Auth from './Auth';
import GameApp from './GameApp';
import Leaderboard from './Leaderboard';
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
    const legacyProfile = readLegacyProfileSettings();
    const profile = await ensureProfile(userId, legacyProfile);
    syncLocalSettingsFromProfile(profile);

    if (!hasLegacyMigrationRun(userId)) {
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

      markLegacyMigrationRun(userId);
    }

    clearLegacySensitiveData();
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
          element={!session ? <Auth appError={appError} /> : <Navigate to="/" replace />} 
        />
        <Route 
          path="/leaderboard" 
          element={session ? <Leaderboard /> : <Navigate to="/auth" replace />} 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
