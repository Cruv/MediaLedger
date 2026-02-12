FROM python:3.12-slim AS base

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# ------- Development target -------
FROM base AS development
RUN pip install --no-cache-dir pytest pytest-asyncio
EXPOSE 8000

# ------- Production target -------
FROM base AS production

RUN apt-get update && \
    apt-get install -y --no-install-recommends gosu && \
    rm -rf /var/lib/apt/lists/* && \
    mkdir -p /config /defaults

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENV PUID=1000 \
    PGID=1000 \
    TZ=Etc/UTC \
    PYTHONPATH=/app

VOLUME /config
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')"

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["sh", "-c", "cd /app && alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
