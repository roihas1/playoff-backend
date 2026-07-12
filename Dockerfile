# Bookworm-based image: actively patched Node LTS + Debian 12 (fewer stale OS CVEs than older node:18 digests).
FROM node:22-bookworm

ARG APP_UID=1001
ARG APP_GID=1001

# OS deps: Python toolchain, supervisor, git (for cloning StatisticsApi)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        curl \
        python3 \
        python3-pip \
        python3-venv \
        supervisor \
        git \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid ${APP_GID} appuser \
    && useradd --uid ${APP_UID} --gid appuser --shell /bin/bash --create-home appuser

# --- NestJS service (playoff-backend) ---
WORKDIR /app/playoff-backend

COPY package*.json ./

RUN npm install

COPY . .

COPY --chmod=755 wait-for-fastapi.sh /app/playoff-backend/wait-for-fastapi.sh

RUN npm rebuild bcrypt --build-from-source \
    && mkdir -p /app/playoff-backend/logs

# --- FastAPI service (StatisticsApi): clone venv + deps in one layer ---
ARG STATS_API_REF=main
ENV PATH="/opt/venv/bin:$PATH"

RUN git clone --depth 1 --branch ${STATS_API_REF} \
        https://github.com/roihas1/StatisticsApi.git /app/statistics-api \
    && python3 -m venv /opt/venv \
    && pip install --no-cache-dir -r /app/statistics-api/app/requirements.txt \
    && pip install --no-cache-dir motor python-dotenv nba-api

# --- Supervisor (app-writable config path for non-root runtime) ---
COPY supervisord.conf /app/playoff-backend/supervisord.conf

RUN chown -R appuser:appuser /app/playoff-backend /app/statistics-api /opt/venv

ENV PORT=3000

EXPOSE 3000

USER appuser

CMD ["/usr/bin/supervisord", "-c", "/app/playoff-backend/supervisord.conf", "-n"]
