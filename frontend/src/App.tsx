import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ProtectedAdminRoute } from "@/components/ProtectedAdminRoute";
import Sidebar from "@/components/Sidebar";
import { SubscriptionExpiredBanner } from "@/components/SubscriptionExpiredBanner";
import { OAuthCallbackHandler } from "@/components/OAuthCallbackHandler";

// Lazy load pages for code splitting
const Landing = lazy(() => import("./pages/Landing"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Instances = lazy(() => import("./pages/Instances"));
const Create = lazy(() => import("./pages/Create"));
const Campaigns = lazy(() => import("./pages/Campaigns"));
const Settings = lazy(() => import("./pages/Settings"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Support = lazy(() => import("./pages/Support"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Plans = lazy(() => import("./pages/Plans"));
const Checkout = lazy(() => import("./pages/Checkout"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Lista = lazy(() => import("./pages/Lista"));
const Agenda = lazy(() => import("./pages/Agenda"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Admin = lazy(() => import("./pages/Admin"));
const ExtractMembers = lazy(() => import("./pages/ExtractMembers"));
const ExtractContacts = lazy(() => import("./pages/ExtractContacts"));
// Funcionalidades removidas: Billing, Bookings, Appointments, PublicBooking, ChatbotFlows

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos - dados ficam "frescos" por 5min (otimizado de 2min para reduzir consumo)
      gcTime: 15 * 60 * 1000, // 15 minutos - cache mantido por 15min (otimizado de 10min)
      refetchOnWindowFocus: false, // Não refetch ao focar janela (reduz requisições)
      refetchOnReconnect: true, // Refetch apenas ao reconectar (importante para dados atualizados)
      refetchOnMount: true, // Refetch ao montar (garante dados atualizados)
      retry: 1, // Apenas 1 tentativa em caso de erro
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      networkMode: 'online', // Só fazer queries quando online
    },
    mutations: {
      retry: 0, // Não retry em mutações
      networkMode: 'online',
    },
  },
});

const LoadingFallback = () => (
  <div className="min-h-screen tech-grid-bg flex flex-col items-center justify-center gap-4">
    <div className="w-12 h-12 border-4 border-accent-purple border-t-transparent rounded-full animate-spin" />
    <p className="text-sm text-muted-foreground animate-pulse">Carregando...</p>
  </div>
);

const AnimatedRoutes = () => {
  const location = useLocation();
  const isAuthPage = ['/login', '/register', '/landing', '/forgot-password', '/reset-password', '/onboarding'].includes(location.pathname);
  const isPublicBookingPage = false; // Funcionalidade de agendamento removida

  return (
    <>
      {/* Banner de expiração - apenas em páginas autenticadas */}
      {!isAuthPage && !isPublicBookingPage && <SubscriptionExpiredBanner />}
      
      {/* Sidebar - apenas em páginas autenticadas e desktop, não em páginas públicas */}
      {!isAuthPage && !isPublicBookingPage && <Sidebar />}
      
      {/* Main Content - com margem para sidebar no desktop, exceto páginas públicas */}
      <div className={`${!isAuthPage && !isPublicBookingPage ? "lg:ml-64" : ""} ${!isAuthPage && !isPublicBookingPage ? "pt-16" : ""}`}>
        <AnimatePresence mode="wait" initial={false}>
          <Suspense fallback={<LoadingFallback />}>
            <Routes location={location} key={location.pathname}>
          <Route path="/landing" element={<PageTransition><Landing /></PageTransition>} />
          <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
          <Route path="/register" element={<PageTransition><Register /></PageTransition>} />
          <Route path="/forgot-password" element={<PageTransition><ForgotPassword /></PageTransition>} />
          <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />
          <Route path="/onboarding" element={<PageTransition><Onboarding /></PageTransition>} />
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <PageTransition><Dashboard /></PageTransition>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/instances" 
            element={
              <ProtectedRoute>
                <PageTransition><Instances /></PageTransition>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/create" 
            element={
              <ProtectedRoute>
                <PageTransition><Create /></PageTransition>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/campaigns" 
            element={
              <ProtectedRoute>
                <PageTransition><Campaigns /></PageTransition>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/analytics" 
            element={
              <ProtectedRoute>
                <PageTransition><Analytics /></PageTransition>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/lista" 
            element={
              <ProtectedRoute>
                <PageTransition><Lista /></PageTransition>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/agenda" 
            element={
              <ProtectedRoute>
                <PageTransition><Agenda /></PageTransition>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/extract-members" 
            element={
              <ProtectedRoute>
                <PageTransition><ExtractMembers /></PageTransition>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/extract-contacts" 
            element={
              <ProtectedRoute>
                <PageTransition><ExtractContacts /></PageTransition>
              </ProtectedRoute>
            } 
          />
          {/* Rotas removidas: /billing, /bookings, /appointments, /chatbot-flows, /agendamento/:slug */}
          <Route 
            path="/settings" 
            element={
              <ProtectedRoute>
                <PageTransition><Settings /></PageTransition>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/support" 
            element={
              <ProtectedRoute>
                <PageTransition><Support /></PageTransition>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/plans" 
            element={
              <ProtectedRoute>
                <PageTransition><Plans /></PageTransition>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/checkout" 
            element={
              <ProtectedRoute>
                <PageTransition><Checkout /></PageTransition>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute>
                <ProtectedAdminRoute>
                  <PageTransition><Admin /></PageTransition>
                </ProtectedAdminRoute>
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
            </Routes>
          </Suspense>
        </AnimatePresence>
      </div>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <OAuthCallbackHandler />
        <AnimatedRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
