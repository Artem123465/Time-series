from django.db import models

class Timeseries(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    is_reference = models.BooleanField(default=False)
    data = models.JSONField(null=True, blank=True)  # Хранит весь DataFrame как список словарей
    date_column = models.CharField(max_length=255, blank=True, null=True)  # Имя столбца с датами
    numeric_column = models.CharField(max_length=255, blank=True, null=True)  # Имя столбца с числами
    created_at = models.DateTimeField(auto_now_add=True)
    author = models.ForeignKey(
        'auth.User', on_delete=models.CASCADE, related_name='timeseries',
        null=True, blank=True
    )

    def __str__(self):
        return self.name
