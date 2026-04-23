import { Brain, Construction, TrendingUp, Database, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

const Neuro = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center py-8 md:py-12">
        {/* Иконка */}
        <div className="flex justify-center mb-6">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 rounded-2xl shadow-2xl">
            <Brain size={64} className="text-white" />
          </div>
        </div>
        
        {/* Заголовок */}
        <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
          Neuro AI
        </h1>
        
        {/* Статус */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <Construction size={20} className="text-yellow-400" />
          <span className="text-lg text-yellow-400 font-medium">Раздел в разработке</span>
        </div>
        
        {/* Описание */}
        <p className="text-gray-400 max-w-2xl mx-auto mb-8">
          Нейросетевая модель для прогнозирования угловых на основе глубокого обучения.
          Сейчас идёт сбор данных и обучение модели.
        </p>
        
        {/* Прогресс */}
        <div className="max-w-md mx-auto mb-8">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-400">Прогресс сбора данных</span>
            <span className="text-blue-400 font-medium">32 / 1000+ матчей</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min((32 / 1000) * 100, 100)}%` }}
            />
          </div>
        </div>
        
        {/* Что будет */}
        <div className="bg-gray-800/50 rounded-xl p-6 max-w-2xl mx-auto border border-gray-700">
          <h3 className="text-lg font-semibold mb-4 flex items-center justify-center gap-2">
            <Zap size={18} className="text-yellow-400" />
            Что будет доступно:
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-gray-700/30 rounded-lg p-4">
              <Database size={24} className="text-blue-400 mx-auto mb-2" />
              <p className="font-medium">Глубокое обучение</p>
              <p className="text-xs text-gray-400 mt-1">Нейросеть на основе 1000+ матчей</p>
            </div>
            <div className="bg-gray-700/30 rounded-lg p-4">
              <TrendingUp size={24} className="text-green-400 mx-auto mb-2" />
              <p className="font-medium">Точность 75%+</p>
              <p className="text-xs text-gray-400 mt-1">Прогнозирование тоталов и исходов</p>
            </div>
            <div className="bg-gray-700/30 rounded-lg p-4">
              <Brain size={24} className="text-purple-400 mx-auto mb-2" />
              <p className="font-medium">Анализ паттернов</p>
              <p className="text-xs text-gray-400 mt-1">Поиск скрытых закономерностей</p>
            </div>
          </div>
        </div>
        
        {/* Кнопка возврата */}
        <div className="mt-8">
          <Link 
            to="/poisson" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
          >
            ← Вернуться к калькулятору Пуассона
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Neuro;