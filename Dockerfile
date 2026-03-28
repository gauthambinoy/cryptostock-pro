FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN VITE_API_URL=/api npm run build

FROM python:3.11-slim
WORKDIR /app

# Install system deps
RUN apt-get update && apt-get install -y --no-install-recommends gcc && rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir scikit-learn

# Copy backend
COPY backend/ .

# Copy frontend build
COPY --from=frontend-builder /app/frontend/dist /app/static

# Create SQLite database directory
RUN mkdir -p /app/data

# Expose port (HuggingFace uses 7860)
EXPOSE 7860

# Set environment variables
ENV DATABASE_URL=sqlite:///./data/cryptostock.db
ENV SECRET_KEY=hf-spaces-cryptostock-pro-secret-key-2024
ENV HOST=0.0.0.0
ENV PORT=7860
ENV DEBUG=false
ENV ALLOWED_ORIGINS=["*"]

# Start the app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
