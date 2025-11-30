import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "super_admin" | "admin" | "staff" | null;

export function useUserRole() {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadUserRole();
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      setRole(data?.role as UserRole);
    } catch (error) {
      console.error("Error loading user role:", error);
      setRole(null);
    } finally {
      setLoading(false);
    }
  };

  const isSuperAdmin = role === "super_admin";
  const isAdmin = role === "admin" || role === "super_admin";
  const isStaff = role === "staff";

  return { role, loading, isSuperAdmin, isAdmin, isStaff };
}
