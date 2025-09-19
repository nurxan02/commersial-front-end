# Depod API (Django 5 + DRF + PostgreSQL)

Implements the API required by the Depod frontend.

## Stack

- Django 5
- Django REST Framework
- Simple JWT (access tokens)
- PostgreSQL
- django-cors-headers

## Setup

1. Create and activate a virtualenv.
2. Install dependencies:
   pip install -r backend/requirements.txt
3. Create a .env in backend/ with:

   SECRET_KEY=change-me
   DEBUG=1
   POSTGRES_DB=depod
   POSTGRES_USER=depod
   POSTGRES_PASSWORD=depod
   POSTGRES_HOST=127.0.0.1
   POSTGRES_PORT=5432
   CORS_ALLOWED_ORIGINS=http://127.0.0.1:5500,http://localhost:5500

4. Run migrations:
   python backend/manage.py makemigrations
   python backend/manage.py migrate

5. Create superuser:
   python backend/manage.py createsuperuser

6. Run server:
   python backend/manage.py runserver 0.0.0.0:8000

Media files are served at /media/ in DEBUG.
