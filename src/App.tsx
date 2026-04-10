import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { AdminLayout } from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminServers from "./pages/admin/AdminServers";
import AdminMetrics from "./pages/admin/AdminMetrics";
import AdminLogs from "./pages/admin/AdminLogs";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />

          {/* Admin Panel */}
          <Route path="/admin" element={<div className="dark"><AdminLayout><AdminDashboard /></AdminLayout></div>} />
          <Route path="/admin/users" element={<div className="dark"><AdminLayout><AdminUsers /></AdminLayout></div>} />
          <Route path="/admin/servers" element={<div className="dark"><AdminLayout><AdminServers /></AdminLayout></div>} />
          <Route path="/admin/metrics" element={<div className="dark"><AdminLayout><AdminMetrics /></AdminLayout></div>} />
          <Route path="/admin/logs" element={<div className="dark"><AdminLayout><AdminLogs /></AdminLayout></div>} />

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
