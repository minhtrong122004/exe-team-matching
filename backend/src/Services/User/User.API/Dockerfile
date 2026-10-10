# Build context: backend/  (xem docker-compose.yml)
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY Directory.Build.props Directory.Packages.props ./
COPY src/BuildingBlocks/Exe.BuildingBlocks/Exe.BuildingBlocks.csproj src/BuildingBlocks/Exe.BuildingBlocks/
COPY src/BuildingBlocks/Exe.Contracts/Exe.Contracts.csproj src/BuildingBlocks/Exe.Contracts/
COPY src/Services/User/User.Repository/User.Repository.csproj src/Services/User/User.Repository/
COPY src/Services/User/User.Services/User.Services.csproj src/Services/User/User.Services/
COPY src/Services/User/User.API/User.API.csproj src/Services/User/User.API/
RUN dotnet restore src/Services/User/User.API/User.API.csproj

COPY src/BuildingBlocks/Exe.BuildingBlocks/ src/BuildingBlocks/Exe.BuildingBlocks/
COPY src/BuildingBlocks/Exe.Contracts/ src/BuildingBlocks/Exe.Contracts/
COPY src/Services/User/User.Repository/ src/Services/User/User.Repository/
COPY src/Services/User/User.Services/ src/Services/User/User.Services/
COPY src/Services/User/User.API/ src/Services/User/User.API/
RUN dotnet publish src/Services/User/User.API/User.API.csproj -c Release -o /app/publish --no-restore /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
# curl dùng cho healthcheck của docker compose
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
EXPOSE 8080
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "User.API.dll"]
