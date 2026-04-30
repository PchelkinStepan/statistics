import { useState, useEffect } from 'react';
import { Brain, Zap, TrendingUp, Activity, Database, Target, Play, RefreshCw, BarChart3, Calculator, Home, User, Save } from 'lucide-react';
import { getData, getActiveSeason } from '../data/store';
import * as tf from '@tensorflow/tfjs';

const Neuro = () => {
  const data = getData();
  const totalMatches = data.matches?.length || 0;
  const [activeTab, setActiveTab] = useState('tensorflow');
  const [trainingLog, setTrainingLog] = useState([]);
  const [isTraining, setIsTraining] = useState(false);
  const [isRetraining, setIsRetraining] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [testResults, setTestResults] = useState(null);

  // Проверяем сохранена ли модель при загрузке
  useEffect(() => {
    const checkModel = async () => {
      try {
        const models = await tf.io.listModels();
        if (models['localstorage://football-neuro-model']) {
          setModelReady(true);
          const lastTrained = localStorage.getItem('neuro_last_trained');
          const matchesCount = localStorage.getItem('neuro_matches_count');
          if (lastTrained) {
            console.log('📦 Найдена сохранённая модель');
            console.log('🕐 Обучена:', new Date(lastTrained).toLocaleString('ru-RU'));
            console.log('📊 На матчах:', matchesCount);
          }
        }
      } catch (e) {
        console.log('Модель не найдена');
      }
    };
    checkModel();
  }, []);

  // 🔮 ПРЕДИКТ ОТ НЕЙРОСЕТИ
  const [predictLeague, setPredictLeague] = useState(data.leagues?.[0]?.id || 'rpl');
  const [predictHomeTeam, setPredictHomeTeam] = useState('');
  const [predictAwayTeam, setPredictAwayTeam] = useState('');
  const [neuroPrediction, setNeuroPrediction] = useState(null);
  const [poissonPrediction, setPoissonPrediction] = useState(null);
  const [isPredicting, setIsPredicting] = useState(false);

  const activeSeason = getActiveSeason(predictLeague)?.id;
  const teamsInLeague = data.teams?.filter(t => t.leagueId === predictLeague) || [];

  const predictWithNeuro = async () => {
    if (!predictHomeTeam || !predictAwayTeam || !modelReady) return;
    
    setIsPredicting(true);
    
    let model; // ← ДОБАВЬ ЭТУ СТРОКУ
    
    try {
      model = await tf.loadLayersModel('localstorage://football-neuro-model'); // ← УБЕРИ const
      // Перекомпилируем после загрузки
      model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'binaryCrossentropy',
        metrics: ['accuracy']
      });
      
      const allMatches = [...(data.matches || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
      const homePast = getLastMatches(allMatches, predictHomeTeam, '2099-12-31', 10);
      const awayPast = getLastMatches(allMatches, predictAwayTeam, '2099-12-31', 10);
      
      const homeStats = calculateFeatures(homePast, predictHomeTeam);
      const awayStats = calculateFeatures(awayPast, predictAwayTeam);
      
      const features = [
        homeStats.avgCornersFor || 5,
        homeStats.avgCornersAgainst || 4,
        homeStats.cornersTrend || 0,
        homeStats.avgXG || 1.2,
        homeStats.avgPossession || 50,
        homeStats.avgShotsInside || 6,
        homeStats.formPoints || 0,
        
        awayStats.avgCornersFor || 4,
        awayStats.avgCornersAgainst || 5,
        awayStats.cornersTrend || 0,
        awayStats.avgXG || 1.1,
        awayStats.avgPossession || 50,
        awayStats.avgShotsInside || 5,
        awayStats.formPoints || 0,
        
        homeStats.avgCornersForHome || 5,
        homeStats.avgCornersAgainstHome || 4,
        awayStats.avgCornersForAway || 4,
        awayStats.avgCornersAgainstAway || 5,
        
        0,
        homeStats.matchesPlayed || 10,
        awayStats.matchesPlayed || 10,
      ];
      
      const prediction = model.predict(tf.tensor2d([features])).dataSync()[0];
      
      const { predictMatch } = await import('../data/store');
      const poissonResult = predictMatch(predictHomeTeam, predictAwayTeam, predictLeague, activeSeason, 9.5);
      setPoissonPrediction(poissonResult);
      
      setNeuroPrediction({
        overProbability: (prediction * 100).toFixed(1),
        underProbability: ((1 - prediction) * 100).toFixed(1),
        recommendation: prediction > 0.65 ? '🔥 СИЛЬНЫЙ ТБ 9.5' :
                        prediction > 0.55 ? '✅ ТБ 9.5' :
                        prediction < 0.35 ? '🧊 СИЛЬНЫЙ ТМ 9.5' :
                        prediction < 0.45 ? '❄️ ТМ 9.5' :
                        '⚖️ Нет сигнала',
        confidence: Math.abs(prediction - 0.5) * 200
      });
      
    } catch (error) {
      console.error('Ошибка предикта:', error);
    }
    
    setIsPredicting(false);
  };
  
  const log = (message) => {
    console.log(message);
    setTrainingLog(prev => [...prev, { time: new Date().toLocaleTimeString(), text: message }]);
  };
  
  // 🧠 ОБУЧЕНИЕ TENSORFLOW МОДЕЛИ С НУЛЯ
  const trainTensorFlowModel = async () => {
    setIsTraining(true);
    setTrainingLog([]);
    
    try {
      log('🚀 Начинаю обучение TensorFlow модели с нуля...');
      log(`📊 Данных: ${totalMatches} матчей`);
      
      const trainingData = prepareTrainingData(data.matches, data.teams, data.seasons);
      log(`✅ Подготовлено ${trainingData.length} примеров`);
      
      const model = createModel();
      log('✅ Модель создана (21 вход → 64 → 32 → 16 → 1 выход)');
      
      log('🎓 Обучение (50 эпох)...');
      const history = await trainModel(model, trainingData, log);
      log(`✅ Обучение завершено! Loss: ${history.loss.toFixed(4)}`);
      
      log('🧪 Тестирование...');
      const results = testModel(model, data.matches, data.teams, data.seasons);
      log(`📊 Точность Neuro: ${results.accuracy}%`);
      log(`📊 Точность Пуассон: ${results.poissonAccuracy}%`);
      log(`🚀 Улучшение: +${(results.accuracy - results.poissonAccuracy).toFixed(1)}%`);
      
      setTestResults(results);
      setModelReady(true);
      
      await model.save('localstorage://football-neuro-model');
      log('💾 Модель сохранена в браузере');
      
      localStorage.setItem('neuro_last_trained', new Date().toISOString());
      localStorage.setItem('neuro_matches_count', totalMatches);
      
    } catch (error) {
      log(`❌ Ошибка: ${error.message}`);
      console.error(error);
    }
    
    setIsTraining(false);
  };

  // 📚 ДООБУЧЕНИЕ МОДЕЛИ
const retrainModel = async () => {
  setIsRetraining(true);
  setTrainingLog([]);
  
  try {
    log('📚 Загружаю существующую модель...');
    const model = await tf.loadLayersModel('localstorage://football-neuro-model');
    // 🔧 ПЕРЕКОМПИЛИРУЕМ после загрузки
    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });
    log('✅ Модель загружена и скомпилирована');
    
    log('📦 Подготовка ВСЕХ данных...');
    const trainingData = prepareTrainingData(data.matches, data.teams, data.seasons);
    log(`✅ Подготовлено ${trainingData.length} примеров`);
    
    const xs = trainingData.map(d => d.features);
    const ys = trainingData.map(d => d.label);
    
    const xsTensor = tf.tensor2d(xs);
    const ysTensor = tf.tensor2d(ys, [ys.length, 1]);
    
    log('📚 Дообучение (10 эпох)...');
    
    const history = await model.fit(xsTensor, ysTensor, {
      epochs: 10,
      batchSize: 16,
      validationSplit: 0.2,
      shuffle: true,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          log(`  Эпоха ${epoch + 1}/10: accuracy=${(logs.acc * 100).toFixed(1)}%, loss=${logs.loss.toFixed(4)}`);
        }
      }
    });
    
    log(`✅ Дообучение завершено! Loss: ${history.history.loss[9].toFixed(4)}`);
    
    xsTensor.dispose();
    ysTensor.dispose();
    
    log('🧪 Тестирование...');
    const results = testModel(model, data.matches, data.teams, data.seasons);
    log(`📊 Точность Neuro: ${results.accuracy}%`);
    log(`📊 Точность Пуассон: ${results.poissonAccuracy}%`);
    log(`🚀 Улучшение: +${(results.accuracy - results.poissonAccuracy).toFixed(1)}%`);
    
    setTestResults(results);
    
    await model.save('localstorage://football-neuro-model');
    log('💾 Обновлённая модель сохранена');
    
    localStorage.setItem('neuro_last_trained', new Date().toISOString());
    localStorage.setItem('neuro_matches_count', totalMatches);
    
  } catch (error) {
    log(`❌ Ошибка: ${error.message}`);
    console.error(error);
  }
  
  setIsRetraining(false);
};
  
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Заголовок */}
      <div>
        <h2 className="text-2xl md:text-3xl font-bold mb-1 flex items-center gap-3">
          <Brain className="text-purple-400" />
          Neuro AI
        </h2>
        <p className="text-sm md:text-base text-gray-400">
          Нейросетевые модели прогнозирования угловых
        </p>
      </div>
      
      {/* Статус */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatusCard icon={Database} label="Матчей для обучения" value={totalMatches} color="blue" />
        <StatusCard icon={Brain} label="Статус модели" value={modelReady ? 'Готова' : 'Не обучена'} color="purple" />
        <StatusCard icon={Target} label="Точность Neuro" value={testResults ? `${testResults.accuracy}%` : '—'} color="green" />
        <StatusCard icon={TrendingUp} label="Улучшение" value={testResults ? `+${(testResults.accuracy - testResults.poissonAccuracy).toFixed(1)}%` : '—'} color="yellow" />
      </div>
      
      {/* Инфо о последнем обучении */}
      {modelReady && (
        <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700 flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="text-gray-400">
              🕐 Последнее обучение: <span className="text-white">{new Date(localStorage.getItem('neuro_last_trained') || Date.now()).toLocaleString('ru-RU')}</span>
            </span>
            <span className="text-gray-400">
              📊 Матчей при обучении: <span className="text-white">{localStorage.getItem('neuro_matches_count') || totalMatches}</span>
            </span>
          </div>
          {totalMatches > parseInt(localStorage.getItem('neuro_matches_count') || 0) && (
            <span className="text-yellow-400 text-xs">
              ⚠️ Добавлено {totalMatches - parseInt(localStorage.getItem('neuro_matches_count') || 0)} новых матчей. Рекомендуется дообучить!
            </span>
          )}
        </div>
      )}
      
      {/* Вкладки */}
      <div className="flex gap-2 flex-wrap">
        <TabButton active={activeTab === 'tensorflow'} onClick={() => setActiveTab('tensorflow')}>
          🧠 TensorFlow
        </TabButton>
        <TabButton active={activeTab === 'randomforest'} onClick={() => setActiveTab('randomforest')}>
          🌲 Random Forest
        </TabButton>
        <TabButton active={activeTab === 'xgboost'} onClick={() => setActiveTab('xgboost')}>
          ⚡ XGBoost
        </TabButton>
      </div>
      
      {/* Вкладка TensorFlow */}
      {activeTab === 'tensorflow' && (
        <div className="space-y-4">
          {/* Кнопка обучения */}
          <div className="bg-gray-800/50 rounded-xl p-6 border border-purple-700/50 text-center">
            <Brain size={48} className="mx-auto mb-4 text-purple-400" />
            <h3 className="text-xl font-bold mb-2">TensorFlow.js Нейросеть</h3>
            <p className="text-gray-400 mb-4 max-w-lg mx-auto">
              Глубокое обучение на 500+ матчах. Использует 20+ признаков для прогноза тотала угловых.
            </p>
            
            {!isTraining && !isRetraining && (
              <div className="flex gap-3 justify-center flex-wrap">
                <button
                  onClick={trainTensorFlowModel}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition flex items-center gap-2"
                >
                  <Play size={20} />
                  {modelReady ? 'Переобучить с нуля' : 'Обучить модель'}
                </button>
                
                {modelReady && (
                  <button
                    onClick={retrainModel}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 px-6 rounded-lg transition flex items-center gap-2"
                  >
                    <RefreshCw size={20} />
                    Дообучить
                  </button>
                )}
              </div>
            )}
            
            {isTraining && (
              <div className="text-center py-4">
                <RefreshCw size={32} className="mx-auto mb-2 animate-spin text-purple-400" />
                <p className="text-purple-400">Обучение нейросети с нуля...</p>
              </div>
            )}
            
            {isRetraining && (
              <div className="text-center py-4">
                <RefreshCw size={32} className="mx-auto mb-2 animate-spin text-green-400" />
                <p className="text-green-400">Дообучение нейросети...</p>
              </div>
            )}
          </div>
          
          {/* Лог обучения */}
          {trainingLog.length > 0 && (
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Activity size={16} className="text-green-400" />
                Лог обучения
              </h4>
              <div className="bg-gray-900 rounded-lg p-3 max-h-60 overflow-auto font-mono text-xs space-y-1">
                {trainingLog.map((entry, i) => (
                  <div key={i} className="text-gray-300">
                    <span className="text-gray-500">[{entry.time}]</span> {entry.text}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Результаты тестирования */}
          {testResults && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ResultCard 
                title="Neuro AI"
                accuracy={testResults.accuracy}
                correct={testResults.neuroCorrect}
                total={testResults.neuroTotal}
                color="purple"
              />
              <ResultCard 
                title="Пуассон"
                accuracy={testResults.poissonAccuracy}
                correct={testResults.poissonCorrect}
                total={testResults.poissonTotal}
                color="yellow"
              />
              <ResultCard 
                title="Гибрид (Neuro + Пуассон)"
                accuracy={testResults.hybridAccuracy}
                correct={testResults.hybridCorrect}
                total={testResults.hybridTotal}
                color="green"
                highlight
              />
            </div>
          )}
          
          {/* Инфо */}
          <div className="bg-blue-900/30 rounded-lg p-4 border border-blue-700">
            <p className="text-sm text-blue-300">
              💡 <strong>Как работает:</strong> Нейросеть анализирует 20+ параметров (угловые, xG, владение, 
              удары, форма команд) и учится находить закономерности которые Пуассон не видит. 
              Затем комбинируется с Пуассоном для максимальной точности.
            </p>
          </div>
          
          {/* 🔮 ФОРМА ПРЕДИКТА */}
          {modelReady && (
            <div className="bg-gray-800/50 rounded-xl p-6 border border-purple-700/50">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Calculator className="text-purple-400" />
                Прогноз нейросети
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Лига</label>
                  <select 
                    value={predictLeague}
                    onChange={(e) => { setPredictLeague(e.target.value); setPredictHomeTeam(''); setPredictAwayTeam(''); }}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm"
                  >
                    {data.leagues?.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Хозяева</label>
                  <select 
                    value={predictHomeTeam}
                    onChange={(e) => setPredictHomeTeam(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm"
                  >
                    <option value="">Выберите команду</option>
                    {teamsInLeague.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Гости</label>
                  <select 
                    value={predictAwayTeam}
                    onChange={(e) => setPredictAwayTeam(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm"
                  >
                    <option value="">Выберите команду</option>
                    {teamsInLeague.filter(t => t.id !== predictHomeTeam).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>
              
              <button
                onClick={predictWithNeuro}
                disabled={!predictHomeTeam || !predictAwayTeam || isPredicting}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPredicting ? (
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw size={18} className="animate-spin" />
                    Анализирую...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Brain size={18} />
                    Получить прогноз
                  </span>
                )}
              </button>
              
              {/* Результаты предикта */}
              {(neuroPrediction || poissonPrediction) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {/* Neuro */}
                  {neuroPrediction && (
                    <div className="bg-purple-900/20 rounded-lg p-4 border border-purple-700/50">
                      <h4 className="font-semibold text-purple-400 mb-3 flex items-center gap-2">
                        <Brain size={16} />
                        Neuro AI
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">ТБ 9.5</span>
                          <span className="text-lg font-bold text-green-400">{neuroPrediction.overProbability}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">ТМ 9.5</span>
                          <span className="text-lg font-bold text-red-400">{neuroPrediction.underProbability}%</span>
                        </div>
                        <div className="flex justify-between border-t border-gray-700 pt-2">
                          <span className="text-sm text-gray-400">Уверенность</span>
                          <span className="text-sm font-semibold">{neuroPrediction.confidence.toFixed(0)}%</span>
                        </div>
                        <div className={`mt-3 p-3 rounded-lg text-center font-semibold ${
                          neuroPrediction.recommendation.includes('СИЛЬНЫЙ') ? 'bg-green-600/30 text-green-400' :
                          neuroPrediction.recommendation.includes('ТБ') || neuroPrediction.recommendation.includes('ТМ') ? 'bg-blue-600/30 text-blue-400' :
                          'bg-gray-600/30 text-gray-400'
                        }`}>
                          {neuroPrediction.recommendation}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Пуассон */}
                  {poissonPrediction && (
                    <div className="bg-yellow-900/20 rounded-lg p-4 border border-yellow-700/50">
                      <h4 className="font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                        <Calculator size={16} />
                        Пуассон
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Ожидаемый тотал</span>
                          <span className="font-semibold">{poissonPrediction.totalExpected}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">ТБ 9.5</span>
                          <span className="text-lg font-bold text-green-400">{poissonPrediction.totalProbability}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">ТМ 9.5</span>
                          <span className="text-lg font-bold text-red-400">{poissonPrediction.underProbability}%</span>
                        </div>
                        <div className={`mt-3 p-3 rounded-lg text-center text-sm font-semibold ${
                          poissonPrediction.recommendation.includes('СИЛЬНЫЙ') ? 'bg-green-600/30 text-green-400' :
                          poissonPrediction.recommendation.includes('ТМ') ? 'bg-blue-600/30 text-blue-400' :
                          'bg-gray-600/30 text-gray-400'
                        }`}>
                          {poissonPrediction.recommendation}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Вкладка Random Forest (заглушка) */}
      {activeTab === 'randomforest' && (
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 text-center">
          <h3 className="text-xl font-bold mb-2">🌲 Random Forest</h3>
          <p className="text-gray-400 mb-4">
            Ансамблевый метод на основе деревьев решений. Будет добавлен в следующем обновлении.
          </p>
          <div className="text-4xl mb-4">🚧</div>
          <p className="text-sm text-gray-500">Нужно больше данных для этой модели (1000+ матчей)</p>
        </div>
      )}
      
      {/* Вкладка XGBoost (заглушка) */}
      {activeTab === 'xgboost' && (
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 text-center">
          <h3 className="text-xl font-bold mb-2">⚡ XGBoost</h3>
          <p className="text-gray-400 mb-4">
            Градиентный бустинг — одна из лучших ML моделей. Будет добавлен в следующем обновлении.
          </p>
          <div className="text-4xl mb-4">🚧</div>
          <p className="text-sm text-gray-500">Нужно больше данных для этой модели (2000+ матчей)</p>
        </div>
      )}
    </div>
  );
};

// 📦 Подготовка данных для обучения
const prepareTrainingData = (matches, teams, seasons) => {
  const sortedMatches = [...matches].sort((a, b) => new Date(a.date) - new Date(b.date));
  const trainingExamples = [];
  
  for (let i = 20; i < sortedMatches.length; i++) {
    const match = sortedMatches[i];
    
    const homePast = getLastMatches(sortedMatches, match.homeTeamId, match.date, 10);
    const awayPast = getLastMatches(sortedMatches, match.awayTeamId, match.date, 10);
    
    if (homePast.length < 3 || awayPast.length < 3) continue;
    
    const homeStats = calculateFeatures(homePast, match.homeTeamId);
    const awayStats = calculateFeatures(awayPast, match.awayTeamId);
    
    const actualTotal = (match.homeCorners || 0) + (match.awayCorners || 0);
    const label = actualTotal > 9.5 ? 1 : 0;
    
    trainingExamples.push({
      features: [
        homeStats.avgCornersFor,
        homeStats.avgCornersAgainst,
        homeStats.cornersTrend,
        homeStats.avgXG || 0,
        homeStats.avgPossession || 50,
        homeStats.avgShotsInside || 0,
        homeStats.formPoints,
        
        awayStats.avgCornersFor,
        awayStats.avgCornersAgainst,
        awayStats.cornersTrend,
        awayStats.avgXG || 0,
        awayStats.avgPossession || 50,
        awayStats.avgShotsInside || 0,
        awayStats.formPoints,
        
        homeStats.avgCornersForHome,
        homeStats.avgCornersAgainstHome,
        awayStats.avgCornersForAway,
        awayStats.avgCornersAgainstAway,
        
        match.round ? parseInt(match.round) || 0 : 0,
        homeStats.matchesPlayed,
        awayStats.matchesPlayed,
      ],
      label: label,
      actualTotal: actualTotal
    });
  }
  
  return trainingExamples;
};

const getLastMatches = (allMatches, teamId, beforeDate, count) => {
  return allMatches
    .filter(m => (m.homeTeamId === teamId || m.awayTeamId === teamId) && m.date < beforeDate)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, count);
};

const calculateFeatures = (matches, teamId) => {
  if (matches.length === 0) return {};
  
  let totalCornersFor = 0, totalCornersAgainst = 0;
  let cornersForHome = 0, cornersForAway = 0;
  let cornersAgainstHome = 0, cornersAgainstAway = 0;
  let homeCount = 0, awayCount = 0;
  let totalXG = 0, totalPossession = 0, totalShotsInside = 0;
  let cornersTrend = [];
  let formPoints = 0;
  
  matches.forEach(match => {
    const isHome = match.homeTeamId === teamId;
    const teamScore = isHome ? (match.homeScore || 0) : (match.awayScore || 0);
    const oppScore = isHome ? (match.awayScore || 0) : (match.homeScore || 0);
    
    const cornersFor = isHome ? (match.homeCorners || 0) : (match.awayCorners || 0);
    const cornersAgainst = isHome ? (match.awayCorners || 0) : (match.homeCorners || 0);
    
    if (isHome) {
      cornersForHome += cornersFor;
      cornersAgainstHome += cornersAgainst;
      homeCount++;
    } else {
      cornersForAway += cornersFor;
      cornersAgainstAway += cornersAgainst;
      awayCount++;
    }
    
    totalCornersFor += cornersFor;
    totalCornersAgainst += cornersAgainst;
    cornersTrend.push(cornersFor);
    
    totalXG += isHome ? (match.homeXG || 0) : (match.awayXG || 0);
    totalPossession += isHome ? (match.homePossession || 50) : (match.awayPossession || 50);
    totalShotsInside += isHome ? (match.homeShotsInsideBox || 0) : (match.awayShotsInsideBox || 0);
    
    if (teamScore > oppScore) formPoints += 3;
    else if (teamScore === oppScore) formPoints += 1;
  });
  
  const n = matches.length;
  
  const recentAvg = cornersTrend.slice(0, Math.floor(n / 2)).reduce((a, b) => a + b, 0) / Math.floor(n / 2);
  const olderAvg = cornersTrend.slice(Math.floor(n / 2)).reduce((a, b) => a + b, 0) / Math.ceil(n / 2);
  const trend = recentAvg - olderAvg;
  
  return {
    avgCornersFor: totalCornersFor / n,
    avgCornersAgainst: totalCornersAgainst / n,
    cornersTrend: trend,
    avgXG: totalXG / n,
    avgPossession: totalPossession / n,
    avgShotsInside: totalShotsInside / n,
    formPoints: formPoints,
    avgCornersForHome: homeCount > 0 ? cornersForHome / homeCount : totalCornersFor / n,
    avgCornersAgainstHome: homeCount > 0 ? cornersAgainstHome / homeCount : totalCornersAgainst / n,
    avgCornersForAway: awayCount > 0 ? cornersForAway / awayCount : totalCornersFor / n,
    avgCornersAgainstAway: awayCount > 0 ? cornersAgainstAway / awayCount : totalCornersAgainst / n,
    matchesPlayed: n
  };
};

const createModel = () => {
  const model = tf.sequential();
  
  model.add(tf.layers.dense({ units: 64, activation: 'relu', inputShape: [21] }));
  model.add(tf.layers.dropout({ rate: 0.2 }));
  model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
  model.add(tf.layers.dropout({ rate: 0.15 }));
  model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));
  
  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'binaryCrossentropy',
    metrics: ['accuracy']
  });
  
  return model;
};

const trainModel = async (model, trainingData, log) => {
  const xs = trainingData.map(d => d.features);
  const ys = trainingData.map(d => d.label);
  
  const xsTensor = tf.tensor2d(xs);
  const ysTensor = tf.tensor2d(ys, [ys.length, 1]);
  
  log('🔄 Запуск обучения (50 эпох)...');
  
  const history = await model.fit(xsTensor, ysTensor, {
    epochs: 50,
    batchSize: 16,
    validationSplit: 0.2,
    shuffle: true,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        if (epoch % 10 === 0 || epoch === 49) {
          log(`  Эпоха ${epoch + 1}/50: accuracy=${(logs.acc * 100).toFixed(1)}%, loss=${logs.loss.toFixed(4)}`);
        }
      }
    }
  });
  
  xsTensor.dispose();
  ysTensor.dispose();
  
  return {
    loss: history.history.loss[history.history.loss.length - 1],
    accuracy: history.history.acc[history.history.acc.length - 1] * 100
  };
};

const testModel = (model, matches, teams, seasons) => {
  const sortedMatches = [...matches].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  let neuroCorrect = 0, neuroTotal = 0;
  let poissonCorrect = 0, poissonTotal = 0;
  let hybridCorrect = 0, hybridTotal = 0;
  
  const testStart = Math.floor(sortedMatches.length * 0.8);
  
  for (let i = testStart; i < sortedMatches.length; i++) {
    const match = sortedMatches[i];
    const actualTotal = (match.homeCorners || 0) + (match.awayCorners || 0);
    const actualOver = actualTotal > 9.5;
    
    const homePast = getLastMatches(sortedMatches, match.homeTeamId, match.date, 10);
    const awayPast = getLastMatches(sortedMatches, match.awayTeamId, match.date, 10);
    if (homePast.length < 3 || awayPast.length < 3) continue;
    
    const homeStats = calculateFeatures(homePast, match.homeTeamId);
    const awayStats = calculateFeatures(awayPast, match.awayTeamId);
    
    const features = [
      homeStats.avgCornersFor, homeStats.avgCornersAgainst, homeStats.cornersTrend,
      homeStats.avgXG || 0, homeStats.avgPossession || 50, homeStats.avgShotsInside || 0,
      homeStats.formPoints,
      awayStats.avgCornersFor, awayStats.avgCornersAgainst, awayStats.cornersTrend,
      awayStats.avgXG || 0, awayStats.avgPossession || 50, awayStats.avgShotsInside || 0,
      awayStats.formPoints,
      homeStats.avgCornersForHome, homeStats.avgCornersAgainstHome,
      awayStats.avgCornersForAway, awayStats.avgCornersAgainstAway,
      match.round ? parseInt(match.round) || 0 : 0,
      homeStats.matchesPlayed, awayStats.matchesPlayed,
    ];
    
    const prediction = model.predict(tf.tensor2d([features])).dataSync()[0];
    const neuroOver = prediction > 0.5;
    
    if (neuroOver === actualOver) neuroCorrect++;
    neuroTotal++;
    
    const homeAvg = homeStats.avgCornersFor;
    const awayAvg = awayStats.avgCornersFor;
    const totalExpected = (homeAvg + awayAvg) * 0.9;
    const poissonOver = totalExpected > 9.5;
    
    if (poissonOver === actualOver) poissonCorrect++;
    poissonTotal++;
    
    const hybridProb = (prediction * 0.4) + ((totalExpected > 9.5 ? 0.6 : 0.4) * 0.6);
    const hybridOver = hybridProb > 0.5;
    
    if (hybridOver === actualOver) hybridCorrect++;
    hybridTotal++;
  }
  
  return {
    neuroCorrect, neuroTotal,
    accuracy: neuroTotal > 0 ? ((neuroCorrect / neuroTotal) * 100).toFixed(1) : '0.0',
    poissonCorrect, poissonTotal,
    poissonAccuracy: poissonTotal > 0 ? ((poissonCorrect / poissonTotal) * 100).toFixed(1) : '0.0',
    hybridCorrect, hybridTotal,
    hybridAccuracy: hybridTotal > 0 ? ((hybridCorrect / hybridTotal) * 100).toFixed(1) : '0.0',
  };
};

const StatusCard = ({ icon: Icon, label, value, color }) => {
  const colors = { blue: 'text-blue-400', green: 'text-green-400', yellow: 'text-yellow-400', purple: 'text-purple-400' };
  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
      <Icon className={`${colors[color]} mb-2`} size={20} />
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
};

const TabButton = ({ active, onClick, children }) => (
  <button onClick={onClick} className={`px-4 py-2 rounded-lg text-sm transition ${active ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
    {children}
  </button>
);

const ResultCard = ({ title, accuracy, correct, total, color, highlight }) => {
  const colors = { purple: 'text-purple-400', yellow: 'text-yellow-400', green: 'text-green-400' };
  return (
    <div className={`bg-gray-800 rounded-xl p-4 border ${highlight ? 'border-green-700' : 'border-gray-700'}`}>
      <h4 className={`font-semibold mb-2 ${colors[color]}`}>{title}</h4>
      <div className={`text-3xl font-bold ${colors[color]}`}>{accuracy}%</div>
      <p className="text-xs text-gray-400 mt-1">{correct}/{total} верно</p>
    </div>
  );
};

export default Neuro;