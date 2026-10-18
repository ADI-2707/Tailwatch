FROM python:3.11-slim
WORKDIR /app
RUN pip install --no-cache-dir httpx
COPY . /app/chaos
ENV PYTHONPATH=/app
ENTRYPOINT ["python", "-m", "chaos.chaosctl"]
CMD ["run", "--scenario", "steady", "--duration", "3600"]
