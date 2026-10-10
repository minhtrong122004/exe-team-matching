# Build context: backend/  (xem docker-compose.yml)
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY Directory.Build.props Directory.Packages.props ./
COPY src/BuildingBlocks/Exe.BuildingBlocks/Exe.BuildingBlocks.csproj src/BuildingBlocks/Exe.BuildingBlocks/
COPY src/BuildingBlocks/Exe.Contracts/Exe.Contracts.csproj src/BuildingBlocks/Exe.Contracts/
COPY src/Services/Auth/Auth.Repository/Auth.Repository.csproj src/Services/Auth/Auth.Repository/
COPY src/Services/Auth/Auth.Services/Auth.Services.csproj src/Services/Auth/Auth.Services/
COPY src/Services/Auth/Auth.API/Auth.API.csproj src/Services/Auth/Auth.API/
RUN dotnet restore src/Services/Auth/Auth.API/Auth.API.csproj

COPY src/BuildingBlocks/Exe.BuildingBlocks/ src/BuildingBlocks/Exe.BuildingBlocks/
COPY src/BuildingBlocks/Exe.Contracts/ src/BuildingBlocks/Exe.Contracts/
COPY src/Services/Auth/Auth.Repository/ src/Services/Auth/Auth.Repository/
COPY src/Services/Auth/Auth.Services/ src/Services/Auth/Auth.Services/
COPY src/Services/Auth/Auth.API/ src/Services/Auth/Auth.API/
RUN dotnet publish src/Services/Auth/Auth.API/Auth.API.csproj -c Release -o /app/publish --no-restore /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
# curl dùng cho healthcheck của docker compose
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
EXPOSE 8080
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Auth.API.dll"]
