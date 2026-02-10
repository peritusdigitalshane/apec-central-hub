import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Shield, User, Crown, UserPlus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface UserWithRole {
  id: string;
  email: string;
  full_name: string;
  role: string | null;
  created_at: string;
}

export default function UserManagement() {
  const navigate = useNavigate();
  const { isAdmin, isSuperAdmin, loading: roleLoading } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserFullName, setNewUserFullName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      toast.error("Access denied. Admin privileges required.");
      navigate("/");
      return;
    }
    
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin, roleLoading, navigate]);

  const loadUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*");

      if (rolesError) throw rolesError;

      const usersWithRoles = profiles.map(profile => {
        const userRole = roles.find(r => r.user_id === profile.user_id);
        return {
          id: profile.user_id,
          email: profile.email,
          full_name: profile.full_name || "No name",
          role: userRole?.role || null, // null means inactive
          created_at: profile.created_at,
        };
      });

      setUsers(usersWithRoles);
    } catch (error: any) {
      toast.error("Failed to load users");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: "super_admin" | "admin" | "staff" | null) => {
    try {
      if (newRole === null) {
        // Remove role to make user inactive
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId);
        
        if (error) throw error;
      } else {
        // Upsert role
        const { error } = await supabase
          .from("user_roles")
          .upsert({ user_id: userId, role: newRole }, { onConflict: "user_id" });

        if (error) throw error;
      }
      
      toast.success("User role updated");
      loadUsers();
    } catch (error: any) {
      toast.error("Failed to update role: " + error.message);
    }
  };

  const getRoleBadge = (role: string | null) => {
    switch (role) {
      case "super_admin":
        return <Badge className="gap-1"><Crown className="h-3 w-3" />Super Admin</Badge>;
      case "admin":
        return <Badge variant="secondary" className="gap-1"><Shield className="h-3 w-3" />Admin</Badge>;
      case "staff":
        return <Badge variant="outline" className="gap-1"><User className="h-3 w-3" />Staff</Badge>;
      default:
        return <Badge variant="destructive" className="gap-1">Inactive</Badge>;
    }
  };

  const canEditRole = (userRole: string | null) => {
    if (isSuperAdmin) return true;
    if (isAdmin && (userRole === "staff" || userRole === null)) return true;
    return false;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Not authenticated");
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newUserEmail,
          password: newUserPassword,
          fullName: newUserFullName,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create user');
      }

      toast.success(result.message || "User created successfully");
      setCreateDialogOpen(false);
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserFullName("");
      loadUsers();
    } catch (error: any) {
      toast.error(error.message || "Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">User Management</h1>
          </div>
          <Button variant="ghost" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </header>

      <main className="container py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>All Users</CardTitle>
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New User</DialogTitle>
                    <DialogDescription>
                      Create a new user account. They will be inactive until you assign them a role.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateUser} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        value={newUserFullName}
                        onChange={(e) => setNewUserFullName(e.target.value)}
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        placeholder="user@example.com"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                      />
                    </div>
                    <Button type="submit" disabled={creating} className="w-full">
                      {creating ? "Creating..." : "Create User"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium">{user.full_name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Joined {new Date(user.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {getRoleBadge(user.role)}
                    {canEditRole(user.role) ? (
                      <Select
                        value={user.role || "inactive"}
                        onValueChange={(value) => updateUserRole(user.id, value === "inactive" ? null : value as "super_admin" | "admin" | "staff")}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          {isSuperAdmin && (
                            <SelectItem value="super_admin">Super Admin</SelectItem>
                          )}
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="w-40 text-sm text-muted-foreground text-center">
                        No permission
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
