import React, { useState, useEffect } from 'react';

export interface TableData {
  columns: string[];
  data: Array<Record<string, string>>;
}

interface TableEditorProps {
  onSave: (tableData: TableData) => void;
  initialColumns?: string[];
  initialData?: Array<Record<string, string>>;
  dateColumn: string; // Выбранный столбец для дат
  numericColumn: string; // Выбранный столбец для чисел
  onError: (error: string) => void; // Callback для передачи ошибок
}

const TableEditor: React.FC<TableEditorProps> = ({
  onSave,
  initialColumns = [],
  initialData = [],
  dateColumn,
  numericColumn,
  onError,
}) => {
  const [columns, setColumns] = useState<string[]>([]);
  const [data, setData] = useState<Array<Record<string, string>>>([]);

  useEffect(() => {
    if (initialColumns.length > 0) setColumns(initialColumns);
    if (initialData.length > 0) setData(initialData);
  }, [initialColumns, initialData]);

  const addColumn = () => {
    const newColumnName = `Column ${columns.length + 1}`;
    setColumns(prev => [...prev, newColumnName]);
    setData(prev => prev.map(row => ({ ...row, [newColumnName]: '' })));
  };

  const handleColumnNameChange = (index: number, newName: string) => {
    const oldName = columns[index];
    const updatedColumns = [...columns];
    updatedColumns[index] = newName;
    setColumns(updatedColumns);
    setData(prev =>
      prev.map(row => {
        const newRow = { ...row };
        newRow[newName] = newRow[oldName];
        delete newRow[oldName];
        return newRow;
      })
    );
  };

  const addRow = () => {
    if (!dateColumn || !numericColumn) {
      onError('Выберите столбцы для дат и значений перед добавлением строк.');
      return;
    }
    const newRow: Record<string, string> = {};
    columns.forEach(col => (newRow[col] = ''));
    setData(prev => [...prev, newRow]);
  };

  const validateDate = (value: string): boolean => {
    const regex = /^\d{4}-\d{2}-\d{2}$/; // Формат YYYY-MM-DD
    if (!regex.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    );
  };

  const validateNumeric = (value: string): boolean => {
    return !isNaN(Number(value)) && value.trim() !== '';
  };

  const handleCellChange = (rowIndex: number, column: string, value: string) => {
    if (column === dateColumn && value && !validateDate(value)) {
      onError(`Неверный формат даты в столбце "${dateColumn}". Используйте YYYY-MM-DD.`);
      return;
    }
    if (column === numericColumn && value && !validateNumeric(value)) {
      onError(`Столбец "${numericColumn}" должен содержать только числа.`);
      return;
    }
    const newData = [...data];
    newData[rowIndex][column] = value;
    setData(newData);
  };

  const handleSave = () => {
    if (!dateColumn || !numericColumn) {
      onError('Выберите столбцы для дат и значений.');
      return;
    }
    for (const row of data) {
      if (row[dateColumn] && !validateDate(row[dateColumn])) {
        onError(`Неверный формат даты в строке: "${row[dateColumn]}". Используйте YYYY-MM-DD.`);
        return;
      }
      if (row[numericColumn] && !validateNumeric(row[numericColumn])) {
        onError(`Некорректное значение в строке: "${row[numericColumn]}". Должно быть числом.`);
        return;
      }
    }
    onSave({ columns, data });
  };

  return (
    <div className="container mt-3">
      <h4>Редактор временного ряда</h4>
      <div className="mb-2">
        <button className="btn btn-secondary me-2" onClick={addColumn}>
          Добавить колонку
        </button>
        <button
          className="btn btn-secondary"
          onClick={addRow}
          disabled={!dateColumn || !numericColumn}
        >
          Добавить строку
        </button>
      </div>
      {columns.length > 0 ? (
        <table className="table table-bordered">
          <thead>
            <tr>
              {columns.map((col, index) => (
                <th key={index}>
                  <input
                    className="form-control"
                    value={col}
                    onChange={e => handleColumnNameChange(index, e.target.value)}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {columns.map((col, colIndex) => (
                  <td key={colIndex}>
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
        <p>Сначала добавьте хотя бы одну колонку.</p>
      )}
      <button className="btn btn-primary" onClick={handleSave}>
        Сохранить таблицу
      </button>
    </div>
  );
};

export default TableEditor;