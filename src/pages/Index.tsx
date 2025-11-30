import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ClipboardList, BarChart3, Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();
  const { role, isSuperAdmin, isAdmin } = useUserRole();
  const [stats, setStats] = useState({
    draftReports: 0,
    pendingReports: 0,
    completedReports: 0,
    totalInvoices: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    loadStats();
    loadRecentActivity();

    // Subscribe to real-time updates
    const reportsChannel = supabase
      .channel('reports-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reports' },
        () => {
          loadStats();
          loadRecentActivity();
        }
      )
      .subscribe();

    const invoicesChannel = supabase
      .channel('invoices-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invoices' },
        () => {
          loadStats();
          loadRecentActivity();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(reportsChannel);
      supabase.removeChannel(invoicesChannel);
    };
  }, []);

  const loadStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get report counts
      const { data: reports } = await supabase
        .from('reports')
        .select('status', { count: 'exact' });

      const draftReports = reports?.filter(r => r.status === 'draft').length || 0;
      const pendingReports = reports?.filter(r => r.status === 'pending').length || 0;
      const completedReports = reports?.filter(r => r.status === 'completed').length || 0;

      // Get invoice count
      const { count: invoiceCount } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true });

      setStats({
        draftReports,
        pendingReports,
        completedReports: completedReports,
        totalInvoices: invoiceCount || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadRecentActivity = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get recent reports
      const { data: recentReports } = await supabase
        .from('reports')
        .select('id, title, status, created_at, job_number')
        .order('created_at', { ascending: false })
        .limit(3);

      // Get recent invoices
      const { data: recentInvoices } = await supabase
        .from('invoices')
        .select('id, invoice_number, status, created_at, customer_company')
        .order('created_at', { ascending: false })
        .limit(3);

      // Combine and sort by date
      const combined = [
        ...(recentReports?.map(r => ({
          id: r.id,
          type: 'report',
          title: r.title,
          subtitle: r.job_number ? `Job #: ${r.job_number}` : 'Report',
          time: formatTimeAgo(r.created_at),
          status: r.status,
        })) || []),
        ...(recentInvoices?.map(i => ({
          id: i.id,
          type: 'invoice',
          title: `Invoice ${i.invoice_number || 'Draft'}`,
          subtitle: i.customer_company || 'Invoice',
          time: formatTimeAgo(i.created_at),
          status: i.status,
        })) || []),
      ]
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        .slice(0, 5);

      setRecentActivity(combined);
    } catch (error) {
      console.error('Error loading recent activity:', error);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  };
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
          <p className="text-muted-foreground">Here&apos;s what&apos;s happening with your inspections today.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="hover:shadow-medium transition-all duration-300 border-border animate-fade-in">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Draft Reports
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground mb-1">{stats.draftReports}</div>
              <p className="text-xs text-muted-foreground">In progress</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-medium transition-all duration-300 border-border animate-fade-in" style={{ animationDelay: '100ms' }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Reports
              </CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground mb-1">{stats.pendingReports}</div>
              <p className="text-xs text-muted-foreground">Awaiting approval</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-medium transition-all duration-300 border-border animate-fade-in" style={{ animationDelay: '200ms' }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Completed Reports
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground mb-1">{stats.completedReports}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-medium transition-all duration-300 border-border animate-fade-in" style={{ animationDelay: '300ms' }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Invoices
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground mb-1">{stats.totalInvoices}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>
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

        {/* Recent Activity */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-foreground">Recent Activity</h3>
            <Button variant="ghost" size="sm" className="text-primary" onClick={() => navigate("/reports")}>
              View All
            </Button>
          </div>
          <Card className="border-border">
            <CardContent className="pt-6">
              {recentActivity.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No recent activity</p>
                  <p className="text-sm">Create your first report or invoice to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentActivity.map((item, index) => (
                    <div 
                      key={index} 
                      className="flex items-center justify-between p-4 rounded-lg hover:bg-secondary transition-colors cursor-pointer"
                      onClick={() => navigate(item.type === 'report' ? `/reports/${item.id}` : `/invoices/${item.id}`)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{item.title}</p>
                          <p className="text-sm text-muted-foreground">{item.subtitle} • {item.time}</p>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        item.status === 'completed' || item.status === 'submitted' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        item.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                      }`}>
                        {item.status}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Index;
