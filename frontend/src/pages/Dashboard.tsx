import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import apiClient from '../api/apiClient';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface ForecastResult {
  script: string;
  forecast: { ds: string; yhat: number }[];
  metrics: {
    MAE: number;
    RMSE: number;
    R2: number;
    duration: number;
    memory_peak_mb: number;
  };
  error?: string;
}

const parseDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toISOString().split('T')[0]; // Возвращает 'YYYY-MM-DD'
};

const Dashboard: React.FC = () => {
  const [forecastResults, setForecastResults] = useState<ForecastResult[]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [scriptFiles, setScriptFiles] = useState<File[]>([]);
  const [error, setError] = useState<string>('');
  const [dataSource, setDataSource] = useState<'upload' | 'existing'>('upload');
  const [selectedTimeseriesId, setSelectedTimeseriesId] = useState<number | null>(null);
  const [timeseriesList, setTimeseriesList] = useState<{ id: number; name: string }[]>([]);
  const [dateColumn, setDateColumn] = useState<string>('');
  const [numericColumn, setNumericColumn] = useState<string>('');
  const [csvColumns, setCsvColumns] = useState<string[]>([]); // Состояние для столбцов CSV

  useEffect(() => {
    const fetchTimeseries = async () => {
      try {
        const response = await apiClient.get('timeseries/');
        setTimeseriesList(response.data);
      } catch (err) {
        console.error('Ошибка при загрузке временных рядов');
      }
    };
    fetchTimeseries();
  }, []);

  // Обработчик загрузки CSV с получением столбцов
  const handleCsvFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setCsvFile(file);
      // Сбрасываем предыдущие выборы столбцов
      setDateColumn('');
      setNumericColumn('');
      
      // Получаем столбцы из файла
      const formData = new FormData();
      formData.append('file', file);
      try {
        const response = await apiClient.post('/forecasting/get_csv_columns/', formData);
        setCsvColumns(response.data.columns);
      } catch (err) {
        setError(`Ошибка при загрузке столбцов для ${file.name}`);
        setCsvColumns([]);
      }
    } else {
      setCsvFile(null);
      setCsvColumns([]);
    }
  };

  const handleScriptsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setScriptFiles(filesArray);
    }
  };

  const runForecast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dataSource === 'upload' && !csvFile) {
      setError('Выберите CSV файл с данными для прогноза.');
      return;
    }
    if (dataSource === 'existing' && !selectedTimeseriesId) {
      setError('Выберите временной ряд для прогноза.');
      return;
    }
    if (scriptFiles.length === 0) {
      setError('Загрузите хотя бы один python-скрипт для прогнозирования.');
      return;
    }
    if (dataSource === 'upload' && (!dateColumn || !numericColumn)) {
      setError('Укажите столбцы для дат и значений для CSV-файла.');
      return;
    }
    setError('');

    const formData = new FormData();
    if (dataSource === 'upload' && csvFile) {
      formData.append('data_file', csvFile);
      formData.append('date_column', dateColumn);
      formData.append('numeric_column', numericColumn);
    } else if (dataSource === 'existing' && selectedTimeseriesId) {
      formData.append('timeseries_id', selectedTimeseriesId.toString());
    }
    scriptFiles.forEach((script) => {
      formData.append('scripts', script);
    });

    try {
      const response = await apiClient.post('forecasting/run/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setForecastResults(response.data.results);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Ошибка при выполнение прогнозирования';
      setError(errorMsg);
    }
  };

  return (
    <div className="container mt-5">
      <h2>Панель управления прогнозами</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={runForecast}>
        <div className="mb-3">
          <label className="form-label">Python-скрипты для прогнозирования</label>
          <input
            type="file"
            className="form-control"
            onChange={handleScriptsChange}
            accept=".py"
            multiple
            required
          />
        </div>
        <div className="mb-3">
          <label className="form-label">Источник данных</label>
          <div>
            <div className="form-check">
              <input
                type="radio"
                className="form-check-input"
                id="uploadCsv"
                checked={dataSource === 'upload'}
                onChange={() => setDataSource('upload')}
              />
              <label className="form-check-label" htmlFor="uploadCsv">
                Загрузить CSV
              </label>
            </div>
            <div className="form-check">
              <input
                type="radio"
                className="form-check-input"
                id="selectExisting"
                checked={dataSource === 'existing'}
                onChange={() => setDataSource('existing')}
              />
              <label className="form-check-label" htmlFor="selectExisting">
                Выбрать существующий временной ряд
              </label>
            </div>
          </div>
        </div>
        {dataSource === 'upload' && (
          <>
            <div className="mb-3">
              <label className="form-label">CSV файл с данными</label>
              <input
                type="file"
                className="form-control"
                onChange={handleCsvFileChange}
                accept=".csv"
              />
            </div>
            
            {csvFile && csvColumns.length > 0 && (
              <>
                <div className="mb-3">
                  <label className="form-label">Столбец с датами</label>
                  <select
                    className="form-select"
                    value={dateColumn}
                    onChange={(e) => setDateColumn(e.target.value)}
                    required
                  >
                    <option value="">-- Выберите --</option>
                    {csvColumns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Числовой столбец</label>
                  <select
                    className="form-select"
                    value={numericColumn}
                    onChange={(e) => setNumericColumn(e.target.value)}
                    required
                  >
                    <option value="">-- Выберите --</option>
                    {csvColumns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </>
        )}
        {dataSource === 'existing' && (
          <div className="mb-3">
            <label className="form-label">Выберите временной ряд</label>
            <select
              className="form-select"
              value={selectedTimeseriesId || ''}
              onChange={(e) => setSelectedTimeseriesId(Number(e.target.value))}
            >
              <option value="">-- Выберите --</option>
              {timeseriesList.map((ts) => (
                <option key={ts.id} value={ts.id}>{ts.name}</option>
              ))}
            </select>
          </div>
        )}
        <button type="submit" className="btn btn-primary">
          Запустить прогноз
        </button>
      </form>
      <a href="/api/forecasting/template/" download="forecast_script_template.py" className="btn btn-link mt-3">
        Скачать шаблон скрипта
      </a>

      {forecastResults.length > 0 && (
        <div className="mt-5">
          <h4>Результаты прогнозирования</h4>
          {forecastResults.map((result, index) => (
            <div key={index} className="mb-5 border p-3">
              <h5>Скрипт: {result.script}</h5>
              {result.error ? (
                <div className="alert alert-danger">Ошибка: {result.error} <a href="http://localhost:3000/instructions" style={{color: 'inherit', textDecoration: 'underline'}}>посмотри инструкцию</a> </div>
              ) : (
                <>
                  <Line
                    data={{
                      labels: result.forecast.map((item) => parseDate(item.ds)),
                      datasets: [
                        {
                          label: 'Прогноз',
                          data: result.forecast.map((item) => item.yhat),
                          borderColor: 'rgba(75,192,192,1)',
                          fill: false,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: { display: true, position: 'top' as const },
                        title: { display: true, text: `График прогноза для ${result.script}` },
                      },
                    }}
                  />
                  <div className="mt-3">
                    <h6>Метрики:</h6>
                    <ul>
                      <li>MAE: {result.metrics.MAE}</li>
                      <li>RMSE: {result.metrics.RMSE}</li>
                      <li>R²: {result.metrics.R2}</li>
                      <li>Время выполнения: {result.metrics.duration} сек</li>
                      <li>Пик памяти: {result.metrics.memory_peak_mb} МБ</li>
                    </ul>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;