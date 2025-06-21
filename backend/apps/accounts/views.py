from django.shortcuts import render
from django.contrib.auth import authenticate, login, logout
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from .serializers import RegisterSerializer
from django.contrib.auth.models import User
from rest_framework.permissions import AllowAny

class RegisterView(APIView):
    """
    Представление для регистрации нового пользователя.
    Принимает POST запрос с данными для создания нового пользователя.
    """
    permission_classes = [AllowAny]
    def post(self, request) -> Response:
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({'message': 'Пользователь успешно зарегистрирован.'}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LoginView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request) -> Response:
        username = request.data.get('username')
        password = request.data.get('password')
        user = authenticate(request, username=username, password=password)
        if user:
            login(request, user)
            return Response({'message': 'Вход выполнен успешно.', 'user': username}, status=status.HTTP_200_OK)
        return Response({'error': 'Неверные учетные данные.'}, status=status.HTTP_401_UNAUTHORIZED)

class LogoutView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        logout(request)
        return Response({'message': 'Вы успешно вышли из системы.'}, status=status.HTTP_200_OK)