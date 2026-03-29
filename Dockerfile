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

# Create SQLite database directory and generate secret key at build time
RUN mkdir -p /app/data
RUN python3 -c "import secrets; f=open('/app/.secret_key','w'); f.write(secrets.token_urlsafe(64)); f.close()"

# Create entrypoint script that sets SECRET_KEY from file if not provided
RUN echo '#!/bin/bash\nif [ -z "$SECRET_KEY" ]; then export SECRET_KEY=$(cat /app/.secret_key); fi\nexec "$@"' > /app/entrypoint.sh && chmod +x /app/entrypoint.sh

# Expose port (HuggingFace uses 7860)
EXPOSE 7860

# Set environment variables (SECRET_KEY generated at runtime from .secret_key file)
ENV DATABASE_URL=sqlite:///./data/cryptostock.db
ENV HOST=0.0.0.0
ENV PORT=7860
ENV DEBUG=false
ENV ALLOWED_ORIGINS=["*"]

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
