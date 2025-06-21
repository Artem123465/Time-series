from django.urls import path
from .views import TimeseriesUploadView, TimeseriesDetailView

urlpatterns = [
    path('upload/', TimeseriesUploadView.as_view(), name='timeseries-upload'),
    path('<int:pk>/', TimeseriesDetailView.as_view(), name='timeseries-detail'),
]
