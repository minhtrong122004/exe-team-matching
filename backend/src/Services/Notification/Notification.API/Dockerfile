# Build context: backend/  (xem docker-compose.yml)
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY Directory.Build.props Directory.Packages.props ./
COPY src/BuildingBlocks/Exe.BuildingBlocks/Exe.BuildingBlocks.csproj src/BuildingBlocks/Exe.BuildingBlocks/
COPY src/BuildingBlocks/Exe.Contracts/Exe.Contracts.csproj src/BuildingBlocks/Exe.Contracts/
COPY src/Services/Notification/Notification.Repository/Notification.Repository.csproj src/Services/Notification/Notification.Repository/
COPY src/Services/Notification/Notification.Services/Notification.Services.csproj src/Services/Notification/Notification.Services/
COPY src/Services/Notification/Notification.API/Notification.API.csproj src/Services/Notification/Notification.API/
RUN dotnet restore src/Services/Notification/Notification.API/Notification.API.csproj

COPY src/BuildingBlocks/Exe.BuildingBlocks/ src/BuildingBlocks/Exe.BuildingBlocks/
COPY src/BuildingBlocks/Exe.Contracts/ src/BuildingBlocks/Exe.Contracts/
COPY src/Services/Notification/Notification.Repository/ src/Services/Notification/Notification.Repository/
COPY src/Services/Notification/Notification.Services/ src/Services/Notification/Notification.Services/
COPY src/Services/Notification/Notification.API/ src/Services/Notification/Notification.API/
RUN dotnet publish src/Services/Notification/Notification.API/Notification.API.csproj -c Release -o /app/publish --no-restore /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
# curl dùng cho healthcheck của docker compose
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
EXPOSE 8080
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Notification.API.dll"]
