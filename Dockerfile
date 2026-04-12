# --- Stage 1: Build & Dependencies ---
FROM python:3.11-slim as builder

WORKDIR /app

# Install system dependencies for OpenCV and Audio processing
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libasound2-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# --- Stage 2: Runtime ---
FROM python:3.11-slim as runner

WORKDIR /app

# Re-install minimal runtime deps for OpenCV
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

# Copy source code
COPY src/ src/
COPY model/ model/
COPY scripts/ scripts/

ENV PYTHONPATH=/app/src
ENV FLASK_APP=attentia_ai.server
ENV FLASK_RUN_HOST=0.0.0.0
ENV FLASK_RUN_PORT=8000

# Metadata
LABEL maintainer="Backend Lead"
LABEL description="Attentia.ai Real-time Orchestration Engine"

EXPOSE 8000

# Note: Hardware (Camera/Mic) access in Docker containers requires 
# platform-specific passthrough (e.g. --device /dev/video0).
CMD ["python", "scripts/run_server.py"]
