from django.db import models

# Create your models here.
from django.db import models
from django.contrib.auth.models import User
from apps.timeseries.models import Timeseries

class ForecastRun(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='forecast_runs')
    timeseries = models.ForeignKey(Timeseries, on_delete=models.CASCADE, related_name='forecast_runs', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    script_name = models.CharField(max_length=255, blank=True, null=True)  # Новое поле для имени скрипта
    csv_file_name = models.CharField(max_length=255, blank=True, null=True)  # New field for CSV filename

class ForecastMetric(models.Model):
    run = models.ForeignKey(ForecastRun, on_delete=models.CASCADE, related_name='metrics')
    name = models.CharField(max_length=50)
    value = models.FloatField()