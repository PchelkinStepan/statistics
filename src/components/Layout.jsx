import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Trophy, Calendar, Settings, Calculator, Menu, X, ChevronRight, Wifi, WifiOff, Wallet, Brain } from 'lucide-react';

const Layout = ({ children }) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState('synced');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [touchStart, setTouchStart] = useState(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    const handleOnline = () => setSyncStatus('synced');
    const handleOffline = () => setSyncStatus('offline');
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e) => {
    if (!touchStart) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStart;
    
    if (diff > 50 && !sidebarOpen) {
      setSidebarOpen(true);
      setTouchStart(null);
    } else if (diff < -50 && sidebarOpen) {
      setSidebarOpen(false);
      setTouchStart(null);
    }
  };

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Дашборд' },
    { path: '/table/apl', icon: Trophy, label: 'Таблица' },
    { path: '/matches', icon: Calendar, label: 'Матчи' },
    { path: '/poisson', icon: Calculator, label: 'Пуассон' },
    { path: '/neuro', icon: Brain, label: 'Neuro AI' },
    { path: '/bets', icon: Wallet, label: 'Ставки' },
    { path: '/admin', icon: Settings, label: 'Админка' },
  ];

  const closeSidebar = () => setSidebarOpen(false);

  // Компонент логотипа с мячиком
  const Logo = () => (
    <div className="flex items-center gap-2">
      <div className="text-2xl">⚽</div>
      <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
        StatTracker
      </h1>
    </div>
  );

  return (
    <div 
      className="flex h-screen bg-gray-900"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      {/* Мобильный хедер */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 z-20 bg-gray-800/95 backdrop-blur border-b border-gray-700 px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 text-white"
            >
              <Menu size={24} />
            </button>
            <Logo />
            <div className="w-10" />
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className={`
        fixed md:relative z-40 h-full bg-gray-800 border-r border-gray-700 
        transition-transform duration-300 ease-in-out
        ${isMobile ? (sidebarOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'}
        ${isMobile ? 'w-72' : 'w-64'}
      `}>
        {isMobile && (
          <button
            onClick={closeSidebar}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white bg-gray-700/50 rounded-lg"
          >
            <X size={24} />
          </button>
        )}

        <div className="p-4 md:p-6 pt-16 md:pt-6">
          <Logo />
        </div>
        
        <nav className="flex-1 px-2 md:px-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || 
              (item.path.includes('/table') && location.pathname.includes('/table'));
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={closeSidebar}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition ${
                  isActive 
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg' 
                    : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
                }`}
              >
                <Icon size={22} />
                <span className="text-base">{item.label}</span>
                {isActive && <ChevronRight size={16} className="ml-auto" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Статус</span>
            <div className="flex items-center space-x-2">
              {syncStatus === 'synced' ? (
                <>
                  <Wifi size={16} className="text-green-400" />
                  <span className="text-xs text-green-400">Онлайн</span>
                </>
              ) : (
                <>
                  <WifiOff size={16} className="text-yellow-400" />
                  <span className="text-xs text-yellow-400">Офлайн</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
          onClick={closeSidebar}
        />
      )}
      
      <div className="flex-1 overflow-auto bg-gray-900">
        <div className={`p-4 md:p-8 ${isMobile ? 'pt-20' : ''}`}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Layout;