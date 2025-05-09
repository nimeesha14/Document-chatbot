import boto3
from django.shortcuts import render
from rest_framework.views import APIView
from .serializers import UserSerializer
from rest_framework.response import Response
from .models import User
from rest_framework.exceptions import AuthenticationFailed
from datetime import datetime, timedelta
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework import status
from django.conf import settings
from .models import UploadedFile
from django.shortcuts import get_object_or_404
from .qdrant_vector import extract_text, search
from rest_framework.permissions import IsAuthenticated
import os
import jwt

class RegisterView(APIView):
    def post(self, request):
        serializer = UserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

class LoginView(APIView):
    def post(self, request):
        try:
            email = request.data.get('email')
            password = request.data.get('password')
            user = User.objects.filter(email=email).first()
            
            if user is None:
                raise AuthenticationFailed('User not Found!')
            if not user.check_password(password):
                raise AuthenticationFailed('Incorrect Password!')
                
            payload = {
                'id': user.id,
                'exp': datetime.utcnow() + timedelta(minutes=60),
                'iat': datetime.utcnow()
            }
            
            token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')
            response = Response()
            response.set_cookie(key='jwt', value=token, httponly=True)
            response.data = {
                'jwt': token,
                'user_id': user.id, 
                'user': UserSerializer(user).data
            }
            
            return response
            
        except Exception as e:
            return Response({
                'error': str(e)
            }, status = status.HTTP_500_INTERNAL_SERVER_ERROR)
    
class UserView(APIView):
    def get(self, request):
        try:
            token = request.COOKIES.get('jwt')

            if not token:
                return Response({
                    'error': 'No authentication token provided'
                }, status=status.HTTP_401_UNAUTHORIZED)

            try:
                payload = jwt.decode(
                    token, 
                    settings.SECRET_KEY,
                    algorithms=['HS256']
                )
            except jwt.ExpiredSignatureError:
                return Response({
                    'error': 'Token has expired'
                }, status=status.HTTP_401_UNAUTHORIZED)
            except jwt.InvalidTokenError:
                return Response({
                    'error': 'Invalid token'
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            user = User.objects.filter(id=payload['id']).first()
            if not user:
                return Response({
                    'error': 'User not found'
                }, status=status.HTTP_404_NOT_FOUND)

            serializer = UserSerializer(user)
            return Response(serializer.data)

        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
class LogoutView(APIView):
    def post(self, request):
        response = Response()
        response.delete_cookie('jwt')
        response.data = {
            'message': 'Logged out successfully!'
        }
        return response
    
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class FileUploadToS3View(APIView):
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):

        if not request.FILES:
            return Response({"error": "No file received in request.FILES"}, status=status.HTTP_400_BAD_REQUEST)

        if "file" not in request.FILES:
            return Response({"error": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)

        file = request.FILES["file"]
        user_id = request.data.get("user_id")

        if not user_id:
            return Response({"error": "User ID is required"}, status=status.HTTP_400_BAD_REQUEST)

        user = get_object_or_404(User, id=user_id)

        folder_name = f"uploads/{user.id}/"
        file_path = f"{folder_name}{file.name}"

        s3_client = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME
        )

        try:
            s3_client.upload_fileobj(file, settings.AWS_STORAGE_BUCKET_NAME, file_path)
            file_url = f"https://{settings.AWS_S3_CUSTOM_DOMAIN}/{file_path}"

            uploaded_file = UploadedFile.objects.create(
                user=user,
                file_name=file.name,
                file_url=file_url
            )

            return Response({"message": "File uploaded successfully", "file_url": file_url, "upload_id": uploaded_file.upload_id}, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DeleteFileFromS3View(APIView):
    def post(self, request, *args, **kwargs):
        file_url = request.data.get("file_url")
        upload_id = request.data.get("upload_id")

        if not file_url or not upload_id:
            return Response({"error": "file_url and upload_id are required"}, status=status.HTTP_400_BAD_REQUEST)

        # Extract file path from full URL
        file_path = file_url.replace(f"https://{settings.AWS_S3_CUSTOM_DOMAIN}/", "")

        s3_client = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME
        )

        try:
           
            s3_client.delete_object(Bucket=settings.AWS_STORAGE_BUCKET_NAME, Key=file_path)
            rows_deleted, _= UploadedFile.objects.filter(upload_id=upload_id).delete()
            return Response({"message": "File deleted successfully"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": f"Error deleting file: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ExtractTextView(APIView):
    """Extracts text from uploaded file and stores in Qdrant."""

    def post(self, request):
        file = request.FILES.get("file")
        upload_id = request.data.get("upload_id")

        if not file or not upload_id:
            return Response({"error": "file and upload_id are required"}, status=status.HTTP_400_BAD_REQUEST)

        file_name = file.name
        file_path = f"temp/{file_name}"
        os.makedirs("temp", exist_ok=True)

        with open(file_path, "wb") as f:
            for chunk in file.chunks():
                f.write(chunk)

        result = extract_text(file_path, upload_id, file_name)
        os.remove(file_path)

        return Response(result, status=status.HTTP_200_OK)



class SearchSimpleView(APIView):
    def post(self, request):
        query = request.data.get("query")
        limit = int(request.data.get("limit", 3))

        if not query:
            return Response({"error": "query parameter is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            results = search(query=query, limit=limit)
            return Response(results, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        


# class LlamaAnswerAPIView(APIView):

#     def post(self, request):
#         query = request.data.get("query")
#         top_k = int(request.data.get("top_k", 3))


#         if not query:
#             return Response({"error": "Query is required"}, status=status.HTTP_400_BAD_REQUEST)

#         try:
#             from .qdrant_vector import search  # Ensure this path is correct
#             result = search(query, limit=top_k)
            
#             return Response(result, status=status.HTTP_200_OK)

#         except Exception as e:
#             return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

#     def get(self, request):
#         return Response({"message": "Send a POST request with a 'query' in the JSON body."})


class LlamaAnswerAPIView(APIView):

    def post(self, request):
        query = request.data.get("query")
        top_k = int(request.data.get("top_k", 3))
        upload_ids = request.data.get("upload_ids", [])

      
        if not query:
            return Response({"error": "Query is required"}, status=status.HTTP_400_BAD_REQUEST)

        if not isinstance(upload_ids, list):
            return Response({"error": "upload_ids must be a list"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from .qdrant_vector import search  
            result = search(query,upload_id=upload_ids, limit=top_k)
            return Response(result, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def get(self, request):
        return Response({"message": "Send a POST request with 'query' and optional 'upload_ids' in the JSON body."})



class UserUploadedFilesView(APIView):
    def get(self, request):
        user_id = request.GET.get("user_id")
        if not user_id:
            return Response({"error": "User ID is required"}, status=status.HTTP_400_BAD_REQUEST)

        uploaded_files = UploadedFile.objects.filter(user_id=user_id, is_deleted=False)
        data = [{
            "upload_id": f.upload_id,
            "name": f.file_name,
            "url": f.file_url,
            "uploadDate": f.created_at.isoformat()
        } for f in uploaded_files]

        return Response(data, status=status.HTTP_200_OK)
