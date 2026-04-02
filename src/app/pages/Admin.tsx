import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Lock, Eye, EyeOff, LogOut, Shield, Database, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  loginAdmin,
  deactivateAdmin,
  isAdminActive,
  getVideos,
  getSets,
  getClasses,
  getAdminPin,
  setAdminPin,
} from '../utils/libraryStorage';

function LoginForm({ onLogin }: { onLogin: () => void }) {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');

  const isFirstLogin = !getAdminPin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;
    const ok = loginAdmin(pin.trim());
    if (ok) {
      toast.success(isFirstLogin ? 'PIN set. Welcome, Admin!' : 'Welcome back, Admin!');
      onLogin();
    } else {
      setError('Incorrect PIN');
      setPin('');
      setTimeout(() => setError(''), 3000);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-card border border-border rounded-2xl p-8 w-full max-w-sm shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-['Bebas_Neue'] text-3xl tracking-wider">Admin Access</h1>
          <p className="text-xs text-muted-foreground mt-1 text-center">
            {isFirstLogin
              ? 'Set your PIN to enable admin features.'
              : 'Enter your PIN to continue.'}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">
              {isFirstLogin ? 'Create PIN' : 'PIN'}
            </label>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder={isFirstLogin ? 'Choose a PIN...' : 'Enter PIN...'}
                autoFocus
                className="w-full px-4 py-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {error && <p className="text-xs text-destructive mt-1.5">{error}</p>}
          </div>
          <button
            type="submit"
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/30"
          >
            {isFirstLogin ? 'Set PIN & Enter' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const navigate = useNavigate();
  const [showChangePinForm, setShowChangePinForm] = useState(false);
  const [newPin, setNewPin] = useState('');

  const videos = getVideos();
  const sets = getSets();
  const classes = getClasses();

  const handleLogout = () => {
    deactivateAdmin();
    toast.info('Logged out of admin mode');
    onLogout();
  };

  const handleChangePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPin.trim()) return;
    setAdminPin(newPin.trim());
    setNewPin('');
    setShowChangePinForm(false);
    toast.success('PIN updated');
  };

  const handleClearLibrary = () => {
    if (!confirm('Delete ALL videos from the library? This cannot be undone.')) return;
    localStorage.removeItem('bjj-library-videos');
    toast.success('Library cleared');
  };

  const handleClearSets = () => {
    if (!confirm('Delete ALL collections? This cannot be undone.')) return;
    localStorage.removeItem('bjj-sets');
    toast.success('Collections cleared');
  };

  const handleClearClasses = () => {
    if (!confirm('Delete ALL class sessions? This cannot be undone.')) return;
    localStorage.removeItem('bjj-classes');
    toast.success('Class sessions cleared');
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-['Bebas_Neue'] text-3xl tracking-wider leading-none">Admin Panel</h1>
            <p className="text-xs text-primary font-bold uppercase tracking-wider">Active</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted transition-all text-sm font-semibold"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Library Videos', value: videos.length, action: () => navigate('/library') },
          { label: 'Collections', value: sets.length, action: () => navigate('/sets') },
          { label: 'Class Sessions', value: classes.length, action: () => navigate('/gameplan') },
        ].map(({ label, value, action }) => (
          <button
            key={label}
            onClick={action}
            className="bg-card border border-border rounded-xl p-4 text-center hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all"
          >
            <div className="font-['Bebas_Neue'] text-4xl text-primary leading-none mb-1">{value}</div>
            <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">{label}</div>
          </button>
        ))}
      </div>

      {/* Change PIN */}
      <div className="bg-card border border-border rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm">Security</h2>
          <button
            onClick={() => setShowChangePinForm(!showChangePinForm)}
            className="text-xs font-bold text-primary hover:text-primary/80 transition-colors"
          >
            {showChangePinForm ? 'Cancel' : 'Change PIN'}
          </button>
        </div>
        {showChangePinForm ? (
          <form onSubmit={handleChangePin} className="flex gap-3">
            <input
              type="password"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              placeholder="New PIN..."
              autoFocus
              className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all"
            >
              Save
            </button>
          </form>
        ) : (
          <p className="text-xs text-muted-foreground">
            Admin mode allows you to add videos, create collections, and plan class sessions.
          </p>
        )}
      </div>

      {/* Danger zone */}
      <div className="bg-card border border-destructive/20 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Trash2 className="w-4 h-4 text-destructive" />
          <h2 className="font-semibold text-sm text-destructive">Danger Zone</h2>
        </div>
        <div className="flex flex-col gap-2">
          {[
            { label: 'Clear Library Videos', action: handleClearLibrary },
            { label: 'Clear Collections', action: handleClearSets },
            { label: 'Clear Class Sessions', action: handleClearClasses },
          ].map(({ label, action }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <span className="text-sm text-muted-foreground">{label}</span>
              <button
                onClick={action}
                className="text-xs font-bold text-destructive/70 hover:text-destructive border border-destructive/20 hover:border-destructive/50 px-3 py-1.5 rounded-lg transition-all"
              >
                Clear
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Admin() {
  const [active, setActive] = useState(isAdminActive);

  if (!active) {
    return <LoginForm onLogin={() => setActive(true)} />;
  }

  return <AdminDashboard onLogout={() => setActive(false)} />;
}
