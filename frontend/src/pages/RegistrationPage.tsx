import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';

const RegistrationPage: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('accounts/register/', { username, email, password });
      setSuccess('Регистрация прошла успешно! Теперь вы можете войти.');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      if (err.response && err.response.data) {
        const errors = err.response.data;
        if (errors.username) {
          setError(`Имя пользователя: ${errors.username.join(', ')}`);
        } else if (errors.email) {
          setError(`Email: ${errors.email.join(', ')}`);
        } else if (errors.password) {
          setError(`Пароль: ${errors.password.join(', ')}`);
        } else {
          setError('Ошибка при регистрации. Проверьте данные.');
        }
      } else {
        setError('Ошибка при регистрации. Попробуйте позже.');
      }
    }
  };

  return (
    <div className="container mt-5">
      <h2>Регистрация</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      <form onSubmit={handleRegister}>
        <div className="mb-3">
          <label className="form-label">Имя пользователя</label>
          <input
            type="text"
            className="form-control"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="mb-3">
          <label className="form-label">Email</label>
          <input
            type="email"
            className="form-control"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="mb-3">
          <label className="form-label">Пароль</label>
          <input
            type="password"
            className="form-control"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary">Зарегистрироваться</button>
        <a href="http://localhost:3000/login" style={{color: 'inherit', textDecoration: 'underline'}}>У вас есть аккаунта, хотите войти ?</a>
      </form>
    </div>
  );
};

export default RegistrationPage;