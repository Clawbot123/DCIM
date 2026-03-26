import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppLayout } from './components/Layout/AppLayout';
import { useAuthStore } from './store/authStore';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import DataCentersPage from './pages/DataCentersPage';
import FloorPlanPage from './pages/FloorPlanPage';
import RacksPage from './pages/RacksPage';
import AssetsPage from './pages/AssetsPage';
import PowerPage from './pages/PowerPage';
import CoolingPage from './pages/CoolingPage';
import CablesPage from './pages/CablesPage';
import MonitoringPage from './pages/MonitoringPage';
import SensorsPage from './pages/SensorsPage';
import ReportsPage from './pages/ReportsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="datacenters" element={<DataCentersPage />} />
            <Route path="floor-plan" element={<FloorPlanPage />} />
            <Route path="racks" element={<RacksPage />} />
            <Route path="assets" element={<AssetsPage />} />
            <Route path="power" element={<PowerPage />} />
            <Route path="cooling" element={<CoolingPage />} />
            <Route path="cables" element={<CablesPage />} />
            <Route path="monitoring" element={<MonitoringPage />} />
            <Route path="sensors" element={<SensorsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="users" element={<div className="text-dark-400 p-8">Users management coming soon</div>} />
            <Route path="settings" element={<div className="text-dark-400 p-8">Settings coming soon</div>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
