import { useState } from "react";
import { api, setTokens, clearTokens, getToken } from "../services/api";
import { buildAbility, type AppAbility, type PermissionDef } from "../ability";
import { AbilityBuilder, createMongoAbility } from "@casl/ability";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  permissions: PermissionDef[];
}

const USER_KEY = "coninmaq_admin_user";

function storedUser(): User | null {
  const raw = localStorage.getItem(USER_KEY) ?? sessionStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(() => {
    if (!getToken()) return null;
    return storedUser();
  });

  const ability: AppAbility = (() => {
    if (!user) return createMongoAbility();
    if (user.role === "admin") {
      const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);
      can("manage", "all");
      return build();
    }
    return buildAbility(user.permissions ?? []);
  })();

  const login = async (email: string, password: string, remember: boolean): Promise<boolean> => {
    try {
      const { access_token, refresh_token } = await api.auth.login(email, password, remember);
      setTokens(access_token, refresh_token, remember);

      const me = await api.users.me();
      const roles = me.role_assignments?.map((a) => a.role.name) ?? [];
      const permissions: PermissionDef[] = me.permissions.map((p) => ({
        action: p.action,
        subject: p.subject,
      }));

      const u: User = {
        id: me.id,
        name: `${me.first_name} ${me.last_name}`,
        email: me.email,
        role: roles[0] ?? "Usuario",
        avatar: me.first_name[0].toUpperCase(),
        permissions,
      };

      const storage = remember ? localStorage : sessionStorage;
      storage.setItem(USER_KEY, JSON.stringify(u));
      setUser(u);
      return true;
    } catch {
      return false;
    }
  };

  const logout = () => {
    clearTokens();
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(USER_KEY);
    setUser(null);
  };

  return { user, ability, login, logout };
}
