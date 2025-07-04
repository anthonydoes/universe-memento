import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import LoginForm from './components/LoginForm';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    const authStatus = localStorage.getItem('universe-auth');
    if (authStatus === 'authenticated') {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (success) => {
    setIsAuthenticated(success);
  };

  const handleLogout = () => {
    localStorage.removeItem('universe-auth');
    setIsAuthenticated(false);
  };

  // Show loading spinner during initial auth check
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return <LoginForm onLogin={handleLogin} />;
  }

  // Show dashboard if authenticated
  return <Dashboard onLogout={handleLogout} />;
}

export default App;