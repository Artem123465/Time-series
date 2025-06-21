from django.urls import path
from .views import ForecastRunView, ForecastTemplateView, BenchmarkView, BenchmarkResultsView, GetCsvColumnsView


urlpatterns = [
    path('run/', ForecastRunView.as_view(), name='forecast-run'),
    path('template/', ForecastTemplateView.as_view(), name='forecast-template'),
    path('benchmark/', BenchmarkView.as_view(), name='benchmark'),
    path('benchmark-results/', BenchmarkResultsView.as_view(), name='benchmark-results'),
    path('get_csv_columns/', GetCsvColumnsView.as_view(), name='get_csv_columns'),
]
