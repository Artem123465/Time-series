import csv
from io import TextIOWrapper
from typing import Tuple, List, Dict

import pandas as pd
from typing import Tuple, List, Dict

def parse_and_validate_csv(file, date_column: str, numeric_column: str) -> Tuple[bool, str, List[Dict[str, str]]]:
    try:
        file.seek(0)
        data = pd.read_csv(file)
        
        if data.empty:
            return False, "CSV-файл не содержит данных.", []
        
        if date_column not in data.columns:
            return False, f"Указанный столбец с датами '{date_column}' не найден в CSV.", []
        if numeric_column not in data.columns:
            return False, f"Указанный числовой столбец '{numeric_column}' не найден в CSV.", []
        
        # Валидация и преобразование столбца с датами
        try:
            data[date_column] = pd.to_datetime(data[date_column], errors='coerce')
            if data[date_column].isnull().any():
                return False, f"Столбец '{date_column}' содержит значения, которые не являются датами.", []
            # Преобразуем даты в строки для сериализации
            data[date_column] = data[date_column].dt.strftime('%Y-%m-%d')
        except (ValueError, TypeError):
            return False, f"Столбец '{date_column}' не может быть преобразован в даты.", []
        
        # Валидация и преобразование числового столбца
        try:
            data[numeric_column] = data[numeric_column].astype(float)
            if data[numeric_column].isnull().any():
                return False, f"Столбец '{numeric_column}' содержит нечисловые значения.", []
        except ValueError:
            return False, f"Столбец '{numeric_column}' содержит нечисловые значения.", []
        
        # Преобразование в список словарей
        data_list = data.to_dict(orient='records')
        
        return True, "", data_list
    except Exception as e:
        return False, f"Ошибка при обработке CSV: {str(e)}", []