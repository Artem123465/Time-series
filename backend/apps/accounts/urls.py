from django.urls import path
from .views import RegisterView, LoginView, LogoutView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),  # Регистрация нового пользователя
    path('login/', LoginView.as_view(), name='login'),           # Вход в систему
    path('logout/', LogoutView.as_view(), name='logout'),
]
