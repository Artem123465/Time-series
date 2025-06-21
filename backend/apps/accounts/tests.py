import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from django.contrib.auth.models import User

@pytest.fixture
def api_client():
    return APIClient()

@pytest.mark.django_db
def test_register_success(api_client):
    resp = api_client.post(reverse('register'), {
        'username': 'user1', 'email': 'u1@example.com', 'password': 'pass1234'
    })
    assert resp.status_code == 201
    assert User.objects.filter(username='user1').exists()

@pytest.mark.django_db
def test_register_invalid_password(api_client):
    resp = api_client.post(reverse('register'), {
        'username': 'u2', 'email': 'u2@example.com', 'password': 'short'
    })
    assert resp.status_code == 400
    assert 'password' in resp.json()

@pytest.mark.django_db
def test_login_success_and_failure(api_client):
    User.objects.create_user('u3', password='securepass')
    # Успешный вход
    ok = api_client.post(reverse('login'), {'username': 'u3', 'password': 'securepass'})
    assert ok.status_code == 200
    # Некорректные данные
    bad = api_client.post(reverse('login'), {'username': 'u3', 'password': 'wrong'})
    assert bad.status_code == 401