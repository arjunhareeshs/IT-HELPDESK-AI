FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY server/requirements.txt /app/requirements.txt
# CPU-only torch wheels keep the image small; remove the extra index for GPU builds
RUN pip install --no-cache-dir --extra-index-url https://download.pytorch.org/whl/cpu -r requirements.txt

# Copy server code
COPY server /app/server

WORKDIR /app/server
ENV PYTHONPATH=/app/server

EXPOSE 8000

ENV ALLOW_MEMORY_FALLBACK=false

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

