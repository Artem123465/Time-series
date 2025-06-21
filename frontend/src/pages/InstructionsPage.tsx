import React from 'react';

const InstructionsPage: React.FC = () => {
  const forecastTemplate = `import pandas as pd

def forecast(data: pd.DataFrame) -> dict:
    """
    Пример шаблона функции прогнозирования.
    """
    from prophet import Prophet
    model = Prophet()
    model.fit(data)
    future = model.make_future_dataframe(periods=30)
    forecast = model.predict(future)

    result = []
    for row in forecast[['ds', 'yhat']].itertuples(index=False):
        result.append({
            "ds": row.ds.strftime('%Y-%m-%d'),
            "yhat": float(row.yhat)
        })

    return {"forecast": result}
`;

  return (
    <div className="container my-5">
      <h1 className="mb-4">Инструкция по использованию</h1>

      {/* Требования к CSV */}
      <div className="card mb-4">
        <div className="card-header">1. Требования к CSV</div>
        <div className="card-body">
          <ul>
            <li>Файл формата <strong>.csv</strong>, не более <strong>10 МБ</strong>.</li>
            <li>Минимум 2 столбца: <code>date_column</code> (дата) и <code>numeric_column</code> (значение).</li>
            <li>Дата — формат <code>YYYY-MM-DD</code> или <code>YYYY-MM-DD HH:MM:SS</code>.</li>
            <li>Значения — только числа (<code>int</code>, <code>float</code>).</li>
            <li>Названия столбцов без пробелов и спецсимволов, допустимы: <code>a-z</code>, <code>0-9</code>, нижнее подчёркивание.</li>
            <li>Пример:
              <pre className="bg-light p-2 rounded mt-2">
                ds,y{"\n"}
                2021-01-01,10{"\n"}
                2021-01-02,15
              </pre>
            </li>
          </ul>
        </div>
      </div>

      {/* Шаблон скрипта */}
      <div className="card mb-4">
        <div className="card-header">2. Шаблон скрипта</div>
        <div className="card-body">
          <p>Скрипт должен экспортировать функцию <code>forecast(data: pd.DataFrame) → dict</code>.</p>
          <textarea
            className="form-control font-monospace"
            style={{ height: '300px' }}
            value={forecastTemplate}
            readOnly
          />
        </div>
      </div>

      {/* Сценарий использования */}
      <div className="card mb-4">
        <div className="card-header">3. Сценарий использования</div>
        <div className="card-body">
          <ol>
            <li>Регистрация через <code>/api/accounts/register/</code> и вход через <code>/api/accounts/login/</code>.</li>
            <li>Загрузка CSV: укажите файл, <code>date_column</code>, <code>numeric_column</code>.</li>
            <li>Получение JSON-списка временных рядов через <code>GET /api/timeseries/</code>.</li>
            <li>Запуск скрипта: загрузите <code>.py</code> файл с функцией и выберите ряд.</li>
            <li>Просмотр результатов и метрик через ответ сервера.</li>
          </ol>
        </div>
      </div>

      {/* Ограничения */}
      <div className="card mb-4">
        <div className="card-header">4. Ограничения и ошибки</div>
        <div className="card-body">
          <ul>
            <li>Максимальный размер скрипта — <strong>100 КБ</strong>, не более <strong>500 строк</strong>.</li>
            <li>Время выполнения скрипта — до <strong>60 секунд</strong>, таймаут возвращает ошибку.</li>
            <li>Пиковая память — до <strong>512 МБ</strong>, превышение сбрасывает прогон.</li>
            <li>Если функция <code>forecast</code> отсутствует или возвращает неверный формат — ошибка "Неверный формат прогноза".</li>
            <li>Нераспознаваемые даты или нечисловые значения — сообщение с требуемым форматом.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default InstructionsPage;
