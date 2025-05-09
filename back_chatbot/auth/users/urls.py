from django.urls import path
from .views import (
    RegisterView, 
    LoginView, 
    UserView, 
    LogoutView, 
    FileUploadToS3View,
    ExtractTextView,
    SearchSimpleView,
    DeleteFileFromS3View,
    LlamaAnswerAPIView,
    UserUploadedFilesView 
)

urlpatterns = [
    path('register/', RegisterView.as_view()),
    path('login/', LoginView.as_view()),
    path('user/', UserView.as_view()),
    path('logout/', LogoutView.as_view()),
    path('upload/', FileUploadToS3View.as_view()),
    path("extract-text/", ExtractTextView.as_view()),
    path('search/', SearchSimpleView.as_view()),
    path("delete-file/", DeleteFileFromS3View.as_view()),
    path("answer/", LlamaAnswerAPIView.as_view()),
    path("user-files/", UserUploadedFilesView.as_view()),
]

