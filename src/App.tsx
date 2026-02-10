import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Reports from "./pages/Reports";
import ReportEditor from "./pages/ReportEditor";
import ReportTemplates from "./pages/ReportTemplates";
import TemplateEditor from "./pages/TemplateEditor";
import Invoices from "./pages/Invoices";
import InvoiceEditor from "./pages/InvoiceEditor";
import InvoiceTemplateEditor from "./pages/InvoiceTemplateEditor";
import UserManagement from "./pages/UserManagement";
import SuperAdminSettings from "./pages/SuperAdminSettings";
import KnowledgeBaseManager from "./pages/KnowledgeBaseManager";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<ProtectedRoute><Layout><Index /></Layout></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Layout><Reports /></Layout></ProtectedRoute>} />
            <Route path="/reports/:id" element={<ProtectedRoute><Layout><ReportEditor /></Layout></ProtectedRoute>} />
            <Route path="/templates" element={<ProtectedRoute><Layout><ReportTemplates /></Layout></ProtectedRoute>} />
            <Route path="/templates/:id" element={<ProtectedRoute><Layout><TemplateEditor /></Layout></ProtectedRoute>} />
            <Route path="/invoices" element={<ProtectedRoute><Layout><Invoices /></Layout></ProtectedRoute>} />
            <Route path="/invoices/:id" element={<ProtectedRoute><Layout><InvoiceEditor /></Layout></ProtectedRoute>} />
            <Route path="/invoices/template" element={<ProtectedRoute><Layout><InvoiceTemplateEditor /></Layout></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute><Layout><UserManagement /></Layout></ProtectedRoute>} />
            <Route path="/knowledge-base" element={<ProtectedRoute><Layout><KnowledgeBaseManager /></Layout></ProtectedRoute>} />
            <Route path="/super-admin" element={<ProtectedRoute><Layout><SuperAdminSettings /></Layout></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
