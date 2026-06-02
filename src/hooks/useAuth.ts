import { useState } from "react";

interface User {
  name: string;
  email: string;
  role: string;
  avatar: string;
}

const KEY = "coninmaq_admin_user";

const MOCK_USER: User = {
  name: "Administrador",
  email: "admin@coninmaq.com",
  role: "Super Admin",
  avatar: "A",
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(() => {
    const stored =
      localStorage.getItem(KEY) ?? sessionStorage.getItem(KEY);
    return stored ? JSON.parse(stored) : null;
  });

  const login = (email: string, password: string, remember: boolean): boolean => {
    if (email && password.length >= 4) {
      const u = { ...MOCK_USER, email };
      const storage = remember ? localStorage : sessionStorage;
      storage.setItem(KEY, JSON.stringify(u));
      setUser(u);
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(KEY);
    setUser(null);
  };

  return { user, login, logout };
}
