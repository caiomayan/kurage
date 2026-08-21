# Build stage
FROM maven:3.9.6-eclipse-temurin-21-alpine AS build
WORKDIR /app
COPY pom.xml .
# Baixa as dependências offline para fazer cache no Docker
RUN mvn dependency:go-offline
COPY src ./src
RUN mvn clean package -DskipTests

# Runtime stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Adiciona um usuário não-root por segurança (Best Practice)
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

COPY --from=build /app/target/*.jar app.jar

# Variáveis de ambiente padrão (podem ser sobrescritas no docker-compose)
ENV PORT=8080
ENV JAVA_OPTS="-Xms128m -Xmx350m -XX:+UseG1GC"

EXPOSE ${PORT}

# Executa o Spring Boot com os limites de memória corretos
ENTRYPOINT ["sh", "-c", "java ${JAVA_OPTS} -jar app.jar"]
