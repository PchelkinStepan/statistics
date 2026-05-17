import { useState, useEffect } from 'react';
import { getData, subscribe } from '../data/store';
import { 
  Brain, BarChart3, Target, Trophy, Database,
  Zap, TreePine, Check, X, Clock, Medal
} from 'lucide-react';

const Analytics = () => {
  const [data, setData] = useState(getData());
  const [predictionLog, setPredictionLog] = useState([]);
  const [filterLeague, setFilterLeague] = useState('all');
  const [filterModel, setFilterModel] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribe((newData) => setData(newData));
    return () => unsubscribe();
  }, []);

  // 🔥 Загружаем прогнозы и чистим те, чьи матчи удалены
  useEffect(() => {
    const loadPredictions = async () => {
      try {
        const { getDocs, collection, deleteDoc, doc } = await import('firebase/firestore');
        const { db } = await import('../firebase');
        const snap = await getDocs(collection(db, 'football', 'stats', 'predictions'));
        const logs = [];
        const toDelete = [];
        
        snap.forEach(d => {
          const pred = d.data();
          const matchExists = data.matches?.some(m => 
            m.homeTeamId === pred.homeTeamId && 
            m.awayTeamId === pred.awayTeamId &&
            Math.abs(new Date(m.date) - new Date(pred.date)) < 7 * 86400000
          );
          
          if (matchExists || pred.actualTotal !== null) {
            logs.push(pred);
          } else {
            toDelete.push(deleteDoc(doc(db, 'football', 'stats', 'predictions', d.id)));
          }
        });
        
        if (toDelete.length > 0) {
          await Promise.all(toDelete);
          console.log(`🗑️ Удалено ${toDelete.length} прогнозов (матчи не найдены)`);
        }
        
        logs.sort((a, b) => new Date(b.date) - new Date(a.date));
        setPredictionLog(logs);
      } catch (e) {
        console.log('📭 Нет прогнозов в Firebase');
      }
      setLoading(false);
    };
    loadPredictions();
  }, [data.lastUpdated]);

  const totalMatches = data.matches?.length || 0;
  const leagues = data.leagues || [];

  // 🔥 ПОЛНАЯ СВЕРКА ПРОГНОЗОВ
  const enrichedPredictions = predictionLog.map(pred => {
    const match = data.matches?.find(m => 
      m.homeTeamId === pred.homeTeamId && 
      m.awayTeamId === pred.awayTeamId &&
      Math.abs(new Date(m.date) - new Date(pred.date)) < 86400000
    );
    
    if (!match) return { ...pred, actualTotal: null };
    
    const actualTotal = (match.homeCorners || 0) + (match.awayCorners || 0);
    const actualOver = actualTotal > pred.selectedTotal;
    
    const tfExpected = pred.predictions?.tf ? parseFloat(pred.predictions.tf.expectedTotal) : null;
    const rfExpected = pred.predictions?.rf ? parseFloat(pred.predictions.rf.expectedTotal) : null;
    const xgbExpected = pred.predictions?.xgb ? parseFloat(pred.predictions.xgb.expectedTotal) : null;
    
    const tfError = tfExpected !== null ? Math.abs(tfExpected - actualTotal).toFixed(2) : null;
    const rfError = rfExpected !== null ? Math.abs(rfExpected - actualTotal).toFixed(2) : null;
    const xgbError = xgbExpected !== null ? Math.abs(xgbExpected - actualTotal).toFixed(2) : null;
    
    const errors = [
      { model: 'tf', error: tfError !== null ? parseFloat(tfError) : Infinity },
      { model: 'rf', error: rfError !== null ? parseFloat(rfError) : Infinity },
      { model: 'xgb', error: xgbError !== null ? parseFloat(xgbError) : Infinity },
    ];
    errors.sort((a, b) => a.error - b.error);
    const bestModel = errors[0].error < Infinity ? errors[0].model : null;
    
    return {
      ...pred,
      actualTotal,
      actualOver,
      tfCorrect: tfExpected !== null ? (pred.predictions.tf.overProbability > 50) === actualOver : null,
      rfCorrect: rfExpected !== null ? (pred.predictions.rf.overProbability > 50) === actualOver : null,
      xgbCorrect: xgbExpected !== null ? (pred.predictions.xgb.overProbability > 50) === actualOver : null,
      tfExpected: tfExpected?.toFixed(2) || null,
      rfExpected: rfExpected?.toFixed(2) || null,
      xgbExpected: xgbExpected?.toFixed(2) || null,
      tfError,
      rfError,
      xgbError,
      bestModel,
    };
  });

  // 🔥 ФИКС: статистика только по СВЕРЕННЫМ матчам
  const getModelStats = (modelKey) => {
    const relevant = enrichedPredictions.filter(p => p.actualTotal !== null && p[`${modelKey}Expected`] !== null);
    if (relevant.length === 0) return null;
    
    const correct = relevant.filter(p => p[`${modelKey}Correct`]).length;
    const totalErrors = relevant.reduce((sum, p) => sum + parseFloat(p[`${modelKey}Error`] || 0), 0);
    const bestCount = relevant.filter(p => p.bestModel === modelKey).length;
    
    return {
      correct,
      total: relevant.length,
      accuracy: ((correct / relevant.length) * 100).toFixed(1),
      mae: (totalErrors / relevant.length).toFixed(2),
      bestCount,
      bestRate: ((bestCount / relevant.length) * 100).toFixed(1),
    };
  };

  const tfStats = getModelStats('tf');
  const rfStats = getModelStats('rf');
  const xgbStats = getModelStats('xgb');

  // Фильтрация
  const filteredPredictions = enrichedPredictions.filter(p => {
    if (filterLeague !== 'all' && p.leagueId !== filterLeague) return false;
    if (filterModel === 'onlyMatched' && p.actualTotal === null) return false;
    return true;
  });

  const getCorrectIcon = (correct) => {
    if (correct === null) return <Clock size={14} className="text-gray-500" />;
    if (correct) return <Check size={14} className="text-green-400" />;
    return <X size={14} className="text-red-400" />;
  };

  const getBestBadge = (modelKey, bestModel) => {
    if (bestModel === null) return null;
    if (bestModel === modelKey) return <Medal size={12} className="text-yellow-400 ml-0.5" title="Ближе всех к факту!" />;
    return null;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold mb-1 flex items-center gap-3">
          <BarChart3 className="text-purple-400" /> Аналитика
        </h2>
        <p className="text-sm md:text-base text-gray-400">
          Детальное сравнение прогнозов с реальными матчами
        </p>
      </div>

      {/* Карточки */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Database} label="Всего матчей в базе" value={totalMatches} color="blue" />
        <StatCard icon={Target} label="Записано прогнозов" value={predictionLog.length} color="yellow" />
        <StatCard icon={Check} label="Сверено с фактом" value={enrichedPredictions.filter(p => p.actualTotal !== null).length} color="green" />
        <StatCard icon={Clock} label="Ожидают результата" value={enrichedPredictions.filter(p => p.actualTotal === null).length} color="gray" />
      </div>

      {/* 🏆 ПЬЕДЕСТАЛ */}
      {(() => {
        const allStats = [
          { model: 'TensorFlow', key: 'tf', stats: tfStats, icon: Brain, color: 'text-purple-400', bg: 'bg-purple-900/20', border: 'border-purple-700/50', place: null },
          { model: 'Random Forest', key: 'rf', stats: rfStats, icon: TreePine, color: 'text-lime-400', bg: 'bg-lime-900/20', border: 'border-lime-700/50', place: null },
          { model: 'XGBoost', key: 'xgb', stats: xgbStats, icon: Zap, color: 'text-emerald-400', bg: 'bg-emerald-900/20', border: 'border-emerald-700/50', place: null },
        ].filter(s => s.stats);
        
        if (allStats.length === 0) return null;
        
        // Сортируем: сначала по accuracy (выше = лучше), при равном — по MAE (меньше = лучше)
        const sorted = [...allStats].sort((a, b) => {
          const accDiff = parseFloat(b.stats.accuracy) - parseFloat(a.stats.accuracy);
          if (accDiff !== 0) return accDiff;
          return parseFloat(a.stats.mae) - parseFloat(b.stats.mae);
        });
        
        sorted.forEach((s, i) => s.place = i + 1);
        const medals = ['🥇', '🥈', '🥉'];
        
        return (
          <div className="bg-gray-800/50 rounded-xl p-6 border border-yellow-700/50">
            <h3 className="text-lg font-bold text-yellow-400 mb-4 flex items-center gap-2">
              <Trophy size={20} /> Пьедестал
            </h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              {sorted.map((s) => (
                <div key={s.key} className={`${s.bg} rounded-xl p-4 border ${s.border}`}>
                  <div className="text-2xl mb-1">{medals[s.place - 1]}</div>
                  <s.icon size={28} className={`mx-auto mb-2 ${s.color}`} />
                  <p className="text-xs text-gray-400 mb-1">{s.model}</p>
                  <p className="text-2xl font-bold text-white">{s.stats.accuracy}%</p>
                  <p className="text-xs text-gray-500">{s.stats.correct}/{s.stats.total} верно</p>
                  <div className="border-t border-gray-700 mt-2 pt-2">
                    <p className="text-xs text-gray-500">MAE: ±{s.stats.mae} угл.</p>
                    <p className="text-xs text-yellow-400">🥇 Лучшая: {s.stats.bestCount} раз ({s.stats.bestRate}%)</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* 📋 ИСТОРИЯ ПРОГНОЗОВ */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-lg font-bold">📋 История прогнозов</h3>
          <div className="flex flex-wrap gap-2">
            <select value={filterLeague} onChange={(e) => setFilterLeague(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs">
              <option value="all">Все лиги</option>
              {leagues.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <select value={filterModel} onChange={(e) => setFilterModel(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs">
              <option value="all">Все прогнозы</option>
              <option value="onlyMatched">Только сверенные</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-400">
            <div className="text-2xl mb-2 animate-pulse">⚽</div>
            <p>Загружаю прогнозы...</p>
          </div>
        ) : filteredPredictions.length === 0 ? (
          <div className="bg-gray-800/50 rounded-xl p-8 text-center border border-gray-700">
            <Database size={48} className="mx-auto mb-4 text-gray-500" />
            <p className="text-gray-400 mb-2">Нет записанных прогнозов</p>
            <p className="text-sm text-gray-500">
              Зайди в Neuro → Сравнение → Сравнить все модели → 📝 Записать
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPredictions.map((pred, i) => {
              const league = leagues.find(l => l.id === pred.leagueId);
              const isMatched = pred.actualTotal !== null;
              
              return (
                <div key={pred.id || i} className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
                  <div className="bg-gray-700/50 px-5 py-3 flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <p className="font-semibold text-white">{pred.match}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400">{league?.name}</span>
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-xs text-gray-400">{new Date(pred.date).toLocaleDateString('ru-RU')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-[10px] text-gray-500">Тотал</p>
                        <p className="font-bold text-white">{pred.selectedTotal}</p>
                      </div>
                      {isMatched ? (
                        <div className="text-center">
                          <p className="text-[10px] text-gray-500">Факт</p>
                          <p className={`font-bold text-lg ${pred.actualTotal > pred.selectedTotal ? 'text-green-400' : 'text-red-400'}`}>
                            {pred.actualTotal}
                          </p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <p className="text-[10px] text-gray-500">Факт</p>
                          <p className="text-gray-500">—</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 divide-x divide-gray-700">
                    {/* TensorFlow */}
                    <div className="p-4">
                      <p className="text-xs text-purple-400 font-medium mb-2 flex items-center gap-1.5">
                        <Brain size={14} /> TensorFlow
                      </p>
                      {pred.predictions?.tf ? (
                        <div className="space-y-1.5">
                          <p className="text-lg font-bold text-white">
                            {pred.predictions.tf.expectedTotal}
                            {isMatched && getBestBadge('tf', pred.bestModel)}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            ТБ {pred.selectedTotal}: <span className="text-green-400 font-medium">{pred.predictions.tf.overProbability}%</span>
                          </p>
                          {isMatched ? (
                            <div className="flex items-center gap-2 pt-1">
                              {getCorrectIcon(pred.tfCorrect)}
                              <span className={`text-xs font-medium ${
                                parseFloat(pred.tfError) <= 1 ? 'text-green-400' : 
                                parseFloat(pred.tfError) <= 2 ? 'text-yellow-400' : 'text-red-400'
                              }`}>
                                ошибка ±{pred.tfError} угл.
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 pt-1">
                              <Clock size={14} className="text-gray-500" />
                              <span className="text-xs text-gray-500">ждёт матча</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Нет прогноза</p>
                      )}
                    </div>

                    {/* Random Forest */}
                    <div className="p-4">
                      <p className="text-xs text-lime-400 font-medium mb-2 flex items-center gap-1.5">
                        <TreePine size={14} /> Random Forest
                      </p>
                      {pred.predictions?.rf ? (
                        <div className="space-y-1.5">
                          <p className="text-lg font-bold text-white">
                            {pred.predictions.rf.expectedTotal}
                            {isMatched && getBestBadge('rf', pred.bestModel)}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            ТБ {pred.selectedTotal}: <span className="text-green-400 font-medium">{pred.predictions.rf.overProbability}%</span>
                          </p>
                          {isMatched ? (
                            <div className="flex items-center gap-2 pt-1">
                              {getCorrectIcon(pred.rfCorrect)}
                              <span className={`text-xs font-medium ${
                                parseFloat(pred.rfError) <= 1 ? 'text-green-400' : 
                                parseFloat(pred.rfError) <= 2 ? 'text-yellow-400' : 'text-red-400'
                              }`}>
                                ошибка ±{pred.rfError} угл.
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 pt-1">
                              <Clock size={14} className="text-gray-500" />
                              <span className="text-xs text-gray-500">ждёт матча</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Нет прогноза</p>
                      )}
                    </div>

                    {/* XGBoost */}
                    <div className="p-4">
                      <p className="text-xs text-emerald-400 font-medium mb-2 flex items-center gap-1.5">
                        <Zap size={14} /> XGBoost
                      </p>
                      {pred.predictions?.xgb ? (
                        <div className="space-y-1.5">
                          <p className="text-lg font-bold text-white">
                            {pred.predictions.xgb.expectedTotal}
                            {isMatched && getBestBadge('xgb', pred.bestModel)}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            ТБ {pred.selectedTotal}: <span className="text-green-400 font-medium">{pred.predictions.xgb.overProbability}%</span>
                          </p>
                          {isMatched ? (
                            <div className="flex items-center gap-2 pt-1">
                              {getCorrectIcon(pred.xgbCorrect)}
                              <span className={`text-xs font-medium ${
                                parseFloat(pred.xgbError) <= 1 ? 'text-green-400' : 
                                parseFloat(pred.xgbError) <= 2 ? 'text-yellow-400' : 'text-red-400'
                              }`}>
                                ошибка ±{pred.xgbError} угл.
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 pt-1">
                              <Clock size={14} className="text-gray-500" />
                              <span className="text-xs text-gray-500">ждёт матча</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Нет прогноза</p>
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

const StatCard = ({ icon: Icon, label, value, color }) => {
  const c = { blue: 'text-blue-400', green: 'text-green-400', yellow: 'text-yellow-400', purple: 'text-purple-400', gray: 'text-gray-400' };
  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
      <Icon className={`${c[color]} mb-2`} size={20} />
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
};

export default Analytics;