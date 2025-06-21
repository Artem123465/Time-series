import React, { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import { Table } from 'react-bootstrap';

interface ForecastMetric {
  name: string;
  value: number;
}

interface ForecastRun {
  id: number;
  timeseries: string | { name: string } | null;
  created_at?: string;
  metrics: ForecastMetric[];
  script_name: string;
  csv_file_name?: string | null;
  benchmark_id?: string;
}

const BenchmarkComparisonPage: React.FC = () => {
  const [results, setResults] = useState<ForecastRun[]>([]);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchBenchmarkResults = async () => {
      try {
        const response = await apiClient.get('/forecasting/benchmark-results/');
        setResults(response.data);
      } catch (err: any) {
       const errorMsg = err.response?.data?.error || 'Ошибка при выполнение бенчмарка';
        console.error(errorMsg);
      }
    };
    fetchBenchmarkResults();
  }, []);

  const getDataSourceName = (run: ForecastRun) => {
    if (run.timeseries) {
      return typeof run.timeseries === 'string' ? run.timeseries : run.timeseries.name || '-';
    }
    return run.csv_file_name || '-';
  };

  const normalizeMetric = (
    value: number,
    minValue: number,
    maxValue: number,
    isHigherBetter: boolean = false
  ): number => {
    if (maxValue === minValue) return 1;
    return isHigherBetter
      ? (value - minValue) / (maxValue - minValue)
      : (maxValue - value) / (maxValue - minValue);
  };

  const calculateRating = (metrics: Record<string, number>): string => {
    const weights = {
      MAE: 0.4,
      RMSE: 0.3,
      R2: 0.2,
      duration: 0.05,
      memory_peak_mb: 0.05,
    };

    const metricValues: Record<string, number[]> = {
      MAE: [],
      RMSE: [],
      R2: [],
      duration: [],
      memory_peak_mb: [],
    };

    results.forEach((run) => {
      const runMetrics = run.metrics.reduce((acc, metric) => ({
        ...acc,
        [metric.name]: metric.value,
      }), {} as Record<string, number>);
      Object.keys(metricValues).forEach((key) => {
        if (runMetrics[key] !== undefined) {
          metricValues[key].push(runMetrics[key]);
        }
      });
    });

    const minMax = Object.keys(metricValues).reduce((acc, key) => ({
      ...acc,
      [key]: {
        min: Math.min(...metricValues[key]),
        max: Math.max(...metricValues[key]),
      },
    }), {} as Record<string, { min: number; max: number }>);

    const normalized = {
      MAE: normalizeMetric(metrics.MAE || 0, minMax.MAE.min, minMax.MAE.max),
      RMSE: normalizeMetric(metrics.RMSE || 0, minMax.RMSE.min, minMax.RMSE.max),
      R2: normalizeMetric(metrics.R2 || 0, minMax.R2.min, minMax.R2.max, true),
      duration: normalizeMetric(metrics.duration || 0, minMax.duration.min, minMax.duration.max),
      memory_peak_mb: normalizeMetric(metrics.memory_peak_mb || 0, minMax.memory_peak_mb.min, minMax.memory_peak_mb.max),
    };

    const rating =
      normalized.MAE * weights.MAE +
      normalized.RMSE * weights.RMSE +
      normalized.R2 * weights.R2 +
      normalized.duration * weights.duration +
      normalized.memory_peak_mb * weights.memory_peak_mb;

    return (rating * 100).toFixed(2);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Вы уверены, что хотите удалить этот запуск?')) {
      try {
        await apiClient.delete(`/forecast-runs/${id}/`);
        setResults(prevResults => prevResults.filter(run => run.id !== id));
      } catch (err) {
        setError('Ошибка при удалении запуска');
      }
    }
  };

  const groupedResults = results.reduce((acc, run) => {
    const key = run.benchmark_id || 'unknown';
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(run);
    return acc;
  }, {} as Record<string, ForecastRun[]>);

  return (
    <div className="container mt-5">
      <h2>Сравнение результатов бенчмаркинга</h2>
      {error && <div className="alert alert-danger">{error} <a href="http://localhost:3000/instructions" style={{color: 'inherit', textDecoration: 'underline'}}>посмотри инструкцию</a></div>}
      {Object.entries(groupedResults).map(([benchmarkId, runs]) => (
        <div key={benchmarkId} className="mb-5">
          <h4>Бенчмаркинг:</h4>
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>Скрипт</th>
                <th>Источник данных</th>
                <th>Дата запуска</th>
                <th>MAE</th>
                <th>RMSE</th>
                <th>R²</th>
                <th>Время (сек)</th>
                <th>Память (МБ)</th>
                <th>Рейтинг (%)</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => {
                const metrics = run.metrics.reduce((acc, metric) => ({
                  ...acc,
                  [metric.name]: metric.value,
                }), {} as Record<string, number>);

                return (
                  <tr key={run.id}>
                    <td>{run.script_name || '-'}</td>
                    <td>{getDataSourceName(run)}</td>
                    <td>{run.created_at ? new Date(run.created_at).toLocaleString() : '-'}</td>
                    <td>{metrics['MAE']?.toFixed(4) || '-'}</td>
                    <td>{metrics['RMSE']?.toFixed(4) || '-'}</td>
                    <td>{metrics['R2']?.toFixed(4) || '-'}</td>
                    <td>{metrics['duration']?.toFixed(2) || '-'}</td>
                    <td>{metrics['memory_peak_mb']?.toFixed(2) || '-'}</td>
                    <td>{calculateRating(metrics)}</td>
                    <td>
                      <i
                        className="bi bi-trash text-danger"
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleDelete(run.id)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      ))}
    </div>
  );
};

export default BenchmarkComparisonPage;