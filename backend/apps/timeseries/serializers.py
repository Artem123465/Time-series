from rest_framework import serializers
from .models import Timeseries

class TimeseriesSerializer(serializers.ModelSerializer):
    """
    Сериализатор для модели Timeseries.
    Описывает поля, используемые для загрузки и отображения данных.
    """
    class Meta:
        model = Timeseries
        fields = '__all__'
