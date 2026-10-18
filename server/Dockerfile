FROM python:3.11-slim

WORKDIR /app

RUN pip install --no-cache-dir hatchling

COPY pyproject.toml README.md ./
RUN pip install --no-cache-dir .

COPY src/ src/
RUN pip install --no-cache-dir --no-deps -e .

EXPOSE 8000

ENTRYPOINT ["tailwatch"]
CMD ["api"]
