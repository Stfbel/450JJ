import { NavLink, Outlet, useNavigate } from 'react-router';
import { Sun, Moon, Dumbbell, Video, BookOpen, CalendarDays, Settings } from 'lucide-react';
import { Toaster } from 'sonner';
import { isAdminActive } from '../utils/libraryStorage';

interface LayoutProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

const NAV = [
  { to: '/', label: 'Techniques', icon: Dumbbell },
  { to: '/library', label: 'Library', icon: Video },
  { to: '/sets', label: 'Sets', icon: BookOpen },
  { to: '/gameplan', label: 'Game Plan', icon: CalendarDays },
];

export function Layout({ theme, onToggleTheme }: LayoutProps) {
  const navigate = useNavigate();
  const admin = isAdminActive();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Toaster
        theme={theme}
        position="top-right"
        toastOptions={{
          classNames: {
            toast: 'rounded-xl border-border shadow-lg',
            title: 'font-semibold',
            description: 'text-sm text-muted-foreground',
          },
        }}
      />

      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-md shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          {/* Brand */}
          <button onClick={() => navigate('/')} className="flex items-center gap-2 shrink-0">
            <div>
              <div className="font-['Bebas_Neue'] text-xl sm:text-2xl tracking-widest leading-none text-foreground">
                450 JIU-JITSU
              </div>
              <div className="text-[9px] text-primary uppercase tracking-[0.2em] font-bold mt-0.5">
                GAMES LAB
              </div>
            </div>
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
                    isActive
                      ? 'bg-primary/10 border-primary/30 text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`
                }
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `p-2 rounded-lg border transition-all ${
                  isActive
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : admin
                    ? 'border-primary/30 text-primary hover:bg-primary/10'
                    : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                }`
              }
            >
              <Settings className="w-4 h-4" />
            </NavLink>
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-background/95 backdrop-blur-md border-t border-border">
        <div className="grid grid-cols-5 h-16">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider transition-all ${
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          ))}
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider transition-all ${
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`
            }
          >
            <Settings className="w-5 h-5" />
            Admin
          </NavLink>
        </div>
      </nav>
    </div>
  );
}
