"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.timeseries.views import TimeseriesViewSet
from apps.forecasting.views import ForecastRunViewSet, ForecastMetricViewSet

router = DefaultRouter()
router.register('timeseries', TimeseriesViewSet, basename='timeseries')
router.register('forecast-runs', ForecastRunViewSet, basename='forecast-run')
router.register('forecast-metrics', ForecastMetricViewSet, basename='forecast-metric')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/accounts/', include('apps.accounts.urls')),
    path('api/', include(router.urls)),
    path('api/forecasting/', include('apps.forecasting.urls')),
]