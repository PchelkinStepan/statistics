import { useState, useEffect, useRef } from 'react';
import { Upload, Brain, TreePine, Zap, Check, X, RefreshCw, Save } from 'lucide-react';
import { getData } from '../../data/store';
import {
  getLastMatches,
  calculateFeatures,
  buildFeatures,
  getLeagueAvgTotal,
} from './neuroFeatures';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const ModelSandbox = () => {
  const data = getData();
  const [uploadedModel, setUploadedModel] = useState(null);
  const [uploadedModelType, setUploadedModelType] = useState(null);
  const [uploadedModelName, setUploadedModelName] = useState('');
  const [comparisonResults, setComparisonResults] = useState(null);
  const [isComparing, setIsComparing] = useState(false);
  const [maeHistory, setMaeHistory] = useState([]);
  const fileInputRef = useRef(null);

  const [predictLeague, setPredictLeague] = useState(data.leagues?.[0]?.id || 'rpl');
  const [predictHomeTeam, setPredictHomeTeam] = useState('');
  const [predictAwayTeam, setPredictAwayTeam] = useState('');
  const [selectedTotal, setSelectedTotal] = useState(9.5);

  const teamsInLeague = data.teams?.filter((t) => t.leagueId === predictLeague) || [];

  // Загрузка модели из JSON
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        
        // Определяем тип модели по содержимому
        if (json.neuro_rf_model_json || json.trees) {
          setUploadedModelType('rf');
          setUploadedModelName('Random Forest');
          setUploadedModel(json.neuro_rf_model_json || json);
        } else if (json.neuro_xgb_model_json || (json.learningRate !== undefined)) {
          setUploadedModelType('xgb');
          setUploadedModelName('XGBoost');
          setUploadedModel(json.neuro_xgb_model_json || json);
        } else if (json.modelTopology || json.model_metadata) {
          setUploadedModelType('tf');
          setUploadedModelName('TensorFlow');
          setUploadedModel(json);
        } else {
          alert('❌ Не удалось определить тип модели. Убедитесь, что файл содержит модель RF, XGB или TF.');
        }
        
        setComparisonResults(null);
        setMaeHistory([]);
      } catch (error) {
        alert('❌ Ошибка чтения файла: ' + error.message);
      }
    };
    reader.readAsText(file);
  };

  // Получение прогноза от загруженной модели
  const predictWithUploaded = (features) => {
    if (!uploadedModel) return null;
    
    try {
      if (uploadedModelType === 'rf') {
        const modelData = typeof uploadedModel === 'string' ? JSON.parse(uploadedModel) : uploadedModel;
        if (!modelData.trees || modelData.trees.length === 0) return null;
        
        const predictTree = (node, x) => {
          if (node.type === 'leaf') return node.value;
          return x[node.feature] <= node.threshold
            ? predictTree(node.left, x)
            : predictTree(node.right, x);
        };
        
        let sum = 0;
        for (const tree of modelData.trees) {
          sum += predictTree(tree, features);
        }
        return sum / modelData.trees.length;
      }
      
      if (uploadedModelType === 'xgb') {
        const modelData = typeof uploadedModel === 'string' ? JSON.parse(uploadedModel) : uploadedModel;
        if (!modelData.trees || modelData.trees.length === 0) return null;
        
        const predictTree = (node, x) => {
          if (node.type === 'leaf') return node.value;
          return x[node.feature] <= node.threshold
            ? predictTree(node.left, x)
            : predictTree(node.right, x);
        };
        
        let sum = 0;
        for (const tree of modelData.trees) {
          sum += (modelData.learningRate || 0.1) * predictTree(tree, features);
        }
        return sum;
      }
      
      return null;
    } catch (e) {
      console.error('Uploaded model predict error:', e);
      return null;
    }
  };

  // Получение прогноза от текущей (сохранённой) модели
  const predictWithCurrent = (features, type) => {
    try {
      if (type === 'rf') {
        const raw = localStorage.getItem('neuro_rf_model_json');
        if (!raw) return null;
        const modelData = JSON.parse(raw);
        if (!modelData.trees || modelData.trees.length === 0) return null;
        
        const predictTree = (node, x) => {
          if (node.type === 'leaf') return node.value;
          return x[node.feature] <= node.threshold
            ? predictTree(node.left, x)
            : predictTree(node.right, x);
        };
        
        let sum = 0;
        for (const tree of modelData.trees) {
          sum += predictTree(tree, features);
        }
        return sum / modelData.trees.length;
      }
      
      if (type === 'xgb') {
        const raw = localStorage.getItem('neuro_xgb_model_json');
        if (!raw) return null;
        const modelData = JSON.parse(raw);
        if (!modelData.trees || modelData.trees.length === 0) return null;
        
        const predictTree = (node, x) => {
          if (node.type === 'leaf') return node.value;
          return x[node.feature] <= node.threshold
            ? predictTree(node.left, x)
            : predictTree(node.right, x);
        };
        
        let sum = 0;
        for (const tree of modelData.trees) {
          sum += (modelData.learningRate || 0.1) * predictTree(tree, features);
        }
        return sum;
      }
      
      return null;
    } catch (e) {
      console.error('Current model predict error:', e);
      return null;
    }
  };

  // Сравнение моделей на исторических данных
  const compareModels = async () => {
    if (!uploadedModel || !predictHomeTeam || !predictAwayTeam) return;
    setIsComparing(true);
    setComparisonResults(null);
    
    try {
      const allMatches = [...(data.matches || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
      const homePast = getLastMatches(allMatches, predictHomeTeam, new Date().toISOString(), 12);
      const awayPast = getLastMatches(allMatches, predictAwayTeam, new Date().toISOString(), 12);
      
      if (homePast.length < 3 || awayPast.length < 3) {
        setIsComparing(false);
        return;
      }
      
      const homeStats = calculateFeatures(homePast, predictHomeTeam);
      const awayStats = calculateFeatures(awayPast, predictAwayTeam);
      const features = buildFeatures(homeStats, awayStats, 0, getLeagueAvgTotal(predictLeague, data.seasons));
      
      // Прогноз загруженной модели
      const uploadedPred = predictWithUploaded(features);
      
      // Прогноз текущей модели (того же типа)
      const currentPred = predictWithCurrent(features, uploadedModelType);
      
      // Сравнение на исторических данных (последние 50 матчей)
      const testMatches = allMatches.slice(-50);
      let uploadedErrors = [];
      let currentErrors = [];
      
      for (const match of testMatches) {
        const actualTotal = (match.homeCorners || 0) + (match.awayCorners || 0);
        const hPast = getLastMatches(allMatches, match.homeTeamId, match.date, 12);
        const aPast = getLastMatches(allMatches, match.awayTeamId, match.date, 12);
        if (hPast.length < 5 || aPast.length < 5) continue;
        
        const hStats = calculateFeatures(hPast, match.homeTeamId);
        const aStats = calculateFeatures(aPast, match.awayTeamId);
        const feat = buildFeatures(hStats, aStats, 0, getLeagueAvgTotal(match.leagueId, data.seasons));
        
        const up = predictWithUploaded(feat);
        const cp = predictWithCurrent(feat, uploadedModelType);
        
        if (up !== null) uploadedErrors.push(Math.abs(up - actualTotal));
        if (cp !== null) currentErrors.push(Math.abs(cp - actualTotal));
      }
      
      const uploadedMae = uploadedErrors.length > 0
        ? (uploadedErrors.reduce((a, b) => a + b, 0) / uploadedErrors.length).toFixed(2)
        : null;
      
      const currentMae = currentErrors.length > 0
        ? (currentErrors.reduce((a, b) => a + b, 0) / currentErrors.length).toFixed(2)
        : null;
      
      setComparisonResults({
        uploadedPrediction: uploadedPred !== null ? Math.max(2, Math.min(18, uploadedPred)).toFixed(2) : null,
        currentPrediction: currentPred !== null ? Math.max(2, Math.min(18, currentPred)).toFixed(2) : null,
        uploadedMae,
        currentMae,
        testCount: Math.min(uploadedErrors.length, currentErrors.length),
      });
      
      // График MAE (история)
      const history = [];
      for (let i = 0; i < Math.min(uploadedErrors.length, currentErrors.length); i++) {
        history.push({
          match: i + 1,
          uploaded: uploadedErrors[i],
          current: currentErrors[i],
        });
      }
      setMaeHistory(history);
      
    } catch (error) {
      console.error('Comparison error:', error);
    }
    setIsComparing(false);
  };

  // Активация загруженной модели
  const activateModel = () => {
    if (!uploadedModel) return;
    
    if (!window.confirm(`Активировать загруженную модель ${uploadedModelName}? Текущая модель будет заменена.`)) return;
    
    try {
      if (uploadedModelType === 'rf') {
        const modelData = typeof uploadedModel === 'string' ? JSON.parse(uploadedModel) : uploadedModel;
        localStorage.setItem('neuro_rf_model_json', JSON.stringify(modelData));
        localStorage.setItem('neuro_rf_meta', JSON.stringify({ mae: comparisonResults?.uploadedMae || '—', total: comparisonResults?.testCount || 0 }));
        alert('✅ Random Forest обновлён!');
      } else if (uploadedModelType === 'xgb') {
        const modelData = typeof uploadedModel === 'string' ? JSON.parse(uploadedModel) : uploadedModel;
        localStorage.setItem('neuro_xgb_model_json', JSON.stringify(modelData));
        localStorage.setItem('neuro_xgb_meta', JSON.stringify({ mae: comparisonResults?.uploadedMae || '—', total: comparisonResults?.testCount || 0 }));
        alert('✅ XGBoost обновлён!');
      } else if (uploadedModelType === 'tf') {
        // Для TF нужно импортировать модель через tf.loadGraphModel или tf.loadLayersModel
        alert('⚠️ Активация TensorFlow из файла пока не поддерживается. Используйте кнопку "Загрузить" в TensorFlow вкладке.');
        return;
      }
      
      setUploadedModel(null);
      setUploadedModelType(null);
      setUploadedModelName('');
      setComparisonResults(null);
      setMaeHistory([]);
    } catch (error) {
      alert('❌ Ошибка активации: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-800/50 rounded-xl p-6 border border-yellow-700/50">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Upload className="text-yellow-400" /> Песочница
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          Загрузите модель (JSON-файл) и сравните её с текущей. Если новая модель лучше — активируйте её.
        </p>
        
        <div className="flex flex-wrap gap-4 mb-6">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-3 px-6 rounded-lg flex items-center gap-2"
          >
            <Upload size={20} /> Загрузить модель
          </button>
          
          {uploadedModel && (
            <div className="flex items-center gap-2 bg-gray-700/50 rounded-lg px-4 py-2">
              <Brain size={18} className="text-yellow-400" />
              <span className="text-sm font-medium">{uploadedModelName}</span>
              <button
                type="button"
                onClick={() => {
                  setUploadedModel(null);
                  setUploadedModelType(null);
                  setUploadedModelName('');
                  setComparisonResults(null);
                  setMaeHistory([]);
                }}
                className="p-1 text-red-400 hover:bg-red-600/20 rounded"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
        
        {uploadedModel && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Лига</label>
                <select value={predictLeague} onChange={(e) => { setPredictLeague(e.target.value); setPredictHomeTeam(''); setPredictAwayTeam(''); }}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm">
                  {data.leagues?.map((l) => (<option key={l.id} value={l.id}>{l.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Хозяева</label>
                <select value={predictHomeTeam} onChange={(e) => setPredictHomeTeam(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm">
                  <option value="">Выберите</option>
                  {teamsInLeague.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Гости</label>
                <select value={predictAwayTeam} onChange={(e) => setPredictAwayTeam(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm">
                  <option value="">Выберите</option>
                  {teamsInLeague.filter((t) => t.id !== predictHomeTeam).map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
                </select>
              </div>
            </div>
            
            <button
              type="button"
              onClick={compareModels}
              disabled={!predictHomeTeam || !predictAwayTeam || isComparing}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg disabled:opacity-50 mb-4"
            >
              {isComparing ? 'Сравниваю...' : '⚖️ Сравнить с текущей моделью'}
            </button>
            
            {comparisonResults && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-yellow-900/20 rounded-xl p-4 border border-yellow-700/50">
                    <h4 className="text-sm font-semibold text-yellow-400 mb-2 flex items-center gap-2">
                      <Upload size={16} /> Загруженная модель
                    </h4>
                    <div className="text-center">
                      <p className="text-xs text-gray-400 mb-1">Прогноз тотала</p>
                      <p className="text-2xl font-bold text-white">{comparisonResults.uploadedPrediction || '—'}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        MAE на {comparisonResults.testCount} матчах: <span className="text-yellow-400 font-bold">{comparisonResults.uploadedMae || '—'}</span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-blue-900/20 rounded-xl p-4 border border-blue-700/50">
                    <h4 className="text-sm font-semibold text-blue-400 mb-2 flex items-center gap-2">
                      <Brain size={16} /> Текущая модель
                    </h4>
                    <div className="text-center">
                      <p className="text-xs text-gray-400 mb-1">Прогноз тотала</p>
                      <p className="text-2xl font-bold text-white">{comparisonResults.currentPrediction || '—'}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        MAE на {comparisonResults.testCount} матчах: <span className="text-blue-400 font-bold">{comparisonResults.currentMae || '—'}</span>
                      </p>
                    </div>
                  </div>
                </div>
                
                {comparisonResults.uploadedMae && comparisonResults.currentMae && (
                  <div className={`p-4 rounded-lg text-center font-semibold ${
                    parseFloat(comparisonResults.uploadedMae) < parseFloat(comparisonResults.currentMae)
                      ? 'bg-green-600/30 text-green-400'
                      : parseFloat(comparisonResults.uploadedMae) > parseFloat(comparisonResults.currentMae)
                        ? 'bg-red-600/30 text-red-400'
                        : 'bg-yellow-600/30 text-yellow-400'
                  }`}>
                    {parseFloat(comparisonResults.uploadedMae) < parseFloat(comparisonResults.currentMae)
                      ? '✅ Загруженная модель точнее на ' + (parseFloat(comparisonResults.currentMae) - parseFloat(comparisonResults.uploadedMae)).toFixed(2) + ' угловых'
                      : parseFloat(comparisonResults.uploadedMae) > parseFloat(comparisonResults.currentMae)
                        ? '❌ Текущая модель точнее на ' + (parseFloat(comparisonResults.uploadedMae) - parseFloat(comparisonResults.currentMae)).toFixed(2) + ' угловых'
                        : '⚖️ Модели одинаковы'}
                  </div>
                )}
                
                {maeHistory.length > 0 && (
                  <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                    <h4 className="text-sm font-semibold mb-3">📊 Сравнение MAE по матчам</h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={maeHistory}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="match" stroke="#9CA3AF" fontSize={10} />
                        <YAxis stroke="#9CA3AF" fontSize={10} />
                        <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }} />
                        <Line type="monotone" dataKey="uploaded" stroke="#EAB308" name="Загруженная" dot={false} strokeWidth={2} />
                        <Line type="monotone" dataKey="current" stroke="#3B82F6" name="Текущая" dot={false} strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                
                <button
                  type="button"
                  onClick={activateModel}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2"
                >
                  <Save size={18} /> Активировать загруженную модель
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ModelSandbox;
