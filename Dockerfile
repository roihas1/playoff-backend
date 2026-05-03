FROM node:18

# OS deps: Python toolchain, supervisor, git (for cloning StatisticsApi)
RUN apt-get update && apt-get install -y --no-install-recommends \
        python3 python3-pip python3-venv supervisor git ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# --- NestJS service (playoff-backend) ---
WORKDIR /app/playoff-backend

COPY package*.json ./

RUN npm install

COPY . .

RUN npm rebuild bcrypt --build-from-source \
    && mkdir -p /app/playoff-backend/logs \
    && chmod -R 777 /app/playoff-backend/logs

# --- FastAPI service (StatisticsApi) ---
ARG STATS_API_REF=main
RUN git clone --depth 1 --branch ${STATS_API_REF} \
        https://github.com/roihas1/StatisticsApi.git /app/statistics-api

# Isolated venv to avoid PEP 668 issues on Debian Bookworm
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# requirements.txt is missing motor + python-dotenv (used by database.py); add them explicitly
RUN pip install --no-cache-dir -r /app/statistics-api/app/requirements.txt \
    && pip install --no-cache-dir motor python-dotenv

# --- Supervisor ---
COPY supervisord.conf /etc/supervisor/conf.d/services.conf

ENV PORT=3000

EXPOSE 3000 8000

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/services.conf", "-n"]
