import { BarChart3, Construction } from 'lucide-react';

const Analytics = () => {
  return (
    <div className="max-w-6xl mx-auto">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold mb-1 flex items-center gap-3">
          <BarChart3 className="text-purple-400" /> Аналитика
        </h2>
        <p className="text-sm md:text-base text-gray-400">Реальные данные • Пуассон vs Neuro • Бэктест</p>
      </div>

      <div className="bg-gray-800/50 rounded-xl p-12 border border-gray-700 text-center mt-6">
        <Construction size={64} className="mx-auto mb-6 text-yellow-400 animate-pulse" />
        <h3 className="text-2xl font-bold mb-3">Страница в разработке</h3>
        <p className="text-gray-400 text-lg mb-2">Аналитика будет доступна в следующем обновлении</p>
        <p className="text-gray-500 text-sm">Мы работаем над улучшением алгоритмов и бэктеста</p>
      </div>
    </div>
  );
};

export default Analytics;