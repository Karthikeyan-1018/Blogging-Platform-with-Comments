FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -q dependency:go-offline
COPY src ./src
RUN mvn -q package -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENV DB_URL=jdbc:mysql://mysql:3306/demo \
    DB_USERNAME=root \
    DB_PASSWORD=rootpass123
ENTRYPOINT ["java", "-jar", "app.jar"]