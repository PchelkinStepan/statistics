import { useState, useEffect } from 'react';
import { getData, subscribe } from '../data/store';
import { Scale, Brain, TreePine, Zap, Check, X, Clock, TrendingUp, Trophy, Upload } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const ABAnalytics = () => {
  const [data, setData] = useState(getData());
  const [abTests, setAbTests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribe((newData) => setData(newData));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const loadABTests = async () => {
      try {
        const { getDocs, collection } = await import('firebase/firestore');
        const { db } = await import('../firebase');
        const snap = await getDocs(collection(db, 'football', 'stats', 'ab_tests'));
        const tests = [];
        snap.forEach(d => tests.push(d.data()));
        tests.sort((a, b) => new Date(b.date) - new Date(a.date));
        setAbTests(tests);
      } catch (e) {
        console.log('📭 Нет A/B тестов');
      }
      setLoading(false);
    };
    loadABTests();
  }, [data.lastUpdated]);

  // Обогащаем тесты фактическими данными
  const enrichedTests = abTests.map(test => {
    const match = data.matches?.find(m => {
      const mHome = data.teams?.find(t => t.id === m.homeTeamId)?.name;
      const mAway = data.teams?.find(t => t.id === m.awayTeamId)?.name;
      return mHome === test.match.split(' - ')[0] && mAway === test.match.split(' - ')[1] && Math.abs(new Date(m.date) - new Date(test.date)) < 7 * 86400000;
    });
    
    if (!match) return { ...test, actualTotal: null };
    
    const actualTotal = (match.homeCorners || 0) + (match.awayCorners || 0);
    const actualOver = actualTotal > test.selectedTotal;
    
    const mainCorrect = test.mainModel?.expectedTotal ? (parseFloat(test.mainModel.expectedTotal) > test.selectedTotal) === actualOver : null;
    const challengerCorrect = test.challengerModel?.expectedTotal ? (parseFloat(test.challengerModel.expectedTotal) > test.selectedTotal) === actualOver : null;
    
    return {
      ...test,
      actualTotal,
      actualOver,
      mainCorrect,
      challengerCorrect,
    };
  });

  // Статистика по основной модели
  const mainStats = (() => {
    const relevant = enrichedTests.filter(t => t.actualTotal !== null && t.mainCorrect !== null);
    if (relevant.length === 0) return null;
    const correct = relevant.filter(t => t.mainCorrect).length;
    return {
      correct,
      total: relevant.length,
      accuracy: ((correct / relevant.length) * 100).toFixed(1),
    };
  })();

  // Статистика по претенденту
  const challengerStats = (() => {
    const relevant = enrichedTests.filter(t => t.actualTotal !== null && t.challengerCorrect !== null);
    if (relevant.length === 0) return null;
    const correct = relevant.filter(t => t.challengerCorrect).length;
    return {
      correct,
      total: relevant.length,
      accuracy: ((correct / relevant.length) * 100).toFixed(1),
    };
  })();

  // График накопленной прибыли (при ставке 1000₽ на каждый прогноз)
  const profitData = (() => {
    const relevant = enrichedTests.filter(t => t.actualTotal !== null && t.mainCorrect !== null && t.challengerCorrect !== null)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    let mainProfit = 0;
    let challengerProfit = 0;
    
    return relevant.map((t, i) => {
      // Предполагаем кэф 1.85 для выигрышных ставок
      mainProfit += t.mainCorrect ? 850 : -1000;
      challengerProfit += t.challengerCorrect ? 850 : -1000;
      
      return {
        date: new Date(t.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
        main: mainProfit,
        challenger: challengerProfit,
      };
    });
  })();

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold mb-1 flex items-center gap-3">
          <Scale className="text-red-400" /> A/B аналитика
        </h2>
        <p className="text-sm md:text-base text-gray-400">
          Сравнение основной модели и претендента на реальных прогнозах
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-900/20 rounded-xl p-4 border border-blue-700/50">
          <h4 className="text-sm font-semibold text-blue-400 mb-2 flex items-center gap-2">
            <Brain size={16} /> Основная модель
          </h4>
          {mainStats ? (
            <div className="text-center">
              <p className="text-3xl font-bold text-white">{mainStats.accuracy}%</p>
              <p className="text-xs text-gray-400">{mainStats.correct}/{mainStats.total} угадано</p>
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">Нет данных</p>
          )}
        </div>
        
        <div className="bg-yellow-900/20 rounded-xl p-4 border border-yellow-700/50">
          <h4 className="text-sm font-semibold text-yellow-400 mb-2 flex items-center gap-2">
            <Upload size={16} /> Претендент
          </h4>
          {challengerStats ? (
            <div className="text-center">
              <p className="text-3xl font-bold text-white">{challengerStats.accuracy}%</p>
              <p className="text-xs text-gray-400">{challengerStats.correct}/{challengerStats.total} угадано</p>
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">Нет данных</p>
          )}
        </div>
      </div>

      {profitData.length > 5 && (
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <TrendingUp size={16} className="text-green-400" /> Накопленная прибыль (ставка 1000₽, кэф 1.85)
          </h4>
          <div style={{ height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={profitData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" fontSize={10} />
                <YAxis stroke="#9CA3AF" fontSize={10} label={{ value: 'Прибыль (₽)', angle: -90, position: 'insideLeft', fill: '#9CA3AF', fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }} />
                <Line type="monotone" dataKey="main" stroke="#3B82F6" name="Основная" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="challenger" stroke="#EAB308" name="Претендент" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-lg font-bold">📋 История A/B тестов</h3>
        
        {loading ? (
          <div className="text-center py-8 text-gray-400">
            <div className="text-2xl mb-2 animate-pulse">⚽</div>
            <p>Загружаю...</p>
          </div>
        ) : enrichedTests.length === 0 ? (
          <div className="bg-gray-800/50 rounded-xl p-8 text-center border border-gray-700">
            <Scale size={48} className="mx-auto mb-4 text-gray-500" />
            <p className="text-gray-400 mb-2">Нет A/B тестов</p>
            <p className="text-sm text-gray-500">
              Зайди в Neuro → A/B тест → Сравнить и записать прогнозы
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {enrichedTests.map((test, i) => {
              const isMatched = test.actualTotal !== null;
              
              return (
                <div key={test.id || i} className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                    <div>
                      <p className="font-semibold text-white">{test.match}</p>
                      <p className="text-xs text-gray-400">{new Date(test.date).toLocaleDateString('ru-RU')} • Тотал {test.selectedTotal}</p>
                    </div>
                    {isMatched && (
                      <div className="text-center">
                        <p className="text-[10px] text-gray-500">Факт</p>
                        <p className={`font-bold text-lg ${test.actualTotal > test.selectedTotal ? 'text-green-400' : 'text-red-400'}`}>
                          {test.actualTotal}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-900/20 rounded-lg p-3">
                      <p className="text-xs text-blue-400 font-medium mb-1">Основная ({test.mainModel?.type?.toUpperCase()})</p>
                      <p className="text-lg font-bold text-white">{test.mainModel?.expectedTotal || '—'}</p>
                      {isMatched && (
                        <div className="flex items-center gap-1 mt-1">
                          {test.mainCorrect ? <Check size={14} className="text-green-400" /> : <X size={14} className="text-red-400" />}
                          <span className={`text-xs ${test.mainCorrect ? 'text-green-400' : 'text-red-400'}`}>
                            {test.mainCorrect ? 'угадала' : 'ошибка'}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="bg-yellow-900/20 rounded-lg p-3">
                      <p className="text-xs text-yellow-400 font-medium mb-1">Претендент ({test.challengerModel?.name})</p>
                      <p className="text-lg font-bold text-white">{test.challengerModel?.expectedTotal || '—'}</p>
                      {isMatched && (
                        <div className="flex items-center gap-1 mt-1">
                          {test.challengerCorrect ? <Check size={14} className="text-green-400" /> : <X size={14} className="text-red-400" />}
                          <span className={`text-xs ${test.challengerCorrect ? 'text-green-400' : 'text-red-400'}`}>
                            {test.challengerCorrect ? 'угадала' : 'ошибка'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ABAnalytics;
