from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct, VectorParams, Distance
from qdrant_client.models import Filter, FieldCondition, MatchAny
from langchain_huggingface import HuggingFaceEmbeddings
from .models import VectorEmbedding, UploadedFile
import os
import pdfplumber
import docx
import textract
import uuid
import re
import requests
from django.conf import settings


embedding_model = HuggingFaceEmbeddings(
    model_name="BAAI/bge-large-en",
    model_kwargs={"device": "cpu"},
    encode_kwargs={"normalize_embeddings": False}
)

sample_vector = embedding_model.embed_query("test")
vector_dim = len(sample_vector)


client = QdrantClient("localhost", port=6333)
collection_name = "vector_search"

existing_collections = [col.name for col in client.get_collections().collections]
if collection_name not in existing_collections:
    client.create_collection(
        collection_name=collection_name,
        vectors_config=VectorParams(
            size=vector_dim,
            distance=Distance.COSINE
        )
    )

def chunk_text(text, chunk_size=500):
    sentences = re.split(r'(?<=[.!?]) +', text)
    chunks = []
    current_chunk = ""
    for sentence in sentences:
        if len(current_chunk) + len(sentence) <= chunk_size:
            current_chunk += sentence + " "
        else:
            chunks.append(current_chunk.strip())
            current_chunk = sentence + " "
    if current_chunk:
        chunks.append(current_chunk.strip())
    return chunks

def read_text(file_path):
    ext = os.path.splitext(file_path)[1].lower()
    try:
        if ext == ".txt":
            with open(file_path, "r", encoding="utf-8") as f:
                return f.read()
        elif ext == ".pdf":
            text = ""
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
            return text
        elif ext == ".docx":
            doc = docx.Document(file_path)
            return "\n".join([para.text for para in doc.paragraphs])
        elif ext == ".doc":
            return textract.process(file_path).decode("utf-8")
        else:
            raise ValueError(f"Unsupported file format: {ext}")
    except Exception as e:
        raise Exception(f"Failed to extract text from {file_path}: {e}")

def extract_text(file_path, upload_id, file_name, chunk_size=1000):
    try:
        text = read_text(file_path)
        chunks = chunk_text(text, chunk_size)
        points = []
        for idx, chunk in enumerate(chunks):
            vector = embedding_model.embed_documents([chunk])[0]
            data_dict = {
                "file_name": file_name,
                "chunk_id": str(uuid.uuid4()),
                "description": chunk,
                "upload_id": upload_id,
            }
            point_id = str(uuid.uuid4())
            upload_obj = UploadedFile.objects.get(upload_id=upload_id)
            VectorEmbedding.objects.create(upload=upload_obj, vector_id=point_id)
            points.append(PointStruct(
                id=point_id,
                vector=vector,
                payload=data_dict
            ))
        client.upsert(
            collection_name=collection_name,
            points=points
        )
        upload_obj = UploadedFile.objects.get(upload_id=upload_id)
        VectorEmbedding.objects.create(upload=upload_obj, vector_id=point_id)
        
    except Exception as e:
        return {"error": f"Error processing file: {e}"}

API_URL = "https://openrouter.ai/api/v1/chat/completions"
HEADERS = {
    "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
    "Content-Type": "application/json"
}

def ask_llama(query, context):
    prompt = (
        f"Answer the following question based only on the context below.\n\n"
        f"Context: {context}\n\n"
        f"Question: {query}\n\n"
        f"Answer in 1-2 clear sentences."
    )
    payload = {
        "model": "meta-llama/llama-3-70b-instruct",  
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.3,
        "max_tokens": 200
    }
    response = requests.post(API_URL, headers=HEADERS, json=payload)
    if response.status_code == 200:
        return response.json()['choices'][0]['message']['content'].replace('\n', ' ').strip().lower()
    else:
        return f"[Error] {response.status_code}: {response.text}"

# def search(query, limit=3):
#     try:
#         vector = embedding_model.embed_query(query)
#         hits = client.search(
#             collection_name=collection_name,
#             query_vector=vector,
#             limit=limit
#         )
#         if not hits:
#             return {"message": "No similar chunks found."}
        
#         combined_context = " ".join([
#             h.payload.get("description", "").replace('\n', ' ').strip().lower()
#             for h in hits
#         ])

#         short_answer = ask_llama(query, combined_context)
#         return {
#             "query": query,
#             "answer": short_answer,
#             "source": combined_context
#         }

#     except Exception as e:
#         return {"error": str(e)}


def search(query, upload_id, limit=3):
    try:
        if not upload_id or not isinstance(upload_id, list):
            return {"error": "No valid uploaded file IDs provided."}
        vector = embedding_model.embed_query(query)
        payload_filter = Filter(
            must=[
                FieldCondition(
                    key="upload_id",
                    match=MatchAny(any=upload_id)
                )
            ]
        )
        hits = client.search(
            collection_name=collection_name,
            query_vector=vector,
            limit=limit,
            query_filter=payload_filter
        )

        if not hits:
            return {"message": "No similar chunks found."}
        
        combined_context = " ".join([
            h.payload.get("description", "").replace('\n', ' ').strip().lower()
            for h in hits if h.payload
        ])
        answer = ask_llama(query, combined_context)
        print(f"Answer generated: {answer}")
        return {
            "query": query,
            "answer": answer,
            "source": combined_context
        }
        
    except Exception as e:
        return {"error": str(e)}


