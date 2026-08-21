#!/bin/bash

# Este script deve ser rodado dentro da sua instância EC2.

# 1. Atualiza os pacotes e instala o Docker (Amazon Linux 2023)
sudo yum update -y
sudo yum install docker -y
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -a -G docker ec2-user

# 2. Instala o Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 3. Cria a pasta do projeto
mkdir -p ~/inoue-backend
cd ~/inoue-backend

# 4. Cria o arquivo docker-compose.yml
# Lembre-se de substituir <SEU_DOCKER_HUB_USERNAME> pelo seu usuário do Docker Hub
cat << 'EOF' > docker-compose.yml
version: '3.8'

services:
  db:
    image: postgres:16-alpine
    container_name: inoue_postgres
    restart: always
    environment:
      POSTGRES_USER: ${DB_USER:-postgres}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-postgres}
      POSTGRES_DB: ${DB_NAME:-inouedb}
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    deploy:
      resources:
        limits:
          memory: 500M

  redis:
    image: redis:7-alpine
    container_name: inoue_redis
    restart: always
    ports:
      - "6379:6379"
    deploy:
      resources:
        limits:
          memory: 200M

  api:
    image: <SEU_DOCKER_HUB_USERNAME>/inoue-api:latest
    container_name: inoue_api
    restart: always
    depends_on:
      - db
      - redis
    ports:
      - "80:8080" # Roteia a porta 80 da EC2 para a porta 8080 da API
    environment:
      - BACKEND_URL=${BACKEND_URL:-https://api-inoue.caiomayan.com}
      - COOKIE_DOMAIN=${COOKIE_DOMAIN:-caiomayan.com}
      - SPRING_DATASOURCE_URL=jdbc:postgresql://db:5432/${DB_NAME:-inouedb}
      - SPRING_DATASOURCE_USERNAME=${DB_USER:-postgres}
      - SPRING_DATASOURCE_PASSWORD=${DB_PASSWORD:-postgres}
      - SPRING_DATA_REDIS_HOST=redis
      - SPRING_DATA_REDIS_PORT=6379
      # Adicione suas chaves reais aqui no ambiente de produção:
      - DISCORD_CLIENT_ID=${DISCORD_CLIENT_ID}
      - DISCORD_CLIENT_SECRET=${DISCORD_CLIENT_SECRET}
      - DISCORD_BOT_TOKEN=${DISCORD_BOT_TOKEN}
      - FACEIT_API_KEY=${FACEIT_API_KEY}
      - SPOTIFY_CLIENT_ID=${SPOTIFY_CLIENT_ID}
      - SPOTIFY_CLIENT_SECRET=${SPOTIFY_CLIENT_SECRET}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    deploy:
      resources:
        limits:
          memory: 1000M

volumes:
  pgdata:
EOF

echo ""
echo "=========================================================================="
echo "Instalação concluída! Para aplicar as permissões do Docker, FAÇA LOGOUT (digite exit) e entre na EC2 novamente."
echo "Depois de entrar, edite o docker-compose.yml para colocar suas chaves da API e seu username do Docker Hub:"
echo "nano ~/inoue-backend/docker-compose.yml"
echo ""
echo "E por fim, suba o servidor com:"
echo "cd ~/inoue-backend && docker-compose up -d"
echo "=========================================================================="
