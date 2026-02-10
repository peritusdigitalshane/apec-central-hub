import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "super_admin" | "admin" | "staff" | null;

interface AuthContextType {
  role: UserRole;
  loading: boolean;
  authenticated: boolean;
  hasRole: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isStaff: boolean;
}

const AuthContext = createContext<AuthContextType>({
  role: null,
  loading: true,
  authenticated: false,
  hasRole: false,
  isSuperAdmin: false,
  isAdmin: false,
  isStaff: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [hasRole, setHasRole] = useState(false);

  const loadUserRole = async (userId: string | undefined) => {
    if (!userId) {
      setRole(null);
      setAuthenticated(false);
      setHasRole(false);
      setLoading(false);
      return;
    }

    setAuthenticated(true);

    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .single();

      if (error) throw error;
      const userRole = data?.role as UserRole;
      setRole(userRole);
      setHasRole(!!userRole);
    } catch {
      setRole(null);
      setHasRole(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      await loadUserRole(session?.user?.id);
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setLoading(true);
        await loadUserRole(session?.user?.id);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const isSuperAdmin = role === "super_admin";
  const isAdmin = role === "admin" || role === "super_admin";
  const isStaff = role === "staff";

  return (
    <AuthContext.Provider
      value={{ role, loading, authenticated, hasRole, isSuperAdmin, isAdmin, isStaff }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
