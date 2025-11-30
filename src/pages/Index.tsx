import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ClipboardList, BarChart3, Settings, Plus, Search } from "lucide-react";
import logo from "@/assets/apec-logo.png";

const Index = () => {
  const navigate = useNavigate();
  const { role, isSuperAdmin, isAdmin } = useUserRole();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };
  const quickActions = [
    {
      icon: Plus,
      title: "New Quote",
      description: "Create a new inspection quote",
      color: "text-primary",
    },
    {
      icon: FileText,
      title: "New Report",
      description: "Start a new inspection report",
      color: "text-accent",
    },
    {
      icon: Search,
      title: "Search Records",
      description: "Find existing quotes and reports",
      color: "text-muted-foreground",
    },
  ];

  const stats = [
    {
      label: "Active Quotes",
      value: "12",
      icon: ClipboardList,
      trend: "+3 this week",
    },
    {
      label: "Pending Reports",
      value: "8",
      icon: FileText,
      trend: "2 due today",
    },
    {
      label: "Completed This Month",
      value: "45",
      icon: BarChart3,
      trend: "+12% vs last month",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50 backdrop-blur-sm bg-card/95">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logo} alt="APEC Inspection" className="h-12 w-auto" />
              <div className="border-l border-border pl-3">
                <h1 className="text-xl font-semibold text-foreground">APEC Central</h1>
                <p className="text-xs text-muted-foreground">Inspection Management</p>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <Button variant="ghost" className="text-foreground hover:text-primary">
                Dashboard
              </Button>
              <Button variant="ghost" className="text-muted-foreground hover:text-primary" onClick={() => navigate("/templates")}>
                Templates
              </Button>
              <Button variant="ghost" className="text-muted-foreground hover:text-primary" onClick={() => navigate("/reports")}>
                Reports
              </Button>
              {isAdmin && (
                <Button variant="ghost" className="text-muted-foreground hover:text-primary" onClick={() => navigate("/users")}>
                  Users
                </Button>
              )}
              {isSuperAdmin && (
                <Button variant="ghost" className="text-muted-foreground hover:text-primary" onClick={() => navigate("/super-admin")}>
                  Settings
                </Button>
              )}
              <Button variant="ghost" className="text-muted-foreground hover:text-primary" onClick={handleLogout}>
                Logout
              </Button>
            </nav>
            <Button variant="outline" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8 animate-fade-in">
          <h2 className="text-3xl font-bold text-foreground mb-2">Welcome back</h2>
          <p className="text-muted-foreground">Here's what's happening with your inspections today.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card 
              key={stat.label} 
              className="hover:shadow-medium transition-all duration-300 border-border animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground mb-1">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.trend}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-foreground mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickActions.map((action, index) => (
              <Card 
                key={action.title}
                className="hover:shadow-medium hover:border-primary/50 transition-all duration-300 cursor-pointer group border-border animate-slide-in"
                style={{ animationDelay: `${index * 100}ms` }}
                onClick={() => action.title === "New Report" && navigate("/reports")}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="p-2 rounded-lg bg-secondary group-hover:bg-primary/10 transition-colors">
                      <action.icon className={`h-6 w-6 ${action.color} group-hover:text-primary transition-colors`} />
                    </div>
                  </div>
                  <CardTitle className="text-foreground group-hover:text-primary transition-colors">
                    {action.title}
                  </CardTitle>
                  <CardDescription>{action.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-foreground">Recent Activity</h3>
            <Button variant="ghost" size="sm" className="text-primary">
              View All
            </Button>
          </div>
          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="space-y-4">
                {[
                  { title: "Commercial Building Inspection - Quote #2024-156", time: "2 hours ago", status: "pending" },
                  { title: "Residential Property Report - #2024-155", time: "5 hours ago", status: "completed" },
                  { title: "Industrial Site Assessment - Quote #2024-154", time: "1 day ago", status: "approved" },
                ].map((item, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-4 rounded-lg hover:bg-secondary transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{item.title}</p>
                        <p className="text-sm text-muted-foreground">{item.time}</p>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      item.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      item.status === 'approved' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}>
                      {item.status}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Index;
