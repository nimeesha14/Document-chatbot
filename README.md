# 🤖 Intelligent Document Chatbot

Welcome to the **Intelligent Document Chatbot**, a powerful AI assistant that enables users to upload documents and ask intelligent questions based on document content. Built with **Angular**, **Django**, **PostgreSQL**, **Qdrant**, and **LLaMA**, this solution offers fast and accurate document-based responses using state-of-the-art natural language processing.

---
## 🧠 How It Works

1. 🔐 User registers and logs in with JWT authentication.
2. 📤 Upload up to **three** documents (`PDF`, `DOC`, `TXT` formats only).
3. ☁️ Documents are stored in **AWS S3**.
4. 🧩 The content is chunked and stored in **Qdrant** (vector DB).
5. 🧠 The **LLaMA model** analyzes chunks and responds to user queries.
6. 💬 Users get fast, accurate, and summarized responses.

---

## 🚀 Tech Stack

| Layer       | Technology       |
|-------------|------------------|
| **Frontend**| Angular           |
| **Backend** | Django (REST API) |
| **Database**| PostgreSQL        |
| **Auth**    | JWT Tokens        |
| **Storage** | AWS S3            |
| **Vector DB**| Qdrant           |
| **LLM**     | LLaMA             |

---


## 📁 Upload Guidelines

- ✅ Allowed formats: `.pdf`, `.doc`, `.txt`
- 🚫 Limit: **3 files per user**
- 📦 Files stored on: **AWS S3**
- 🔎 Chunks indexed in: **Qdrant**

---

## 🛠️ Backend Endpoints

### 1. **Register User**
**POST** `/api/register/`  
Create a new user with username and password.

---

### 2. **Login User**
**POST** `/api/login/`  
Returns JWT access and refresh tokens.

---

### 3. **Upload Document**
**POST** `/api/upload/`  
Uploads a document (max 3 per user), stores in AWS S3, and indexes chunks.

---

### 4. **Ask a Question**
**POST** `/api/answer/`  
Sends a user question to LLaMA using document chunks.

---

### 5. **View Uploaded Documents**
**GET** `/api/user-files/`  
Returns list of uploaded files.

---

## 🖼️ Screenshots

### Register Page
<img width="960" alt="1" src="https://github.com/user-attachments/assets/dded8614-958b-400f-b16f-d5fb68649229" />


### Login Page
<img width="960" alt="4" src="https://github.com/user-attachments/assets/0cdae5d7-c19d-43de-8ff9-907c066f0f7d" />
<img width="960" alt="5" src="https://github.com/user-attachments/assets/e61bb505-a603-409b-ab4e-916e6087cf7d" />




### Chatbot Interaction
<img width="960" alt="chat_final" src="https://github.com/user-attachments/assets/10b69059-8f36-4d31-9fe3-9151f0f10e87" />
<img width="960" alt="7" src="https://github.com/user-attachments/assets/9991b4b9-93a5-4b22-adce-7a5dada367c2" />
<img width="960" alt="8" src="https://github.com/user-attachments/assets/91deab9f-48e9-422f-81cf-d1a71aa146d3" />
<img width="960" alt="9" src="https://github.com/user-attachments/assets/f1c71b1b-303b-419e-b9d7-7f28270693f4" />

## Ask question
<img width="960" alt="uploadqurty1" src="https://github.com/user-attachments/assets/12480b52-42e4-4d01-97bf-27d761b38a60" />

---

## 📊 Features Summary

- 🔐 **JWT Authentication**
- 📄 **Document Upload (Max 3)**
- ☁️ **AWS S3 Storage**
- 🧩 **Text Chunking**
- 🔎 **Qdrant Semantic Search**
- 🧠 **LLaMA Summarized Answers**
- 💬 **Multiple Queries Supported**

---

## ⚙️ Setup Instructions

### 📌 Prerequisites

- Python 3.11+
- Node.js & Angular CLI
- PostgreSQL
- AWS Account (for S3)
- Qdrant running locally or hosted

---
### 🚧 Running the Full Stack


- **Backend (Django)**  
  - **URL:** [http://localhost:8000](http://localhost:8000)  
  - **Command to run:**
    ```bash
    python manage.py runserver
    ```



- **Frontend (Angular)**  
  - **URL:** [http://localhost:4200](http://localhost:4200)  
  - **Command to run:**
    ```bash
    npm start
    ```
---


