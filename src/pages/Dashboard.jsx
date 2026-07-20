import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Calendar, TrendingUp, Target, Brain, TreePine, Zap, Plus, Save, Wallet, Activity } from 'lucide-react';
import { getData, subscribe } from '../data/store';

const Dashboard = () => {
  // 🔧 ИСПРАВЛЕНО: теперь данные обновляются реактивно
  const [data, setData] = useState(getData());
  const [modelStatus, setModelStatus] = useState({ tf: null, rf: null, xgb: null });
  
  useEffect(() => {
    const unsubscribe = subscribe((newData) => {
      setData(newData);
    });
    return () => unsubscribe();
  }, []);

  // Загружаем статус моделей из localStorage
  useEffect(() => {
    const tfMeta = localStorage.getItem('neuro_test_results');
    const rfMeta = localStorage.getItem('neuro_rf_meta');
    const xgbMeta = localStorage.getItem('neuro_xgb_meta');
    
    setModelStatus({
      tf: tfMeta ? JSON.parse(tfMeta) : null,
      rf: rfMeta ? JSON.parse(rfMeta) : null,
      xgb: xgbMeta ? JSON.parse(xgbMeta) : null,
    });
  }, [data.lastUpdated]);
  
  const totalMatches = data.matches.length;
  const totalLeagues = data.leagues.length;
  const totalTeams = data.teams.length;
  const totalBets = data.bets?.length || 0;

  const ModelStatusCard = ({ icon: Icon, title, status, color, link }) => (
    <Link to={link} className="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:bg-gray-700/50 transition">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon size={18} className={color} />
          <span className="text-sm font-medium">{title}</span>
        </div>
        {status ? (
          <span className="text-xs text-green-400 flex items-center gap-1">
            <span className="w-2 h-2 bg-green-400 rounded-full"></span>
            Готова
          </span>
        ) : (
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <span className="w-2 h-2 bg-gray-500 rounded-full"></span>
            Не обучена
          </span>
        )}
      </div>
      {status && (
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>MAE: <span className="font-bold text-white">±{status.avgError || status.mae}</span></span>
          <span>Тестов: <span className="font-bold text-white">{status.totalTested || status.total}</span></span>
        </div>
      )}
    </Link>
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold mb-2">Дашборд</h2>
        <p className="text-gray-400">Обзор футбольной статистики</p>
      </div>

      {/* Статистические карточки */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <Trophy className="text-yellow-500 mb-4" size={32} />
          <h3 className="text-lg text-gray-400 mb-1">Лиг</h3>
          <p className="text-4xl font-bold">{totalLeagues}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <Target className="text-blue-500 mb-4" size={32} />
          <h3 className="text-lg text-gray-400 mb-1">Команд</h3>
          <p className="text-4xl font-bold">{totalTeams}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <Calendar className="text-green-500 mb-4" size={32} />
          <h3 className="text-lg text-gray-400 mb-1">Матчей</h3>
          <p className="text-4xl font-bold">{totalMatches}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <Target className="text-purple-500 mb-4" size={32} />
          <h3 className="text-lg text-gray-400 mb-1">Ставок</h3>
          <p className="text-4xl font-bold">{totalBets}</p>
        </div>
      </div>

      {/* 📊 СТАТУС МОДЕЛЕЙ */}
      <div>
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Activity className="text-blue-400" size={20} /> Статус моделей
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ModelStatusCard icon={Brain} title="TensorFlow" status={modelStatus.tf} color="text-purple-400" link="/neuro" />
          <ModelStatusCard icon={TreePine} title="Random Forest" status={modelStatus.rf} color="text-lime-400" link="/neuro" />
          <ModelStatusCard icon={Zap} title="XGBoost" status={modelStatus.xgb} color="text-emerald-400" link="/neuro" />
        </div>
      </div>

      {/* ⚡ БЫСТРЫЕ ДЕЙСТВИЯ */}
      <div>
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Target className="text-green-400" size={20} /> Быстрые действия
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/admin" className="bg-gradient-to-br from-blue-900/50 to-blue-800/50 border border-blue-700 rounded-xl p-6 hover:scale-[1.02] transition text-center">
            <Plus size={32} className="mx-auto mb-3 text-blue-400" />
            <h4 className="font-semibold mb-1">Добавить матч</h4>
            <p className="text-xs text-gray-400">Админка → Матчи</p>
          </Link>
          <Link to="/neuro" className="bg-gradient-to-br from-purple-900/50 to-purple-800/50 border border-purple-700 rounded-xl p-6 hover:scale-[1.02] transition text-center">
            <Save size={32} className="mx-auto mb-3 text-purple-400" />
            <h4 className="font-semibold mb-1">Записать прогноз</h4>
            <p className="text-xs text-gray-400">Neuro → Сравнение</p>
          </Link>
          <Link to="/bets" className="bg-gradient-to-br from-green-900/50 to-green-800/50 border border-green-700 rounded-xl p-6 hover:scale-[1.02] transition text-center">
            <Wallet size={32} className="mx-auto mb-3 text-green-400" />
            <h4 className="font-semibold mb-1">Добавить ставку</h4>
            <p className="text-xs text-gray-400">Трекер ставок</p>
          </Link>
        </div>
      </div>


      {/* Быстрый переход к лигам */}
      <div>
        <h3 className="text-xl font-semibold mb-4">Лиги</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {data.leagues.map(league => (
  <Link
    key={league.id}
    to={`/table/${league.id}`}
    className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:bg-gray-700 transition"
  >
    <p className="font-semibold">{league.name}</p>
    <p className="text-sm text-gray-400">{league.country}</p>
  </Link>
))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
