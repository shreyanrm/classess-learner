# syntax=docker/dockerfile:1
# Classess model gateway. Build from the REPO ROOT (the uv workspace is the context):
#   docker build -f services/gateway/Dockerfile -t classess-gateway .
# Secrets NEVER bake into this image — everything arrives via environment at runtime.

FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS build
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy UV_PYTHON_DOWNLOADS=0
WORKDIR /app

# Manifests first: the third-party dependency layer caches until a manifest changes.
# Every workspace member's pyproject must be present for --frozen to accept the lock.
COPY pyproject.toml uv.lock ./
COPY services/contracts/pyproject.toml services/contracts/
COPY services/verifier/pyproject.toml services/verifier/
COPY services/gateway/pyproject.toml services/gateway/
COPY content/atom/pyproject.toml content/atom/
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev --no-editable --no-install-workspace --package classess-gateway

# Sources second: a code change only rebuilds the small workspace wheels.
COPY services/contracts/src services/contracts/src
COPY services/verifier/src services/verifier/src
COPY services/gateway/src services/gateway/src
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev --no-editable --package classess-gateway

FROM python:3.12-slim-bookworm
RUN useradd --create-home --uid 10001 gateway
WORKDIR /app
COPY --from=build --chown=gateway:gateway /app/.venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH" \
    PLEXUS_CACHE_DIR=/home/gateway/cache \
    CLASSESS_IMAGE_CACHE_DIR=/home/gateway/cache/images
USER gateway
EXPOSE 8081

# Container-level liveness (Fly/Render run their own HTTP checks against /healthz too).
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
    CMD python -c "import os,urllib.request; urllib.request.urlopen('http://127.0.0.1:' + os.environ.get('PORT', '8081') + '/healthz').read()" || exit 1

# Render injects PORT; Fly routes to internal_port 8081. --no-access-log: the app emits
# its own structured JSON request lines, uvicorn's plaintext ones would just duplicate.
CMD ["sh", "-c", "uvicorn classess_gateway.app:app --host 0.0.0.0 --port ${PORT:-8081} --no-access-log"]
