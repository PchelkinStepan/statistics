import { useState } from 'react';
import LoginModal from './LoginModal';

const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem('admin_authenticated') === 'true'
  );

  if (!isAuthenticated) {
    return <LoginModal onLogin={setIsAuthenticated} />;
  }

  return children;
};

export default ProtectedRoute;