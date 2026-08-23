import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    localStorage.removeItem("leviaan_token");

    let cancelled = false;
    api
      .get("/auth/me")
      .then((response) => {
        if (!cancelled) setUser(response.data.user);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const refreshUser = useCallback(async () => {
    const response = await api.get("/auth/me");
    setUser(response.data.user);
    return response.data.user;
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      needsUsername: Boolean(user && !user.username),
      isEditor: user?.role === "editor" || user?.role === "creator",
      isCreator: user?.role === "creator",
      isOwner: Boolean(user?.isOwner),
      canSwitchRole: Boolean(user?.canSwitchRole),
      baseRole: user?.baseRole,
      refreshUser,
      async setRole(role) {
        const response = await api.patch("/auth/role", { role });
        setUser(response.data.user);
        return response.data.user;
      },
      async loginWithGoogle({ credential } = {}) {
        const response = await api.post("/auth/google", { credential });
        setUser(response.data.user);
        return response.data;
      },
      async setUsername(username) {
        const response = await api.post("/auth/username", { username });
        setUser(response.data.user);
        return response.data.user;
      },
      async logout() {
        try {
          await api.post("/auth/logout");
        } catch {
          // Local state still clears so the screen goes back to login.
        }
        setUser(null);
      },
    }),
    [user, loading, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
