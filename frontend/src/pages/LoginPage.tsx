import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient'; // Используем глобальный apiClient

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await apiClient.post('accounts/login/', { username, password });
      navigate('/dashboard');
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Неверное имя пользователя или пароль');
      } else {
        setError('Ошибка входа. Попробуйте снова.');
      }
    }
  };

  return (
    <div className="container mt-5">
    <div>
      <h2>Вход</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleLogin}>
        <div className="mb-3">
          <label className="form-label">Имя пользователя:</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="mb-3">
          <label className="form-label">Пароль:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
         <div className="mb-3"><button type="submit" className="btn btn-primary">Войти</button></div>
        <a href="http://localhost:3000/register" style={{color: 'inherit', textDecoration: 'underline'}}>У вас нет аккаунта, хотите зарегестрироваться ?</a>
      </form>
    </div>
    </div>
  );
};

export default LoginPage;