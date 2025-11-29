import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { BACKEND_URL } from '../config';

export interface User {
  email: string;
  verified: boolean;
  is_active: boolean;
  is_guest?: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  loginAsGuest: () => void;
  logout: () => void;
  syncSettings: () => Promise<void>;
  isLoading: boolean;
  isOnline: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('kika_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('kika_user');
      }
    }
    setIsLoading(false);
  }, []);

  const syncSettings = useCallback(async () => {
    if (!user || user.is_guest || !isOnline) return;

    try {
      // 1. Push local settings to cloud
      const localSettings = {
        aceConfigs: localStorage.getItem('kikaAcePlotterConfigs'),
        endfConfigs: localStorage.getItem('kikaEndfViewerConfigs'),
      };

      await fetch(`${BACKEND_URL}/users/${user.email}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: localSettings }),
      });

      // 2. Pull latest settings (in case another device updated them)
      const response = await fetch(`${BACKEND_URL}/users/${user.email}/settings`);
      if (response.ok) {
        const { data } = await response.json();
        if (data && typeof data === 'object') {
          if (data.aceConfigs) localStorage.setItem('kikaAcePlotterConfigs', data.aceConfigs);
          if (data.endfConfigs) localStorage.setItem('kikaEndfViewerConfigs', data.endfConfigs);
        }
      }
    } catch (error) {
      console.error('Failed to sync settings:', error);
    }
  }, [user, isOnline]);

  // Periodic sync for logged-in users (every 5 minutes)
  useEffect(() => {
    if (!user || user.is_guest || !isOnline) return;
    
    const intervalId = setInterval(() => {
      syncSettings();
    }, 5 * 60 * 1000); // 5 minutes
    
    return () => clearInterval(intervalId);
  }, [user, isOnline, syncSettings]);

  // Sync settings when coming back online
  useEffect(() => {
    if (isOnline && user && !user.is_guest) {
      syncSettings();
    }
  }, [isOnline, user, syncSettings]);

  const login = async (email: string, password: string) => {
    if (!isOnline) {
      return { success: false, message: 'No internet connection. Try guest mode for offline use.' };
    }

    try {
      const response = await fetch(`${BACKEND_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        // Fetch user details
        const userResponse = await fetch(`${BACKEND_URL}/users/${email}`);
        if (userResponse.ok) {
          const userData: User = await userResponse.json();
          setUser(userData);
          localStorage.setItem('kika_user', JSON.stringify(userData));
          
          // Trigger sync after login - pull settings from cloud
          try {
             const settingsRes = await fetch(`${BACKEND_URL}/users/${email}/settings`);
             if (settingsRes.ok) {
                const { data } = await settingsRes.json();
                if (data && typeof data === 'object') {
                  if (data.aceConfigs) localStorage.setItem('kikaAcePlotterConfigs', data.aceConfigs);
                  if (data.endfConfigs) localStorage.setItem('kikaEndfViewerConfigs', data.endfConfigs);
                }
             }
          } catch (e) {
             console.warn('Initial settings sync failed', e);
          }

          return { success: true, message: 'Signed in successfully' };
        }
      }

      return { success: false, message: 'Invalid credentials' };
    } catch (error) {
      return { success: false, message: 'Connection error. Check your internet connection.' };
    }
  };

  const loginAsGuest = () => {
    const guestUser: User = {
      email: 'guest@local',
      verified: true,
      is_active: true,
      is_guest: true,
    };
    setUser(guestUser);
    localStorage.setItem('kika_user', JSON.stringify(guestUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('kika_user');
    // Clean up all session data including saved plot configurations
    // This is especially important for guest users
    localStorage.removeItem('kikaAcePlotterConfigs'); // ACE plot configs
    localStorage.removeItem('kikaEndfViewerConfigs'); // ENDF plot configs
    localStorage.removeItem('workspaceFiles'); // Legacy file storage
  };

  return (
    <AuthContext.Provider value={{ user, login, loginAsGuest, logout, syncSettings, isLoading, isOnline }}>
      {children}
    </AuthContext.Provider>
  );
};
