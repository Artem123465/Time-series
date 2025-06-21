from django.contrib.auth.models import User
from rest_framework import serializers

class RegisterSerializer(serializers.ModelSerializer):
    """
    Сериализатор для регистрации пользователя.
    Входные параметры: username, email, password.
    Выход: созданный пользователь (без пароля).
    """
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ('username', 'email', 'password')

    def create(self, validated_data: dict) -> User:
        # Создаем нового пользователя с зашифрованным паролем
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password']
        )
        return user
    