from rest_framework import viewsets, permissions, serializers
from .models import Timeseries
from .serializers import TimeseriesSerializer
from .utils.validators import parse_and_validate_csv

class TimeseriesViewSet(viewsets.ModelViewSet):
    serializer_class = TimeseriesSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Timeseries.objects.filter(author=self.request.user)

    def perform_create(self, serializer):
        date_column = self.request.data.get('date_column')
        numeric_column = self.request.data.get('numeric_column')
        
        if not date_column or not numeric_column:
            raise serializers.ValidationError({'columns': 'Необходимо указать столбец с датами и числовой столбец.'})
        
        csv_file = self.request.FILES.get('data_file')
        if not csv_file:
            raise serializers.ValidationError({'data_file': 'CSV-файл обязателен.'})
        
        is_valid, error_msg, parsed_data = parse_and_validate_csv(csv_file, date_column, numeric_column)
        if not is_valid:
            raise serializers.ValidationError({'data_file': error_msg})
        
        serializer.save(
            author=self.request.user,
            data=parsed_data,
            date_column=date_column,
            numeric_column=numeric_column
        )

    def perform_update(self, serializer):
        date_column = self.request.data.get('date_column')
        numeric_column = self.request.data.get('numeric_column')
        csv_file = self.request.FILES.get('data_file')
        
        if csv_file:
            if not date_column or not numeric_column:
                raise serializers.ValidationError({'columns': 'Необходимо указать столбец с датами и числовой столбец.'})
            is_valid, error_msg, parsed_data = parse_and_validate_csv(csv_file, date_column, numeric_column)
            if not is_valid:
                raise serializers.ValidationError({'data_file': error_msg})
            serializer.save(
                data=parsed_data,
                date_column=date_column,
                numeric_column=numeric_column
            )
        else:
            serializer.save()