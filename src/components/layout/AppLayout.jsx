import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import TopBar from './TopBar';

export default function AppLayout() {
  const navigate = useNavigate();

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50/80">
      {/* Sidebar — visible on md+ only */}
      <div className="hidden md:flex md:flex-shrink-0">
        <Sidebar />
      </div>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* TopBar — shown on all screen sizes (different layouts per breakpoint) */}
        <TopBar />

        {/* Scrollable page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8 pb-24 md:pb-8">
            <Outlet />
          </div>
        </main>

        {/* Footer - desktop only */}
        <footer className="hidden md:flex items-center justify-between border-t border-gray-200/60 bg-white px-8 py-3">
          <div className="flex items-center gap-4 text-[11px] text-gray-400">
            <span className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              Secure End-to-End
            </span>
          </div>
          <p className="text-[11px] text-gray-400">
            Expense Tracker v2.0
          </p>
        </footer>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav />

      {/* FAB — Add Transaction (mobile only, hidden on desktop since we have + Add in top bar) */}
      <button
        onClick={() => navigate('/transactions/new')}
        aria-label="Add transaction"
        className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-white shadow-lg shadow-brand/30 transition-all hover:bg-brand-hover hover:shadow-xl hover:shadow-brand/40 active:scale-95 md:hidden"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>
  );
}
