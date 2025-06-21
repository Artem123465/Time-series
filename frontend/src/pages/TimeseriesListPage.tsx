import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';

interface Timeseries {
  id: number;
  name: string;
}

const TimeseriesListPage: React.FC = () => {
  const [timeseriesList, setTimeseriesList] = useState<Timeseries[]>([]);
  const [error, setError] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTimeseries = async () => {
      try {
        const response = await apiClient.get('/timeseries/');
        setTimeseriesList(response.data);
      } catch (err) {
        setError('Ошибка при загрузке временных рядов');
      }
    };
    fetchTimeseries();
  }, []);

  const handleEdit = (id: number) => {
    navigate(`/timeseries-editor/${id}`);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Вы уверены, что хотите удалить этот временной ряд?')) {
      try {
        await apiClient.delete(`/timeseries/${id}/`);
        setTimeseriesList(timeseriesList.filter(ts => ts.id !== id));
      } catch (err) {
        setError('Ошибка при удалении временного ряда');
      }
    }
  };

  return (
    <div className="container mt-5">
      <h2>Мои временные ряды</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      <table className="table table-striped">
        <thead>
          <tr>
            <th>Название</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {timeseriesList.map(ts => (
            <tr key={ts.id}>
              <td>{ts.name}</td>
              <td>
                <i
                className="bi bi-pencil text-primary"
                style={{ cursor: 'pointer' }}
                onClick={() => handleEdit(ts.id)}
                />
                <i
                className="bi bi-trash text-danger"
                style={{ cursor: 'pointer' }}
                onClick={() => handleDelete(ts.id)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TimeseriesListPage;