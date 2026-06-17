FROM python:3.13

WORKDIR /app

COPY . .

CMD ["python", "bot.py"]