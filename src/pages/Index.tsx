import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ClipboardList, BarChart3, Plus, Search } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const { role, isSuperAdmin, isAdmin } = useUserRole();
  const quickActions = [
    {
      icon: FileText,
      title: "New Report",
      description: "Start a new inspection report",
      color: "text-primary",
      action: () => navigate("/reports"),
    },
    {
      icon: FileText,
      title: "View Reports",
      description: "Browse all inspection reports",
      color: "text-accent",
      action: () => navigate("/reports"),
    },
    {
      icon: FileText,
      title: "New Invoice",
      description: "Create a new invoice",
      color: "text-primary",
      action: () => navigate("/invoices"),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8 animate-fade-in">
          <h2 className="text-3xl font-bold text-foreground mb-2">Welcome back</h2>
          <p className="text-muted-foreground">Manage your inspections, reports, and invoices</p>
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-xl font-semibold text-foreground mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickActions.map((action, index) => (
              <Card 
                key={action.title}
                className="hover:shadow-medium hover:border-primary/50 transition-all duration-300 cursor-pointer group border-border animate-slide-in"
                style={{ animationDelay: `${index * 100}ms` }}
                onClick={action.action}
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
      </main>
    </div>
  );
};

export default Index;
