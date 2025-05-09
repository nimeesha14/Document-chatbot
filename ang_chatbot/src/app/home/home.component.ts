import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { Router } from '@angular/router';
import { Emitters } from '../emitters/emitters';

interface ChatMessage {
  message: string;
  isChatbot: boolean;
  fileName?: string;
  fileUrl?: string;
  fileData?: string;
}
interface ChatSession {
  id: number;
  messages: ChatMessage[];
  uploadedText?: string; 
}
interface UploadedFile {
  upload_id: number;
  name: string;
  url: string;
  size?: number;
  uploadDate?: string;
}
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, OnDestroy {
  uploadIds: string[] = [];
  message = '';
  chatHistory: ChatMessage[] = [];
  loading = false;
  chatHistoryList: ChatSession[] = [];
  currentChatIndex: number = 0;
  selectedDropdown: number | null = null;
  showNotification = false;
  notificationMessage = '';
  isLoggedIn = false;
  selectedFile: File | null = null;
  uploadedFiles: UploadedFile[] = [];
  isUploading = false;
  uploadProgress = 0;
  private notificationTimeout: any;
  private uploadInterval: any;
  showMoreFiles = false;
  readonly MAX_FILES = 3;
  userName = '';
  constructor(
    private http: HttpClient,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.checkAuthStatus();
    this.startNewChat();
    // this.loadUploadedFiles();
    const userId = localStorage.getItem("user_id");
    console.log("User ID on login:", userId);
    if (userId) {
      this.loadUserFilesFromBackend(+userId);
    }
  }

  private showNotificationFor2000Seconds(message: string, isLoggedIn: boolean): void {
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }
    this.notificationMessage = message;
    this.isLoggedIn = isLoggedIn;
    this.showNotification = true;
    this.notificationTimeout = setTimeout(() => {
      this.showNotification = false;
    }, 2000);
  }
  private checkAuthStatus(): void {
    this.http.get('http://localhost:8000/api/user/', { withCredentials: true }).subscribe({
      next: (res: any) => {
        if (res && res.name) {
          this.showNotificationFor2000Seconds(`Hi ${res.name}`, true);
          Emitters.authEmitter.emit(true);
        } else {
          this.handleNotAuthenticated();
        }
      },
      error: () => {
        this.handleNotAuthenticated();
      }
    });
  }

  private handleNotAuthenticated(): void {
    this.showNotificationFor2000Seconds('You are not logged in', false);
    Emitters.authEmitter.emit(false);
  }

  handleButtonClick(): void {
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
      fileInput.click();
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];

    if (!file) return;

    if (this.uploadedFiles.length >= this.MAX_FILES) {
      this.showNotificationFor2000Seconds('Maximum 3 files allowed', false);
      event.target.value = '';
      return;
    }
    this.selectedFile = file;
    event.target.value = '';

  //  this.uploadFileToBackend(file);
  }

  onInputTypeChange(type: string): void {
    // debugger;
    if (type === 'text') {
      this.sendTextQuery();  
    } else if (type === 'file') {
      this.handleButtonClick();
    }
  }

  sendTextQuery(): void {
    if (this.selectedFile) {
      this.uploadFileToBackend(this.selectedFile);
    }
    if (!this.message.trim()) return;
    
    const userQuery = this.message;
    this.addMessage(userQuery, false); 
    this.message = ''; 

    // const uploadIds = this.uploadedFiles.map(file => file.upload_id);
    const uploadIds = this.uploadedFiles.map(file => file.upload_id.toString());

    const queryPayload = {
      query: userQuery,
      top_k: 3,
      upload_ids: uploadIds 
    };
    console.log('Sending query to backend:', queryPayload);
  
    this.http.post<any>("http://127.0.0.1:8000/api/answer/", queryPayload, { withCredentials: true })
      .subscribe({
        next: (res) => {
          const answer = res.answer || "No relevant answer found.";
          this.addMessage(answer, true); 
        },
        error: (err) => {
          
          this.addMessage("Sorry, something went wrong.", true);
        }
      });
      
  }
  

  uploadFileToBackend(file: File) {
    if (!file) {
      this.showNotificationFor2000Seconds('No file selected', false);
      return;
    }

    this.loading = true;
    this.isUploading = true;
    this.uploadProgress = 0;

    // Add loading message in chatbot
    // this.addMessage(`Uploading file: ${file.name}...`, false);

    let lastProgress = 0;
    const progressInterval = setInterval(() => {
      if (this.uploadProgress < 100 && this.isUploading) {
        lastProgress += 10;
        this.uploadProgress = lastProgress;
      }
    }, 350); 

    
    this.http.get<{ id: number }>('http://localhost:8000/api/user/', { withCredentials: true })
      .subscribe({
        next: (res) => {
          if (!res || !res.id) {
            console.error('User not authenticated');
            this.showNotificationFor2000Seconds('User not authenticated', false);
            return;
          }

          const userId = res.id;
          const formData = new FormData();
          formData.append("file", file);
          formData.append("user_id", userId.toString());

          this.http.post<{ file_url: string }>(
            "http://127.0.0.1:8000/api/upload/",
            formData,
            {
              reportProgress: true,
              observe: 'events',
              withCredentials: true,
            }
          ).subscribe({
            next: (event: any) => {
              if (event.type === HttpEventType.UploadProgress) {
                let percentDone = Math.round(event.loaded / (event.total || event.loaded) * 100);
                if (percentDone >= 100) {
                  percentDone = 90;
                }
                this.uploadProgress = Math.min(100, percentDone);

                clearInterval(progressInterval);
              }

              if (event.type === HttpEventType.Response) {
                if (event.body && event.body.file_url) {
                  this.uploadProgress = 100;
                  console.log("File uploaded:", event.body.file_url, "Upload ID:", event.body.upload_id);

                  const fileInfo: UploadedFile = {
                    upload_id: event.body.upload_id,
                    name: file.name,
                    url: event.body.file_url,
                    size: file.size,
                    uploadDate: new Date().toISOString(),
                  };
                  this.uploadedFiles.push(fileInfo); 

                  // this.uploadedFiles = [...this.uploadedFiles, fileInfo];
                  // localStorage.setItem('uploadedFiles', JSON.stringify(this.uploadedFiles));
                 

                  this.addMessage('', false, {
                    fileName: file.name,
                    fileUrl: event.body.file_url
                  });

                  this.showNotificationFor2000Seconds(`File uploaded successfully!`, true);
                  const uploadId = event.body.upload_id;
                  console.log("Uploading File Name:", file.name);
                  console.log("Uploading with Upload ID:", uploadId);
                  const formData = new FormData();
                  formData.append("file", file);  
                  formData.append("upload_id", uploadId); 

                  this.http.post("http://127.0.0.1:8000/api/extract-text/", formData, { withCredentials: true })
                    .subscribe({
                      next: (extractRes) => {
                        console.log("Extraction successful!");
                        console.log("upload_id",uploadId);
                        console.log("Extraction response:", extractRes);
                        this.showNotificationFor2000Seconds("File extraction started!", true);
                      },
                      error: (extractError) => {
                        console.error("Extraction error:", extractError);
                        this.showNotificationFor2000Seconds("File extraction failed!", false);
                      }
                    });


                } else {
                  console.error('Invalid server response:', event.body);
                  this.handleUploadError("Invalid server response");
                }

                this.loading = false;
                this.isUploading = false;
                this.selectedFile = null;
              }
            },
            error: (error) => {
              console.error('Upload error:', error);
              clearInterval(progressInterval);
              this.handleUploadError(error);
            }
          });
        },
        error: (error) => {
          console.error('User authentication error:', error);
          clearInterval(progressInterval);
          this.showNotificationFor2000Seconds('Failed to fetch user ID', false);
          this.loading = false;
          this.isUploading = false;
        }
      });
  }

  private handleUploadError(error: any): void {
    console.error("File upload failed:", error);
    this.loading = false;
    this.isUploading = false;
    this.uploadProgress = 0;
    this.addMessage('Error uploading file. Please try again.', true);
    this.showNotificationFor2000Seconds('Error uploading file', false);
    this.selectedFile = null;
  }

  loadUserFilesFromBackend(userId: number): void {
    console.log('Fetching files for user:', userId);
    this.http.get<any[]>(`http://127.0.0.1:8000/api/user-files?user_id=${userId}`, { withCredentials: true })
      .subscribe({
        next: (files) => {
          console.log('Fetched files:', files); 
          this.uploadedFiles = files;
        },
        error: (err) => {
          console.error("Error fetching user files", err);
          this.uploadedFiles = [];
        }
      });
  }

  downloadFile(file: { name: string, url: string }): void {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.name;
    link.click();
  }

  deleteUploadedFile(file: { name: string, url: string, upload_id: number }): void {
    const index = this.uploadedFiles.findIndex(f => f.name === file.name && f.url === file.url);
    if (index !== -1) {
      this.uploadedFiles.splice(index, 1);
      // this.saveUploadedFiles();
      this.showNotificationFor2000Seconds('File deleted successfully', true);
      this.http.post("http://127.0.0.1:8000/api/delete-file/", {
        file_url: file.url,
        upload_id: file.upload_id
      }).subscribe();
    }
  }
  startNewChat(): void {
    const newChat: ChatSession = {
      id: this.chatHistoryList.length,
      messages: []
    };
    this.chatHistoryList.push(newChat);
    this.currentChatIndex = this.chatHistoryList.length - 1;
    this.chatHistory = this.chatHistoryList[this.currentChatIndex].messages;
  }

  loadChat(index: number): void {
    this.currentChatIndex = index;
    this.chatHistory = this.chatHistoryList[index].messages;
  }

  deleteChat(index: number): void {
    if (index < 0 || index >= this.chatHistoryList.length) return;

    this.chatHistoryList.splice(index, 1);

    if (index === this.currentChatIndex) {
      if (this.chatHistoryList.length > 0) {
        const newIndex = Math.max(0, index - 1);
        this.loadChat(newIndex);
      } else {
        this.startNewChat(); 
      }
    } else if (index < this.currentChatIndex) {
      this.currentChatIndex--; 
    }
    this.selectedDropdown = null;
  }


  private addMessage(message: string, isChatbot: boolean, fileInfo?: { fileName: string, fileUrl: string, fileData?: string }): void {
    const newMessage: ChatMessage = {
      message,
      isChatbot,
      ...(fileInfo && {
        fileName: fileInfo.fileName,
        fileUrl: fileInfo.fileUrl,
        fileData: fileInfo.fileData
      })
    };

    this.chatHistory.push(newMessage);
    this.chatHistoryList[this.currentChatIndex].messages = this.chatHistory;
  }

  toggleDropdown(index: number): void {
    this.selectedDropdown = this.selectedDropdown === index ? null : index;
  }
  toggleFilesDropdown(): void {
    this.showMoreFiles = !this.showMoreFiles;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getFileType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'txt':
        return 'Text Document';
      case 'pdf':
        return 'PDF Document';
      case 'doc':
      case 'docx':
        return 'Word Document';
      default:
        return 'Unknown File Type';
    }
  }

  cancelUpload(): void {
    if (this.uploadInterval) {
      clearInterval(this.uploadInterval);
      this.uploadInterval = null;
    }
    this.isUploading = false;
    this.uploadProgress = 0;
    this.selectedFile = null;
    this.showNotificationFor2000Seconds('Upload cancelled', true);
  }

  removeSelectedFile(): void {
    this.selectedFile = null;
    this.isUploading = false;
    this.uploadProgress = 0;
    if (this.uploadInterval) {
      clearInterval(this.uploadInterval);
      this.uploadInterval = null;
    }
  }

  ngOnDestroy(): void {
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }
    if (this.uploadInterval) {
      clearInterval(this.uploadInterval);
    }
  }
}


