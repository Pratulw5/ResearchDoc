# 📚 ResearchDoc

## 1. Project Introduction

**ResearchDoc** is an AI-powered Research Management SaaS designed to solve the "information overload" problem in academia and industry.

While standard tools simply store files, ResearchDoc acts as a **co-researcher**. It uses **Retrieval-Augmented Generation (RAG)** to:

- Allow users to "talk" to their library of papers  
- Automatically extract data for comparison tables  
- Generate summaries with verifiable citations  

Built on **Django**, it provides a secure, scalable environment for managing complex research workflows.

---

## 2. Feature-by-Feature Tech Stack

| Feature | Primary Tech (Django-based) | AI / Specialized Integration |
|--------|----------------------------|------------------------------|
| User & Project Management | Django Auth, PostgreSQL | Role-Based Access Control (RBAC) |
| Resource Ingestion | Django `FileField`, AWS S3 | Celery + Redis for background PDF processing |
| Document Parsing | PyMuPDF or Grobid | Layout analysis (text, tables, images) |
| Talk to Paper (RAG) | LangChain / LlamaIndex | OpenAI API (GPT-4o) or Anthropic Claude |
| Semantic Search | pgvector (Postgres extension) | HuggingFace Embeddings (Sentence Transformers) |
| Auto Comparison Tables | Django Templates / React | LLM-based schema extraction |
| Export to Sheets | Django / APIs | Google Sheets API |

---

## 3. Phase-by-Phase Development Plan

### Phase 1: The Core Foundation (Week 3–4)

- **Setup:** Initialize Django project with PostgreSQL (install `pgvector` early)  
- **Modeling:** Create models for `Project`, `ResearchPaper`, and `Note`  
- **Uploads:** Implement basic PDF uploading and storage logic  
- **Auth:** Set up user registration and project-based permissions  

---

### Phase 2: The AI Data Pipeline (Week 5–6)

- **Processing:** Integrate Celery. Trigger a task to extract text on PDF upload  
- **Embeddings:** Convert extracted text into vectors and store in `pgvector`  
- **Basic Search:** Implement semantic search using vector similarity  

---

### Phase 3: The Research Assistant (Week 7–9)

- **RAG Implementation:** Build "Chat with Paper" interface using LLM  
- **Citations:** Return source IDs for traceability  
- **Summarization:** Add one-click summary for each paper  

---

### Phase 4: Product Comparisons & UI Refinement (Week 10–12)

- **Extraction:** Extract attributes (e.g., Accuracy, Price, Year) into JSON  
- **Tables:** Render JSON into clean, sortable tables  
- **Polishing:** Add dashboard for project progress and activity  
