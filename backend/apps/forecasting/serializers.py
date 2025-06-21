from rest_framework import serializers
from .models import ForecastRun, ForecastMetric
from apps.timeseries.serializers import TimeseriesSerializer

class ForecastMetricSerializer(serializers.ModelSerializer):
    class Meta:
        model = ForecastMetric
        fields = ['name', 'value']

class ForecastRunSerializer(serializers.ModelSerializer):
    metrics = ForecastMetricSerializer(many=True)
    timeseries = serializers.CharField(source='timeseries.name', read_only=True)
    script_name = serializers.CharField(read_only=True)  # Добавляем поле script_name
    csv_file_name = serializers.CharField(read_only=True, allow_null=True)  # Add csv_file_name

    class Meta:
        model = ForecastRun
        fields = ['id', 'timeseries', 'created_at', 'metrics', 'script_name', 'csv_file_name']