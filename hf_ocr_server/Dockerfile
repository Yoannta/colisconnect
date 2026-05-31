# Utilisation d'une image Python légère
FROM python:3.9-slim

# On installe les dépendances système modernes pour PaddleOCR
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Création d'un utilisateur non-root pour Hugging Face
RUN useradd -m -u 1000 user
USER user
ENV PATH="/home/user/.local/bin:$PATH"

WORKDIR /app

# Installation des dépendances Python
COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --upgrade -r requirements.txt

# Copie du code source
COPY --chown=user . .

# Hugging Face Spaces écoute sur le port 7860
EXPOSE 7860

# Lancement du serveur avec Uvicorn
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
