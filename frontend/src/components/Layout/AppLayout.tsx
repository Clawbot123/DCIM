import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { useUIStore } from '../../store/uiStore';

export function AppLayout() {
  const { sidebarCollapsed, theme } = useUIStore();

  return (
    <div
      className={theme}
      style={{ minHeight: '100vh', backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}
    >
      <Sidebar />
      <Navbar />
      <main
        className="pt-16 min-h-screen transition-all duration-300"
        style={{ marginLeft: sidebarCollapsed ? 64 : 240 }}
      >
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
