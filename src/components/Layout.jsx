import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Trophy, Calendar, Settings, BarChart3, TrendingUp, Calculator } from 'lucide-react';

const Layout = ({ children }) => {
  const location = useLocation();
  
  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Дашборд' },
    { path: '/table/apl', icon: Trophy, label: 'Турнирная таблица' },
    { path: '/matches', icon: Calendar, label: 'Матчи' },
    { path: '/poisson', icon: Calculator, label: 'Пуассон' },
    { path: '/admin', icon: Settings, label: 'Админка' },
  ];

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            ⚽ StatTracker
          </h1>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || 
              (item.path.includes('/table') && location.pathname.includes('/table'));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                  isActive 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        
        {/* Внешние ссылки */}
        <div className="p-4 border-t border-gray-700 space-y-2">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Внешние инструменты</p>
          <a
            href="https://www.soccerstats.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-3 px-4 py-2 rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white transition"
          >
            <BarChart3 size={20} />
            <span>Трекер ставок</span>
          </a>
          <a
            href="https://www.sportcalculators.com/poisson-calculator"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-3 px-4 py-2 rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white transition"
          >
            <TrendingUp size={20} />
            <span>Расчет Пуассона</span>
          </a>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-gray-900">
        <div className="p-8">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Layout;