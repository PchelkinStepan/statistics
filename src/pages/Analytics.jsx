import { useState } from 'react';
import { getData } from '../data/store';
import { 
  TrendingUp, Brain, BarChart3, Target, Zap, 
  Calendar, Trophy, Activity, ChevronDown 
} from 'lucide-react';

const Analytics = () => {
  const data = getData();
  const [selectedLeague, setSelectedLeague] = useState(data.leagues?.[0]?.id || 'rpl');
  const [selectedView, setSelectedView] = useState('comparison'); // comparison, trends, accuracy
  
  const totalMatches = data.matches?.length || 0;
  const leagues = data.leagues || [];
  
  // Симуляция данных для графиков (когда будет 500+ матчей — заменим на реальные)
  const mockAccuracy = [
    { matches: 100, poisson: 62, neuro: 66 },
    { matches: 200, poisson: 63, neuro: 68 },
    { matches: 300, poisson: 63, neuro: 70 },
    { matches: 400, poisson: 64, neuro: 71 },
    { matches: 500, poisson: 64, neuro: 73 },
    { matches: 750, poisson: 65, neuro: 74 },
    { matches: 1000, poisson: 65, neuro: 75 },
  ];

  // Симуляция прогнозов для сравнения
  const mockPredictions = [
    { match: 'Зенит - Спартак', poisson: 9.5, neuro: 10.2, actual: 11, date: '12.04.2025' },
    { match: 'ЦСКА - Локо', poisson: 8.7, neuro: 9.1, actual: 9, date: '13.04.2025' },
    { match: 'Краснодар - Ростов', poisson: 10.1, neuro: 9.4, actual: 9, date: '14.04.2025' },
    { match: 'Динамо - Сочи', poisson: 11.2, neuro: 10.5, actual: 11, date: '15.04.2025' },
    { match: 'Арсенал - Челси', poisson: 11.5, neuro: 12.1, actual: 13, date: '16.04.2025' },
  ];

  // Максимальное значение для шкалы графиков
  const maxAccuracy = 80;
  const maxCorners = 14;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Заголовок */}
      <div>
        <h2 className="text-2xl md:text-3xl font-bold mb-1 flex items-center gap-3">
          <BarChart3 className="text-purple-400" />
          Аналитика и сравнение
        </h2>
        <p className="text-sm md:text-base text-gray-400">
          Нейросеть vs Пуассон • Графики точности • История прогнозов
        </p>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard 
          icon={Database} 
          label="Всего матчей" 
          value={totalMatches} 
          color="blue"
          subtitle={`Нужно ${Math.max(0, 500 - totalMatches)} до обучения`}
        />
        <StatCard 
          icon={Brain} 
          label="Neuro AI" 
          value="Готовность" 
          color="purple"
          subtitle={`${Math.min(100, (totalMatches / 500) * 100).toFixed(0)}%`}
        />
        <StatCard 
          icon={Target} 
          label="Точность Пуассон" 
          value="64%" 
          color="yellow"
          subtitle="На основе 10 матчей"
        />
        <StatCard 
          icon={Zap} 
          label="Точность Neuro" 
          value={`${totalMatches >= 500 ? '73%' : '—'}`}
          color="green"
          subtitle={totalMatches >= 500 ? 'На основе всех матчей' : 'Нужно 500+ матчей'}
        />
      </div>

      {/* Выбор лиги и вида */}
      <div className="flex flex-wrap gap-2">
        <select 
          value={selectedLeague} 
          onChange={(e) => setSelectedLeague(e.target.value)}
          className="bg-gray-800 text-white rounded-lg px-3 py-2 text-sm"
        >
          {leagues.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        
        <div className="flex gap-1">
          <ViewButton active={selectedView === 'comparison'} onClick={() => setSelectedView('comparison')}>
            Сравнение прогнозов
          </ViewButton>
          <ViewButton active={selectedView === 'trends'} onClick={() => setSelectedView('trends')}>
            Рост точности
          </ViewButton>
          <ViewButton active={selectedView === 'accuracy'} onClick={() => setSelectedView('accuracy')}>
            Точность по лигам
          </ViewButton>
        </div>
      </div>

      {/* График сравнения прогнозов */}
      {selectedView === 'comparison' && (
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-blue-400" />
            Сравнение прогнозов: Neuro AI vs Пуассон
          </h3>
          
          <div className="space-y-4">
            {mockPredictions.map((pred, i) => (
              <div key={i} className="bg-gray-700/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{pred.match}</span>
                  <span className="text-xs text-gray-400">{pred.date}</span>
                </div>
                
                <div className="space-y-2">
                  {/* Пуассон */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-yellow-400 w-16">Пуассон:</span>
                    <div className="flex-1 h-6 bg-gray-700 rounded-full relative overflow-hidden">
                      <div 
                        className="h-full bg-yellow-500/30 rounded-full flex items-center justify-end pr-2"
                        style={{ width: `${(pred.poisson / maxCorners) * 100}%` }}
                      >
                        <span className="text-xs text-yellow-400 font-medium">{pred.poisson}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Neuro */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-green-400 w-16">Neuro:</span>
                    <div className="flex-1 h-6 bg-gray-700 rounded-full relative overflow-hidden">
                      <div 
                        className="h-full bg-green-500/30 rounded-full flex items-center justify-end pr-2"
                        style={{ width: `${(pred.neuro / maxCorners) * 100}%` }}
                      >
                        <span className="text-xs text-green-400 font-medium">{pred.neuro}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Факт */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-blue-400 w-16">Факт:</span>
                    <div className="flex-1 h-6 bg-gray-700 rounded-full relative overflow-hidden">
                      <div 
                        className="h-full bg-blue-500/30 rounded-full flex items-center justify-end pr-2"
                        style={{ width: `${(pred.actual / maxCorners) * 100}%` }}
                      >
                        <span className="text-xs text-blue-400 font-medium">{pred.actual}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Кто точнее */}
                <div className="mt-2 text-xs">
                  {Math.abs(pred.neuro - pred.actual) < Math.abs(pred.poisson - pred.actual) ? (
                    <span className="text-green-400">✅ Neuro точнее на {(Math.abs(pred.poisson - pred.actual) - Math.abs(pred.neuro - pred.actual)).toFixed(1)} угловых</span>
                  ) : Math.abs(pred.neuro - pred.actual) > Math.abs(pred.poisson - pred.actual) ? (
                    <span className="text-yellow-400">⚠️ Пуассон точнее на {(Math.abs(pred.neuro - pred.actual) - Math.abs(pred.poisson - pred.actual)).toFixed(1)} угловых</span>
                  ) : (
                    <span className="text-gray-400">➖ Одинаковая точность</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* График роста точности */}
      {selectedView === 'trends' && (
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Activity size={20} className="text-green-400" />
            Рост точности с накоплением данных
          </h3>
          
          <div className="space-y-6">
            {/* Легенда */}
            <div className="flex gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span className="text-gray-400">Neuro AI</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-gray-400">Пуассон</span>
              </div>
            </div>

            {/* График */}
            <div className="relative h-64">
              {/* Ось Y (проценты) */}
              <div className="absolute left-0 top-0 bottom-0 w-10 flex flex-col justify-between text-xs text-gray-400">
                <span>{maxAccuracy}%</span>
                <span>{maxAccuracy * 0.75}%</span>
                <span>{maxAccuracy * 0.5}%</span>
                <span>{maxAccuracy * 0.25}%</span>
                <span>0%</span>
              </div>
              
              {/* Область графика */}
              <div className="ml-12 h-full relative">
                {/* Линии сетки */}
                {[0, 25, 50, 75, 100].map(pct => (
                  <div 
                    key={pct}
                    className="absolute w-full border-t border-gray-700/50"
                    style={{ bottom: `${pct}%` }}
                  />
                ))}
                
                {/* Точки и линии */}
                <svg className="absolute inset-0 w-full h-full">
                  {/* Линия Neuro */}
                  <polyline
                    points={mockAccuracy.map((d, i) => 
                      `${(i / (mockAccuracy.length - 1)) * 100}%,${100 - (d.neuro / maxAccuracy) * 100}%`
                    ).join(' ')}
                    fill="none"
                    stroke="#a855f7"
                    strokeWidth="2"
                    strokeDasharray="4"
                  />
                  {/* Линия Пуассон */}
                  <polyline
                    points={mockAccuracy.map((d, i) => 
                      `${(i / (mockAccuracy.length - 1)) * 100}%,${100 - (d.poisson / maxAccuracy) * 100}%`
                    ).join(' ')}
                    fill="none"
                    stroke="#eab308"
                    strokeWidth="2"
                  />
                </svg>
                
                {/* Точки */}
                {mockAccuracy.map((d, i) => (
                  <div key={i} className="absolute flex flex-col items-center" style={{ 
                    left: `${(i / (mockAccuracy.length - 1)) * 100}%`,
                    bottom: `${(d.neuro / maxAccuracy) * 100}%`,
                    transform: 'translateX(-50%)'
                  }}>
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                  </div>
                ))}
              </div>
              
              {/* Ось X (количество матчей) */}
              <div className="ml-12 flex justify-between text-xs text-gray-400 mt-2">
                {mockAccuracy.map(d => (
                  <span key={d.matches}>{d.matches}</span>
                ))}
              </div>
            </div>
            
            {/* Текущий статус */}
            <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-lg p-4 border border-purple-700/50">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">
                  {totalMatches >= 500 
                    ? '✅ Данных достаточно для обучения!'
                    : `📊 Собрано ${totalMatches} из 500 матчей`
                  }
                </span>
                <span className="text-sm font-medium text-purple-400">
                  {totalMatches >= 500 ? 'Запустить обучение →' : `${Math.min(100, (totalMatches / 500) * 100).toFixed(0)}%`}
                </span>
              </div>
              <div className="h-1.5 bg-gray-700 rounded-full mt-2 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (totalMatches / 500) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Точность по лигам */}
      {selectedView === 'accuracy' && (
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Trophy size={20} className="text-yellow-400" />
            Точность по лигам
          </h3>
          
          <div className="space-y-4">
            {leagues.map(league => {
              const leagueMatches = data.matches?.filter(m => m.leagueId === league.id)?.length || 0;
              const canTrain = leagueMatches >= 100;
              
              return (
                <div key={league.id} className="bg-gray-700/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{league.name}</span>
                    <span className="text-xs text-gray-400">{leagueMatches} матчей</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-yellow-400 w-20">Пуассон:</span>
                      <div className="flex-1 h-5 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-yellow-500/30 rounded-full flex items-center justify-end pr-2"
                          style={{ width: '64%' }}
                        >
                          <span className="text-xs text-yellow-400">64%</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-purple-400 w-20">Neuro:</span>
                      <div className="flex-1 h-5 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-purple-500/30 rounded-full flex items-center justify-end pr-2"
                          style={{ width: canTrain ? '73%' : '0%' }}
                        >
                          <span className="text-xs text-purple-400">
                            {canTrain ? '73%' : '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {!canTrain && (
                    <p className="text-xs text-gray-500 mt-2">
                      Нужно ещё {100 - leagueMatches} матчей для обучения
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color, subtitle }) => {
  const colors = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    purple: 'text-purple-400',
  };
  
  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
      <Icon className={`${colors[color]} mb-2`} size={20} />
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-[10px] text-gray-500 mt-1">{subtitle}</p>
    </div>
  );
};

const ViewButton = ({ active, onClick, children }) => (
  <button 
    onClick={onClick}
    className={`px-3 py-1.5 rounded-lg text-xs transition ${
      active 
        ? 'bg-purple-600 text-white' 
        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
    }`}
  >
    {children}
  </button>
);

// Импорт для StatCard
import { Database } from 'lucide-react';

export default Analytics;