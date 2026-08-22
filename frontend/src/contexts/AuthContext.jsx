import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/client.js";
import { TOKEN_KEY } from "../config.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    api
      .get("/auth/me")
      .then((response) => {
        if (!cancelled) setUser(response.data.user);
      })
      .catch(() => {
        if (!cancelled) {
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      needsUsername: Boolean(user && !user.username),
      isEditor: user?.role === "editor" || user?.role === "creator",
      isCreator: user?.role === "creator",
      async loginWithGoogle(credential) {
        const response = await api.post("/auth/google", { credential });
        localStorage.setItem(TOKEN_KEY, response.data.token);
        setToken(response.data.token);
        setUser(response.data.user);
        return response.data;
      },
      async setUsername(username) {
        const response = await api.post("/auth/username", { username });
        setUser(response.data.user);
        return response.data.user;
      },
      logout() {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
