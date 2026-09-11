import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
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
import Portal from '@/pages/Portal';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

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
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route path="/portal" element={<Portal />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/guests" element={<Guests />} />
        <Route path="/guests/:id" element={<GuestDetail />} />
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
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App