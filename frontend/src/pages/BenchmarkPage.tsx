import React, { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';

const BenchmarkPage: React.FC = () => {
  const [scriptFiles, setScriptFiles] = useState<File[]>([]);
  const [csvFiles, setCsvFiles] = useState<File[]>([]);
  const [csvColumns, setCsvColumns] = useState<{ [fileName: string]: string[] }>({});
  const [selectedCsvColumns, setSelectedCsvColumns] = useState<{
    [fileName: string]: { date: string; numeric: string };
  }>({});
  const [timeseriesList, setTimeseriesList] = useState<{ id: number; name: string }[]>([]);
  const [selectedTimeseriesIds, setSelectedTimeseriesIds] = useState<number[]>([]);
  const [benchmarkResults, setBenchmarkResults] = useState<{ [key: string]: any[] }>({});
  const [error, setError] = useState<string>('');

  // Загрузка списка временных рядов
  useEffect(() => {
    const fetchTimeseries = async () => {
      try {
        const response = await apiClient.get('timeseries/');
        setTimeseriesList(response.data);
      } catch (err) {
        setError('Ошибка при загрузке временных рядов');
      }
    };
    fetchTimeseries();
  }, []);

  // Обработка загрузки скриптов
  const handleScriptsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setScriptFiles(Array.from(e.target.files));
    }
  };

  // Обработка загрузки CSV-файлов и получение их столбцов
  const handleCsvFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setCsvFiles(files);
      files.forEach((file) => loadCsvColumns(file));
    }
  };

  const loadCsvColumns = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await apiClient.post('/forecasting/get_csv_columns/', formData);
      setCsvColumns((prev) => ({ ...prev, [file.name]: response.data.columns }));
    } catch (err) {
      setError(`Ошибка при загрузке столбцов для ${file.name}`);
    }
  };

  // Обработка выбора временных рядов
  const handleTimeseriesChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const options = Array.from(e.target.selectedOptions).map(option => Number(option.value));
    setSelectedTimeseriesIds(options);
  };

  // Запуск бенчмаркинга
  const runBenchmark = async () => {
    if (scriptFiles.length === 0) {
      setError('Загрузите хотя бы один скрипт.');
      return;
    }
    if (csvFiles.length === 0 && selectedTimeseriesIds.length === 0) {
      setError('Загрузите CSV-файлы или выберите временные ряды.');
      return;
    }
    for (const fileName of csvFiles.map(f => f.name)) {
      if (!selectedCsvColumns[fileName]?.date || !selectedCsvColumns[fileName]?.numeric) {
        setError(`Выберите столбцы для ${fileName}`);
        return;
      }
    }
    setError('');

    const formData = new FormData();
    scriptFiles.forEach(script => formData.append('scripts', script));
    csvFiles.forEach(file => formData.append('data_files', file));
    formData.append('timeseries_ids', selectedTimeseriesIds.join(','));
    formData.append('selected_csv_columns', JSON.stringify(selectedCsvColumns));

    try {
      const response = await apiClient.post('/forecasting/benchmark/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setBenchmarkResults(response.data.results);
    } catch (err) {
      setError('Ошибка при выполнении бенчмаркинга.');
    }
  };

  return (
    <div className="container mt-5">
      <h2>Бенчмаркинг</h2>
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="mb-3">
        <label className="form-label">Загрузите скрипты прогнозирования</label>
        <input
          type="file"
          className="form-control"
          onChange={handleScriptsChange}
          accept=".py"
          multiple
        />
      </div>

      <div className="mb-3">
        <label className="form-label">Загрузите CSV-файлы</label>
        <input
          type="file"
          className="form-control"
          onChange={handleCsvFilesChange}
          accept=".csv"
          multiple
        />
      </div>

      {csvFiles.map((file) => (
        <div key={file.name} className="mb-3">
          <h5>{file.name}</h5>
          <div className="mb-2">
            <label className="form-label">Столбец с датами</label>
            <select
              className="form-select"
              value={selectedCsvColumns[file.name]?.date || ''}
              onChange={(e) =>
                setSelectedCsvColumns((prev) => ({
                  ...prev,
                  [file.name]: { ...prev[file.name], date: e.target.value },
                }))
              }
            >
              <option value="">-- Выберите --</option>
              {csvColumns[file.name]?.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-2">
            <label className="form-label">Числовой столбец</label>
            <select
              className="form-select"
              value={selectedCsvColumns[file.name]?.numeric || ''}
              onChange={(e) =>
                setSelectedCsvColumns((prev) => ({
                  ...prev,
                  [file.name]: { ...prev[file.name], numeric: e.target.value },
                }))
              }
            >
              <option value="">-- Выберите --</option>
              {csvColumns[file.name]?.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>
        </div>
      ))}

      <div className="mb-3">
        <label className="form-label">Выберите временные ряды</label>
        <select
          className="form-select"
          multiple
          onChange={handleTimeseriesChange}
        >
          {timeseriesList.map(ts => (
            <option key={ts.id} value={ts.id}>{ts.name}</option>
          ))}
        </select>
        <small className="form-text text-muted">Удерживайте Ctrl для выбора нескольких</small>
      </div>

      <button className="btn btn-primary mb-3" onClick={runBenchmark}>
        Запустить бенчмаркинг
      </button>

      {Object.keys(benchmarkResults).length > 0 && (
        <div>
          <h4>Результаты бенчмаркинга</h4>
          {Object.entries(benchmarkResults).map(([key, results]) => (
            <div key={key}>
              <h5>Источник: {key}</h5>
              {results.map((result, idx) => (
                <div key={idx}>
                  <p>Скрипт: {result.script}</p>
                  {result.error ? (
                    <p>Ошибка: {result.error} <a href="http://localhost:3000/instructions" style={{color: 'inherit', textDecoration: 'underline'}}>посмотри инструкцию</a></p>
                  ) : (
                    <>
                      <p>MAE: {result.metrics?.MAE}, RMSE: {result.metrics?.RMSE}, R2: {result.metrics?.R2}</p>
                      <p>Время: {result.metrics?.duration} сек, Память: {result.metrics?.memory_peak_mb} МБ</p>
                    </>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BenchmarkPage;