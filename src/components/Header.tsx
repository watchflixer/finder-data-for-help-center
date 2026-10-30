import React from 'react';
import { Compass, Navigation, Sun, Moon, MapPin } from 'lucide-react';

interface HeaderProps {
  activeTab: 'search' | 'converter' | 'measure' | 'waypoints';
  setActiveTab: (tab: 'search' | 'converter' | 'measure' | 'waypoints') => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  isDarkMode: boolean;
  setIsDarkMode: (dark: boolean) => void;
  onLocateMe: () => void;
  isLocating: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isSidebarOpen,
  setIsSidebarOpen,
  isDarkMode,
  setIsDarkMode,
  onLocateMe,
  isLocating,
}) => {
  const navItems: { id: 'search' | 'converter' | 'measure' | 'waypoints'; label: string }[] = [
    { id: 'search', label: 'Jump & Search' },
    { id: 'converter', label: 'Coordinate Converter' },
    { id: 'measure', label: 'Distance & Area' },
    { id: 'waypoints', label: 'Saved Coordinates' },
  ];

  const handleNavClick = (id: 'search' | 'converter' | 'measure' | 'waypoints') => {
    setActiveTab(id);
    if (!isSidebarOpen) {
      setIsSidebarOpen(true);
    }
  };

  return (
    <header className="h-14 px-4 md:px-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-8 z-30 shrink-0 select-none">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3">
        <a href="/" className="flex items-center gap-2.5 text-slate-100 font-bold tracking-tight text-lg whitespace-nowrap shrink-0 hover:text-sky-400 transition-colors">
          <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shadow-sm">
            <Compass className="w-4 h-4 animate-spin-slow" />
          </div>
          <span>GeoPoint</span>
        </a>
        <span className="hidden lg:inline text-xs text-slate-500 font-mono tracking-wider">
          LAT·LNG NAVIGATOR
        </span>
      </div>

      {/* Zone 2: 4 clean single-line navigation buttons */}
      <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
        {navItems.map((item) => {
          const isActive = isSidebarOpen && activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                isActive
                  ? 'bg-slate-800 text-sky-400 border border-slate-700/80 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: 1 primary action + utility buttons */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={onLocateMe}
          disabled={isLocating}
          title="Detect Current GPS Location"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium rounded-lg shadow-sm transition-all whitespace-nowrap shrink-0 disabled:opacity-50"
        >
          <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{isLocating ? 'Locating...' : 'Locate Me'}</span>
        </button>

        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          title={isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg border border-slate-800 hover:bg-slate-800 transition-colors"
        >
          {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="md:hidden p-1.5 text-slate-400 hover:text-slate-200 rounded-lg border border-slate-800 hover:bg-slate-800 transition-colors"
          title="Toggle Drawer"
        >
          <MapPin className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
