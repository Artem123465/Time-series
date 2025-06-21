# Базовый образ Python 3.10 (slim вариант для уменьшения размера образа)
FROM python:3.10-slim

# Отключаем автоматическую генерацию .pyc файлов и буферизацию вывода
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Устанавливаем рабочую директорию внутри контейнера
WORKDIR /app

# Копируем файл зависимостей и устанавливаем их
COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# Копируем все остальные файлы проекта в рабочую директорию
COPY . .

# Открываем порт для работы Django-сервера (по умолчанию 8000)
EXPOSE 8000

# Команда для запуска сервера Django
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
