import pandas as pd

def forecast(data: pd.DataFrame) -> dict:
    """
    Шаблон функции для прогнозирования временного ряда.
    
    Эта функция должна быть реализована пользователем для выполнения прогнозирования.
    Система будет вызывать эту функцию, передавая DataFrame с историческими данными,
    и ожидает возврата прогноза в определенном формате.
    
    Параметры:
        data (pd.DataFrame): DataFrame с колонками 'ds' (дата, тип datetime) и 'y' (значение, тип float)
    
    Возвращает:
        dict: Словарь с ключом 'forecast', содержащим список словарей.
              Каждый словарь в списке должен иметь ключи:
                - 'ds': строка в формате 'YYYY-MM-DD'
                - 'yhat': прогнозируемое значение (float)
              Прогноз должен включать как исторические данные, так и будущие предсказания.
    """
    # Пример реализации с использованием библиотеки Prophet
    # Вы можете заменить это своей моделью прогнозирования
    
    try:
        from prophet import Prophet
    except ImportError:
        raise ImportError("Для использования этого примера установите библиотеку Prophet: pip install prophet")
    
    # Инициализация и обучение модели
    model = Prophet()
    model.fit(data)
    
    # Создание DataFrame для прогнозирования, включая исторические и будущие даты
    future = model.make_future_dataframe(periods=30)
    forecast = model.predict(future)
    
    # Выбор необходимых колонок и преобразование в список словарей
    forecast_list = forecast[['ds', 'yhat']].to_dict(orient='records')
    
    # Преобразование 'ds' в строку 'YYYY-MM-DD'
    for item in forecast_list:
        item['ds'] = item['ds'].strftime('%Y-%m-%d')
        item['yhat'] = float(item['yhat'])
    
    return {'forecast': forecast_list}