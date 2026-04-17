import { useState } from 'react';
import { Lock } from 'lucide-react';

const LoginModal = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === import.meta.env.VITE_ADMIN_PASSWORD) {
      localStorage.setItem('admin_authenticated', 'true');
      onLogin(true);
    } else {
      setError('Неверный пароль');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-8 rounded-xl w-full max-w-md border border-gray-700">
        <div className="flex justify-center mb-6">
          <div className="bg-blue-600 p-3 rounded-full">
            <Lock size={32} />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center mb-6">Вход в Админку</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Пароль"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white mb-4 focus:outline-none focus:border-blue-500"
            autoFocus
          />
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition"
          >
            Войти
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;