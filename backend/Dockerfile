FROM python:3.11.3-alpine

ENV PYTHONUNBUFFERED=True
ENV APP_HOME=/app
ENV GOOGLE_API_KEY=""

WORKDIR $APP_HOME

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    rm -rf /root/.cache/pip

COPY main.py .

EXPOSE 8080

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]