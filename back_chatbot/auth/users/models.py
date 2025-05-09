from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.timezone import now  
import uuid

class User(AbstractUser):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255)
    email = models.EmailField(max_length=255, unique=True)
    password = models.CharField(max_length=255)
    username = None
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    def __str__(self):
        return self.email

class UploadedFile(models.Model):
    upload_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    file_name = models.CharField(max_length=255)
    file_url = models.URLField()
    created_at = models.DateTimeField(default=now)  
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)

    def __str__(self):
        return self.file_name
    
class VectorEmbedding(models.Model):
    id = models.AutoField(primary_key=True)
    upload = models.ForeignKey(UploadedFile, on_delete=models.CASCADE)
    vector_id = models.UUIDField(unique=True)  

    def __str__(self):
        return self.vector_id
