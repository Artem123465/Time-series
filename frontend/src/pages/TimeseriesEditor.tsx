import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';

interface TableData {
  columns: string[];
  data: Array<Record<string, string>>;
}

const TimeseriesEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isReference, setIsReference] = useState(false);
  const [tableData, setTableData] = useState<TableData>({ columns: [], data: [] });
  const [selectedDateColumn, setSelectedDateColumn] = useState<string>('');
  const [selectedNumericColumn, setSelectedNumericColumn] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(!!id);

  // Загрузка данных для редактирования
  useEffect(() => {
    if (!id) return;

    const loadTimeseries = async () => {
      try {
        const response = await apiClient.get(`timeseries/${id}/`);
        const { name, description, is_reference, data, date_column, numeric_column } = response.data;

        setName(name);
        setDescription(description);
        setIsReference(is_reference);
        setSelectedDateColumn(date_column || '');
        setSelectedNumericColumn(numeric_column || '');

        if (data && data.length > 0) {
          const columns = Object.keys(data[0]);
          setTableData({
            columns,
            data: data.map((row: any) => 
              Object.fromEntries(columns.map(col => [col, row[col]?.toString() || '']))
            ),
          });
        }
      } catch (error) {
        setMessage('Ошибка загрузки данных');
      } finally {
        setIsLoading(false);
      }
    };

    loadTimeseries();
  }, [id]);

  // Добавление новой колонки
  const addColumn = () => {
    const newColumn = `Column ${tableData.columns.length + 1}`;
    setTableData(prev => ({
      columns: [...prev.columns, newColumn],
      data: prev.data.map(row => ({ ...row, [newColumn]: '' })),
    }));
  };

  // Добавление новой строки
  const addRow = () => {
    const newRow: Record<string, string> = {};
    tableData.columns.forEach(col => (newRow[col] = ''));
    setTableData(prev => ({ ...prev, data: [...prev.data, newRow] }));
  };

  // Изменение значения в ячейке
  const handleCellChange = (rowIndex: number, column: string, value: string) => {
    const newData = [...tableData.data];
    newData[rowIndex][column] = value;
    setTableData(prev => ({ ...prev, data: newData }));
  };

  // Валидация даты (YYYY-MM-DD)
  const validateDate = (value: string): boolean => {
    if (!value) return true;
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    );
  };

  // Валидация числового значения
  const validateNumeric = (value: string): boolean => {
    if (!value) return true;
    return !isNaN(Number(value));
  };

  // Конвертация в CSV
  const convertToCSV = (data: TableData): string => {
    const { columns, rows } = { columns: data.columns, rows: data.data };
    return [
      columns.join(','),
      ...rows.map(row => columns.map(col => row[col] || '').join(',')),
    ].join('\n');
  };

  // Сохранение временного ряда
  const handleSave = async () => {
    if (!tableData.columns.length || !tableData.data.length) {
      setMessage('Добавьте данные в таблицу перед сохранением.');
      return;
    }

    if (!selectedDateColumn || !selectedNumericColumn) {
      setMessage('Выберите столбцы для дат и значений.');
      return;
    }

    // Валидация данных
    const errors: string[] = [];
    tableData.data.forEach((row, index) => {
      const dateValue = row[selectedDateColumn];
      const numValue = row[selectedNumericColumn];
      if (dateValue && !validateDate(dateValue)) {
        errors.push(`Неверный формат даты в строке ${index + 1}: "${dateValue}"`);
      }
      if (numValue && !validateNumeric(numValue)) {
        errors.push(`Некорректное значение в строке ${index + 1}: "${numValue}"`);
      }
    });

    if (errors.length > 0) {
      setMessage(errors.join('\n'));
      return;
    }

    try {
      const csvContent = convertToCSV(tableData);
      const csvBlob = new Blob([csvContent], { type: 'text/csv' });
      const csvFile = new File([csvBlob], 'data.csv', { type: 'text/csv' });

      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description);
      formData.append('is_reference', String(isReference));
      formData.append('data_file', csvFile);
      formData.append('date_column', selectedDateColumn);
      formData.append('numeric_column', selectedNumericColumn);

      if (id) {
        await apiClient.put(`timeseries/${id}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setMessage('Временной ряд успешно обновлён!');
      } else {
        await apiClient.post(`timeseries/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setMessage('Временной ряд успешно создан!');
        navigate('/dashboard');
      }
    } catch (err: any) {
      setMessage(err.response?.data?.error || 'Ошибка при сохранении.');
    }
  };

  if (isLoading) return <div className="container mt-5">Загрузка...</div>;

  return (
    <div className="container mt-5">
      <h2>{id ? 'Редактирование' : 'Создание'} временного ряда</h2>
      {message && <div className="alert alert-info">{message}</div>}

      <div className="mb-3">
        <label className="form-label">Название</label>
        <input
          type="text"
          className="form-control"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
      </div>
      <div className="mb-3">
        <label className="form-label">Описание</label>
        <textarea
          className="form-control"
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
      </div>
      <div className="form-check mb-3">
        <input
          className="form-check-input"
          type="checkbox"
          checked={isReference}
          onChange={e => setIsReference(e.target.checked)}
        />
        <label className="form-check-label">Эталонный ряд</label>
      </div>

      <div className="mb-3">
        <button className="btn btn-secondary me-2" onClick={addColumn}>
          Добавить колонку
        </button>
        <button className="btn btn-secondary" onClick={addRow}>
          Добавить строку
        </button>
      </div>

      {tableData.columns.length > 0 ? (
        <table className="table table-bordered">
          <thead>
            <tr>
              {tableData.columns.map((col, index) => (
                <th key={index}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.data.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {tableData.columns.map((col) => (
                  <td key={col}>
                    <input
                      className="form-control"
                      value={row[col] || ''}
                      onChange={e => handleCellChange(rowIndex, col, e.target.value)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>Добавьте хотя бы одну колонку для начала работы.</p>
      )}

      <div className="mb-3">
        <label className="form-label">Выберите столбец с датами</label>
        <select
          className="form-select"
          value={selectedDateColumn}
          onChange={e => setSelectedDateColumn(e.target.value)}
        >
          <option value="">-- Выберите --</option>
          {tableData.columns.map(col => (
            <option key={col} value={col}>{col}</option>
          ))}
        </select>
      </div>
      <div className="mb-3">
        <label className="form-label">Выберите столбец со значениями</label>
        <select
          className="form-select"
          value={selectedNumericColumn}
          onChange={e => setSelectedNumericColumn(e.target.value)}
        >
          <option value="">-- Выберите --</option>
          {tableData.columns.map(col => (
            <option key={col} value={col}>{col}</option>
          ))}
        </select>
      </div>

      <button className="btn btn-primary mt-3" onClick={handleSave}>
        Сохранить временной ряд
      </button>
    </div>
  );
};

export default TimeseriesEditor;