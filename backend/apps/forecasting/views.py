from rest_framework import viewsets, permissions
from django.http import HttpResponse
from .models import ForecastRun, ForecastMetric
from .serializers import ForecastRunSerializer, ForecastMetricSerializer
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework import generics
from rest_framework.permissions import AllowAny
import os, io, tempfile, importlib.util, uuid
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import numpy as np
import timeit, tracemalloc
from apps.timeseries.models import Timeseries
from datetime import datetime
import json



class ForecastRunViewSet(viewsets.ModelViewSet):
    queryset = ForecastRun.objects.all()
    serializer_class = ForecastRunSerializer
    permission_classes = [permissions.IsAuthenticated]

class ForecastMetricViewSet(viewsets.ModelViewSet):
    queryset = ForecastMetric.objects.all()
    serializer_class = ForecastMetricSerializer
    permission_classes = [permissions.IsAuthenticated]

class BenchmarkResultsView(generics.ListAPIView):
    serializer_class = ForecastRunSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Извлекаем все запуски пользователя с их метриками
        queryset = ForecastRun.objects.filter(user=self.request.user).prefetch_related('metrics')
        
        # Добавляем возможность фильтрации (опционально)
        timeseries_id = self.request.query_params.get('timeseries_id', None)
        if timeseries_id:
            queryset = queryset.filter(timeseries_id=timeseries_id)
        
        return queryset

class GetCsvColumnsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'CSV-файл не загружен.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            data = pd.read_csv(file, nrows=0)
            columns = data.columns.tolist()
            return Response({'columns': columns}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class ForecastTemplateView(APIView):
    """
    Эндпоинт для получения шаблона скрипта прогнозирования.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        template_path = os.path.join(os.path.dirname(__file__), 'templates', 'forecast_script_template.py')
        try:
            with open(template_path, 'r') as file:
                return HttpResponse(file.read(), content_type='text/plain')
        except FileNotFoundError:
            return Response(
                {'error': 'Шаблон не найден. Убедитесь, что файл forecast_script_template.py существует в apps/forecasting/templates/'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        
class ForecastRunView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        scripts = request.FILES.getlist('scripts')
        csv_file = request.FILES.get('data_file')
        ts_id = request.data.get('timeseries_id')
        date_column = request.data.get('date_column')
        numeric_column = request.data.get('numeric_column')

        if not scripts:
            return Response({'error': 'Требуются скрипты для прогнозирования.'}, status=status.HTTP_400_BAD_REQUEST)

        selected_ts = None

        if ts_id:
            try:
                selected_ts = Timeseries.objects.get(id=ts_id)
                data = pd.DataFrame(selected_ts.data)
                date_col = selected_ts.date_column
                numeric_col = selected_ts.numeric_column
                
                if not date_col or not numeric_col:
                    return Response({'error': 'Не указаны столбцы для дат и значений.'}, status=status.HTTP_400_BAD_REQUEST)
                
                # Проверка существования столбцов
                if date_col not in data.columns:
                    return Response({
                        'error': f"Столбец дат '{date_col}' не найден во временном ряду.",
                        'requirements': f"Доступные столбцы: {list(data.columns)}"
                    }, status=status.HTTP_400_BAD_REQUEST)
                    
                if numeric_col not in data.columns:
                    return Response({
                        'error': f"Столбец значений '{numeric_col}' не найден во временном ряду.",
                        'requirements': f"Доступные столбцы: {list(data.columns)}"
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Валидация столбца дат
                try:
                    data['ds'] = pd.to_datetime(data[date_col])
                except Exception as e:
                    return Response({
                        'error': f"Ошибка в столбце дат '{date_col}': {str(e)}",
                        'requirements': "Требуемый формат: YYYY-MM-DD, YYYY-MM-DD HH:MM:SS и т.д."
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Валидация числового столбца
                try:
                    data['y'] = data[numeric_col].astype(float)
                except Exception as e:
                    return Response({
                        'error': f"Ошибка в столбце значений '{numeric_col}': {str(e)}",
                        'requirements': "Столбец должен содержать только числовые значения"
                    }, status=status.HTTP_400_BAD_REQUEST)
                    
                data['ds_str'] = data['ds'].dt.strftime("%Y-%m-%d")
                
            except Timeseries.DoesNotExist:
                return Response({'error': 'Временной ряд не найден.'}, status=status.HTTP_404_NOT_FOUND)
        else:
            if not csv_file:
                return Response({'error': 'Требуется файл CSV или timeseries_id.'}, status=status.HTTP_400_BAD_REQUEST)
            if not date_column or not numeric_column:
                return Response({'error': 'Необходимо указать date_column и numeric_column для CSV.'}, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                content = csv_file.read().decode('utf-8')
                data = pd.read_csv(io.StringIO(content))
                
                # Проверка существования столбцов
                if date_column not in data.columns:
                    return Response({
                        'error': f"Столбец дат '{date_column}' не найден в CSV-файле.",
                        'requirements': f"Доступные столбцы: {list(data.columns)}"
                    }, status=status.HTTP_400_BAD_REQUEST)
                    
                if numeric_column not in data.columns:
                    return Response({
                        'error': f"Столбец значений '{numeric_column}' не найден в CSV-файле.",
                        'requirements': f"Доступные столбцы: {list(data.columns)}"
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Валидация столбца дат
                try:
                    data['ds'] = pd.to_datetime(data[date_column])
                except Exception as e:
                    return Response({
                        'error': f"Ошибка в столбце дат '{date_column}': {str(e)}",
                        'requirements': "Требуемый формат: YYYY-MM-DD, YYYY-MM-DD HH:MM:SS и т.д."
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Валидация числового столбца
                try:
                    data['y'] = data[numeric_column].astype(float)
                except Exception as e:
                    return Response({
                        'error': f"Ошибка в столбце значений '{numeric_column}': {str(e)}",
                        'requirements': "Столбец должен содержать только числовые значения"
                    }, status=status.HTTP_400_BAD_REQUEST)
                    
                data['ds_str'] = data['ds'].dt.strftime("%Y-%m-%d")
                
            except Exception as e:
                return Response({'error': f'Ошибка обработки CSV: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

        results = []
        for script in scripts:
            tmp = None  # Инициализируем tmp заранее
            try:
                tracemalloc.start()
                start_time = timeit.default_timer()

                # Создание временного файла для скрипта
                tmp = tempfile.NamedTemporaryFile(suffix='.py', delete=False)
                tmp.write(script.read())
                tmp.seek(0)
                spec = importlib.util.spec_from_file_location('mod', tmp.name)
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)

                # Проверка наличия функции forecast
                if not hasattr(module, 'forecast'):
                    raise ValueError('Нет функции forecast.')

                # Проверка соответствия шаблону на тестовых данных
                test_data = pd.DataFrame({
                    'ds': [datetime(2023, 1, 1), datetime(2023, 1, 2)],
                    'y': [100.0, 110.0]
                })
                test_output = module.forecast(test_data.copy())
                if not isinstance(test_output, dict) or 'forecast' not in test_output:
                    raise ValueError("Функция должна возвращать словарь с ключом 'forecast'.")
                forecast_output = test_output['forecast']
                if not isinstance(forecast_output, list) or not forecast_output:
                    raise ValueError("Ключ 'forecast' должен содержать непустой список.")
                for item in forecast_output:
                    if not isinstance(item, dict) or 'ds' not in item or 'yhat' not in item:
                        raise ValueError("Каждый элемент прогноза должен быть словарем с ключами 'ds' и 'yhat'.")
                    if not isinstance(item['ds'], str):
                        raise ValueError("Поле 'ds' должно быть строкой, конвертируемой в datetime.")
                    try:
                        pd.to_datetime(item['ds'])
                    except ValueError:
                        raise ValueError("Поле 'ds' должно быть валидной строкой datetime (например, 'YYYY-MM-DD').")
                    if not isinstance(item['yhat'], (int, float)):
                        raise ValueError("Поле 'yhat' должно быть числом (int или float).")

                # Выполнение прогноза на реальных данных
                out = module.forecast(data.copy())
                if not isinstance(out, dict) or 'forecast' not in out:
                    raise ValueError("Функция должна возвращать словарь с ключом 'forecast'.")
                forecast_output = out['forecast']
                if not isinstance(forecast_output, list) or not all(isinstance(i, dict) and 'ds' in i and 'yhat' in i for i in forecast_output):
                    raise ValueError("Неверный формат прогноза.")

                # Обработка результатов
                forecast_df = pd.DataFrame(forecast_output)
                forecast_df['ds'] = pd.to_datetime(forecast_df['ds'])
                forecast_df['ds_str'] = forecast_df['ds'].dt.strftime("%Y-%m-%d")
                merged = pd.merge(data, forecast_df, on='ds_str', how='inner')
                mae = mean_absolute_error(merged['y'].astype(float), merged['yhat'].astype(float))
                rmse = np.sqrt(mean_squared_error(merged['y'].astype(float), merged['yhat'].astype(float)))
                r2 = r2_score(merged['y'].astype(float), merged['yhat'].astype(float))

                duration = timeit.default_timer() - start_time
                current, peak = tracemalloc.get_traced_memory()
                tracemalloc.stop()

                # Сохранение результатов в базу
                run = ForecastRun.objects.create(
                    user=request.user,
                    timeseries=selected_ts if ts_id else None,  # Используем selected_ts только если ts_id указан
                    script_name=script.name,
                    csv_file_name=csv_file.name if csv_file else None
                )
                metrics = [
                    ('MAE', mae), ('RMSE', rmse), ('R2', r2),
                    ('duration', duration), ('memory_peak_mb', peak / 1024 / 1024)
                ]
                ForecastMetric.objects.bulk_create([ForecastMetric(run=run, name=n, value=v) for n, v in metrics])

                results.append({
                    'script': script.name,
                    'forecast': forecast_output,
                    'metrics': dict(metrics)
                })
            except Exception as e:
                # Очистка ресурсов и запись ошибки
                tracemalloc.stop()
                if tmp:  # Проверяем, был ли tmp создан
                    tmp.close()
                    try:
                        os.remove(tmp.name)
                    except FileNotFoundError:
                        pass  # Игнорируем, если файл уже удален
                results.append({
                    'script': script.name,
                    'error': str(e)
                })
                continue  # Продолжаем обработку следующего скрипта
            finally:
                if tmp:  # Очистка в finally только если tmp существует
                    tmp.close()
                    try:
                        os.remove(tmp.name)
                    except FileNotFoundError:
                        pass  # Игнорируем, если файл уже удален

        return Response({'results': results}, status=status.HTTP_200_OK)
    

class BenchmarkView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        scripts = request.FILES.getlist('scripts')
        timeseries_ids = request.data.get('timeseries_ids', '').split(',')
        csv_files = request.FILES.getlist('data_files')
        selected_csv_columns = json.loads(request.data.get('selected_csv_columns', '{}'))
        results = {}

        if not scripts:
            return Response({'error': 'Требуются скрипты.'}, status=status.HTTP_400_BAD_REQUEST)
        if not timeseries_ids and not csv_files:
            return Response({'error': 'Требуется timeseries_id или CSV-файл.'}, status=status.HTTP_400_BAD_REQUEST)

        # Обработка временных рядов из базы
        for ts_id in timeseries_ids:
            if not ts_id:
                continue
            try:
                ts_id_int = int(ts_id)
                selected_ts = Timeseries.objects.get(id=ts_id_int)
                data = pd.DataFrame(selected_ts.data)
                date_col = selected_ts.date_column
                numeric_col = selected_ts.numeric_column
                if not date_col or not numeric_col:
                    results[str(ts_id_int)] = [{'error': 'Не указаны столбцы.'}]
                    continue
                data['ds'] = pd.to_datetime(data[date_col])
                data['y'] = data[numeric_col].astype(float)
                data['ds_str'] = data['ds'].dt.strftime("%Y-%m-%d %H:%M:%S")
                ts_results = self.run_forecast_for_data(scripts, data, selected_ts, request.user, None)
                results[str(ts_id_int)] = ts_results
            except (ValueError, Timeseries.DoesNotExist):
                results[str(ts_id)] = [{'error': 'Неверный timeseries_id.'}]

        # Обработка CSV-файлов
        for csv_file in csv_files:
            file_name = csv_file.name
            columns = selected_csv_columns.get(file_name, {})
            date_column = columns.get('date')
            numeric_column = columns.get('numeric')
            if not date_column or not numeric_column:
                results[file_name] = [{'error': 'Не указаны столбцы для дат и значений.'}]
                continue
            try:
                content = csv_file.read().decode('utf-8')
                data = pd.read_csv(io.StringIO(content))
                # Валидация столбца с датами
                try:
                    data['ds'] = pd.to_datetime(data[date_column])
                except ValueError:
                    results[file_name] = [{'error': f"Столбец '{date_column}' не содержит даты."}]
                    continue

                try:
                    data['y'] = data[numeric_column].astype(float)
                except ValueError:
                    results[file_name] = [{'error': f"Столбец '{numeric_column}' содержит нечисловые значения."}]
                    continue
                data['ds_str'] = data['ds'].dt.strftime("%Y-%m-%d %H:%M:%S")
                ts_results = self.run_forecast_for_data(scripts, data, None, request.user, csv_file.name)
                results[file_name] = ts_results
            except Exception as e:
                results[file_name] = [{'error': f'Ошибка CSV: {str(e)}'}]

        return Response({'results': results}, status=status.HTTP_200_OK)

    def run_forecast_for_data(self, scripts, data, selected_ts, user, csv_file_name=None):
        results = []
        for script in scripts:
            tracemalloc.start()
            start_time = timeit.default_timer()
            script.seek(0)
            tmp = tempfile.NamedTemporaryFile(suffix='.py', delete=False)
            tmp.write(script.read())
            tmp.seek(0)
            module_name = f'mod_{uuid.uuid4().hex}'
            spec = importlib.util.spec_from_file_location(module_name, tmp.name)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)

            if not hasattr(module, 'forecast'):
                tracemalloc.stop()
                tmp.close()
                os.remove(tmp.name)
                results.append({'script': script.name, 'error': 'Функция forecast отсутствует.'})
                continue

            try:
                test_data = pd.DataFrame({'ds': [datetime(2023, 1, 1), datetime(2023, 1, 2)], 'y': [100.0, 110.0]})
                test_output = module.forecast(test_data.copy())
                if not isinstance(test_output, dict) or 'forecast' not in test_output:
                    raise ValueError("Функция должна возвращать словарь с ключом 'forecast'.")
                forecast_output = test_output['forecast']
                if not isinstance(forecast_output, list) or not forecast_output:
                    raise ValueError("Ключ 'forecast' должен содержать непустой список.")
                for item in forecast_output:
                    if not isinstance(item, dict) or 'ds' not in item or 'yhat' not in item:
                        raise ValueError("Каждый элемент должен быть словарем с 'ds' и 'yhat'.")
                    if not isinstance(item['ds'], str):
                        raise ValueError("Поле 'ds' должно быть строкой.")
                    try:
                        pd.to_datetime(item['ds'])
                    except ValueError:
                        raise ValueError("Поле 'ds' должно быть валидной датой.")
                    if not isinstance(item['yhat'], (int, float)):
                        raise ValueError("Поле 'yhat' должно быть числом.")
            except Exception as e:
                tracemalloc.stop()
                tmp.close()
                os.remove(tmp.name)
                results.append({'script': script.name, 'error': f'Скрипт не соответствует шаблону: {str(e)}'})
                continue

            try:
                out = module.forecast(data.copy())
                if not isinstance(out, dict) or 'forecast' not in out:
                    raise ValueError("Функция должна возвращать словарь с ключом 'forecast'.")
                forecast_output = out['forecast']
                if not isinstance(forecast_output, list) or not all(isinstance(i, dict) and 'ds' in i and 'yhat' in i for i in forecast_output):
                    raise ValueError("Неверный формат прогноза.")
            except Exception as e:
                tracemalloc.stop()
                tmp.close()
                os.remove(tmp.name)
                results.append({'script': script.name, 'error': f'Ошибка прогноза: {str(e)}'})
                continue

            forecast_df = pd.DataFrame(forecast_output)
            forecast_df['ds'] = pd.to_datetime(forecast_df['ds'])
            forecast_df['ds_str'] = forecast_df['ds'].dt.strftime("%Y-%m-%d %H:%M:%S")
            merged = pd.merge(data, forecast_df, on='ds_str', how='inner')
            mae = mean_absolute_error(merged['y'].astype(float), merged['yhat'].astype(float))
            rmse = np.sqrt(mean_squared_error(merged['y'].astype(float), merged['yhat'].astype(float)))
            r2 = r2_score(merged['y'].astype(float), merged['yhat'].astype(float))

            duration = timeit.default_timer() - start_time
            current, peak = tracemalloc.get_traced_memory()
            tracemalloc.stop()
            tmp.close()
            os.remove(tmp.name)

            run = ForecastRun.objects.create(
                user=user,
                timeseries=selected_ts,
                script_name=script.name,
                csv_file_name=csv_file_name
            )
            metrics = [
                ('MAE', mae), ('RMSE', rmse), ('R2', r2),
                ('duration', duration), ('memory_peak_mb', peak / 1024 / 1024)
            ]
            ForecastMetric.objects.bulk_create([ForecastMetric(run=run, name=n, value=v) for n, v in metrics])

            normalized_forecast = [
                {'ds': pd.to_datetime(item['ds']).strftime('%Y-%m-%d %H:%M:%S'), 'yhat': float(item['yhat'])}
                for item in forecast_output
            ]

            results.append({
                'script': script.name,
                'forecast': normalized_forecast,
                'metrics': dict(metrics)
            })

        return results