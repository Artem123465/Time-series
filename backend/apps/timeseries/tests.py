from django.test import TestCase
import io, json
import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from django.contrib.auth.models import User

@pytest.fixture
def auth_client(tmp_path, django_db_blocker):
    user = User.objects.create_user('tsuser', password='pass1234')
    client = APIClient()
    client.login(username='tsuser', password='pass1234')
    return client

@pytest.mark.django_db
def test_upload_and_retrieve_timeseries(auth_client):
    # Подготовка CSV
    csv_content = 'ds,y\n2021-01-01,10\n2021-01-02,15'
    file = io.BytesIO(csv_content.encode())
    file.name = 'series.csv'
    # POST upload
    resp = auth_client.post(reverse('timeseries-list'), {'name': 's', 'data_file': file}, format='multipart')
    assert resp.status_code == 201
    ts_id = resp.json()['id']
    # GET detail
    detail = auth_client.get(reverse('timeseries-detail', args=[ts_id]))
    assert detail.status_code == 200
    data = detail.json()
    assert data['data'][0]['ds'] == '2021-01-01'

@pytest.mark.django_db
def test_update_and_delete_timeseries(auth_client):
    # Создать пустой
    resp = auth_client.post(reverse('timeseries-list'), {'name': 'to-delete'})
    ts_id = resp.json()['id']
    # Обновить
    update = auth_client.patch(reverse('timeseries-detail', args=[ts_id]), {'description': 'desc'})
    assert update.status_code == 200
    # Удалить
    del_resp = auth_client.delete(reverse('timeseries-detail', args=[ts_id]))
    assert del_resp.status_code == 204