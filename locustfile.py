from locust import HttpUser, task, between
import random
import uuid

class TimeSeriesUser(HttpUser):
    wait_time = between(1, 5)
    host = "http://localhost:8000"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.session_cookies = {}
        self.timeseries_id = None

    def on_start(self):
        self.username = f"user_{uuid.uuid4().hex[:8]}"
        self.email = f"{self.username}@example.com"
        self.password = "password123"
        self.register_user()
        self.login_user()
        self.upload_timeseries()

    def register_user(self):
        response = self.client.post(
            "/api/accounts/register/",
            json={"username": self.username, "email": self.email, "password": self.password},
            headers={"Content-Type": "application/json"}
        )
        if response.status_code != 201:
            print(f"Ошибка регистрации: {response.text}")

    def login_user(self):
        response = self.client.post(
            "/api/accounts/login/",
            json={"username": self.username, "password": self.password},
            headers={"Content-Type": "application/json"}
        )
        if response.status_code == 200:
            # Сохраняем сессионные куки
            self.session_cookies = response.cookies.get_dict()
            # Получаем CSRF токен из куки
            self.csrf_token = self.session_cookies.get("csrftoken", "")
        else:
            print(f"Ошибка входа: {response.text}")

    def get_auth_headers(self):
        """Возвращает заголовки для аутентифицированных запросов"""
        return {
            "X-CSRFToken": self.csrf_token,
            "Cookie": f"csrftoken={self.csrf_token}; sessionid={self.session_cookies.get('sessionid', '')}"
        }

    @task(3)
    def get_timeseries(self):
        if self.csrf_token:
            self.client.get(
                "/api/timeseries/",
                headers=self.get_auth_headers()
            )

    @task(2)
    def upload_timeseries(self):
        if self.csrf_token:
            csv_content = "ds,y\n" + "\n".join(
                [f"2021-01-{i:02d},{random.randint(10,20)}" 
                for i in range(1, 10)]
            )
            files = {
                "data_file": ("test_series.csv", csv_content, "text/csv"),
                "name": (None, f"test_series_{self.username}"),
                "date_column": (None, "ds"),
                "numeric_column": (None, "y")
            }
            response = self.client.post(
                "/api/timeseries/",
                files=files,
                headers=self.get_auth_headers()
            )
            if response.status_code == 201:
                self.timeseries_id = response.json().get("id")

@task(2000)
def run_forecast(self):
    if self.csrf_token and self.timeseries_id:
        script_content = """
import pandas as pd
import random

def forecast(data):
    # Прогноз на исторические даты
    historical_forecast = [
        {"ds": row['ds'], "yhat": float(row['y']) + random.uniform(-2, 2)}
        for _, row in data.iterrows()
    ]
    # Прогноз на 3 дня вперед
    last_date = pd.to_datetime(data['ds'].max())
    future_forecast = [
        {"ds": (last_date + pd.Timedelta(days=i)).strftime('%Y-%m-%d'), 
         "yhat": random.uniform(15, 25)}
        for i in range(1, 4)
    ]
    return {"forecast": historical_forecast + future_forecast}
"""
        files = {
            "scripts": ("forecast.py", script_content, "text/x-python"),
            "timeseries_id": (None, str(self.timeseries_id))
        }
        self.client.post(
            "/api/forecasting/run/",
            files=files,
            headers=self.get_auth_headers()
        )

    @task(1)
    def logout(self):
        if self.csrf_token:
            self.client.post(
                "/api/accounts/logout/",
                headers=self.get_auth_headers()
            )