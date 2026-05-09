import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { toast } from "sonner";

type User = {
  id: string;
  email: string;
  fullName?: string;
  profilePicturePath?: string;
  resumePath?: string;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  login: (data: { user: User; accessToken: string; refreshToken: string }) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

const IDLE_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });

  // Support both old "token" key and new "accessToken" key for migration
  const [accessToken, setAccessToken] = useState<string | null>(
    () => localStorage.getItem("accessToken") || localStorage.getItem("token")
  );
  const [refreshToken, setRefreshToken] = useState<string | null>(
    () => localStorage.getItem("refreshToken")
  );

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const logout = useCallback(() => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
  }, []);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      toast.info("You've been signed out due to inactivity.");
      logout();
    }, IDLE_TIMEOUT_MS);
  }, [logout]);

  // Set up idle detection when user is logged in
  useEffect(() => {
    if (!user) {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      return;
    }

    const events = ["mousedown", "keydown", "touchstart", "scroll", "click"];
    events.forEach((e) => window.addEventListener(e, resetIdleTimer, { passive: true }));
    resetIdleTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetIdleTimer));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [user, resetIdleTimer]);

  // Auto-refresh access token using refresh token
  useEffect(() => {
    if (!refreshToken || !user) return;

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

    const tryRefresh = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) {
          logout();
          return;
        }
        const data = await res.json();
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);
        setAccessToken(data.accessToken);
        setRefreshToken(data.refreshToken);
      } catch {
        logout();
      }
    };

    // Refresh 30 minutes before access token expires (every 4.5 hours)
    const REFRESH_INTERVAL_MS = 4.5 * 60 * 60 * 1000;
    const timer = setInterval(tryRefresh, REFRESH_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [refreshToken, user, logout]);

  const login = (data: { user: User; accessToken: string; refreshToken: string }) => {
    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    localStorage.removeItem("token"); // clear old key
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
    setAccessToken(data.accessToken);
    setRefreshToken(data.refreshToken);
  };

  const updateUser = (updatedUser: Partial<User>) => {
    setUser((currentUser) => {
      if (!currentUser) return null;
      const merged = { ...currentUser, ...updatedUser };
      localStorage.setItem("user", JSON.stringify(merged));
      return merged;
    });
  };

  return (
    <AuthContext.Provider value={{ user, token: accessToken, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  return context;
};
