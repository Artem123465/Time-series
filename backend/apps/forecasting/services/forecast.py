import pandas as pd
from prophet import Prophet
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from typing import Dict, Any
import numpy as np

def forecast_timeseries(data: pd.DataFrame, periods: int = 30) -> Dict[str, Any]:
    """
    Выполняет прогнозирование временного ряда с использованием модели Prophet.
    
    Параметры:
      - data: pandas DataFrame с колонками 'ds' (дата) и 'y' (значение)
      - periods: количество дней для прогнозирования
    Возвращает:
      - Словарь с прогнозом и рассчитанными метриками
    """
    # Инициализация и обучение модели Prophet
    model = Prophet()
    model.fit(data)

    # Создание DataFrame для предсказаний
    future = model.make_future_dataframe(periods=periods)
    forecast = model.predict(future)

    # Расчёт стандартных метрик на основе фактических данных и прогноза
    # Для вычисления метрик используется пересечение прогнозных значений и исходных данных
    merged = data.merge(forecast[['ds', 'yhat']], on='ds', how='inner')
    mae = mean_absolute_error(merged['y'], merged['yhat'])
    rmse = np.sqrt(mean_squared_error(merged['y'], merged['yhat']))
    r2 = r2_score(merged['y'], merged['yhat'])

    return {
        'forecast': forecast[['ds', 'yhat']].tail(periods).to_dict(orient='records'),
        'metrics': {
            'MAE': mae,
            'RMSE': rmse,
            'R2': r2,
        }
    }
