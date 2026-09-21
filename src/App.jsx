import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import Layout from '@/components/Layout';

import Dashboard from '@/pages/Dashboard';
import Guests from '@/pages/Guests';
import GuestDetail from '@/pages/GuestDetail';
import Bookings from '@/pages/Bookings';
import BookingDetail from '@/pages/BookingDetail';
import Calendar from '@/pages/Calendar';
import Invoices from '@/pages/Invoices';
import Payments from '@/pages/Payments';
import Messages from '@/pages/Messages';
import ReservationRequests from '@/pages/ReservationRequests';
import Reviews from '@/pages/Reviews';
import FAQs from '@/pages/FAQs';
import Audit from '@/pages/Audit';
import Export from '@/pages/Export';
import Members from '@/pages/Members';
import MemberProfile from '@/pages/MemberProfile';
import Portal from '@/pages/Portal';

// Public authentication screens remain separate from protected application routes.
import Login from '@/pages/Login';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import AppErrorBoundary from '@/components/AppErrorBoundary';

const normalizeAppRole = (value) => {
  if (!value || typeof value !== 'string') return null;
  const normalized = value.toLowerCase();
  return ['admin', 'staff', 'guest'].includes(normalized) ? normalized : null;
};

const AuthenticatedApp = () => {
  const { user, appRole, isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'guest_not_invited') {
      return <UserNotRegisteredError message={authError.message} />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  const resolvedRole = normalizeAppRole(appRole || user?.appRole || user?.app_metadata?.role || user?.user_metadata?.role);

  if (user && !resolvedRole) {
    return <UserNotRegisteredError message="Access is invitation-only. Please contact staff for access." />;
  }

  return (
    <Routes>
      <Route path="/portal" element={<Portal />} />
      <Route element={<Layout />}>
        <Route
          path="/"
          element={['admin', 'staff'].includes(resolvedRole) ? <Dashboard /> : <Navigate to="/portal" replace />}
        />
        <Route path="/guests" element={<Guests />} />
        <Route path="/guests/:id" element={<GuestDetail />} />
        <Route path="/members" element={<Members />} />
        <Route path="/members/:id" element={<MemberProfile />} />
        <Route path="/bookings" element={<Bookings />} />
        <Route path="/bookings/:id" element={<BookingDetail />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/reservations" element={<ReservationRequests />} />
        <Route path="/reviews" element={<Reviews />} />
        <Route path="/faqs" element={<FAQs />} />
        <Route path="/audit" element={<Audit />} />
        <Route path="/export" element={<Export />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <ScrollToTop />
            {/* Keep auth routes public; all other routes use the authenticated app. */}
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="*" element={<AuthenticatedApp />} />
            </Routes>
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </AppErrorBoundary>
  )
}

export default App