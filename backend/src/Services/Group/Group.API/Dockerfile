# Build context: backend/  (xem docker-compose.yml)
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY Directory.Build.props Directory.Packages.props ./
COPY src/BuildingBlocks/Exe.BuildingBlocks/Exe.BuildingBlocks.csproj src/BuildingBlocks/Exe.BuildingBlocks/
COPY src/BuildingBlocks/Exe.Contracts/Exe.Contracts.csproj src/BuildingBlocks/Exe.Contracts/
COPY src/Services/Group/Group.Repository/Group.Repository.csproj src/Services/Group/Group.Repository/
COPY src/Services/Group/Group.Services/Group.Services.csproj src/Services/Group/Group.Services/
COPY src/Services/Group/Group.API/Group.API.csproj src/Services/Group/Group.API/
RUN dotnet restore src/Services/Group/Group.API/Group.API.csproj

COPY src/BuildingBlocks/Exe.BuildingBlocks/ src/BuildingBlocks/Exe.BuildingBlocks/
COPY src/BuildingBlocks/Exe.Contracts/ src/BuildingBlocks/Exe.Contracts/
COPY src/Services/Group/Group.Repository/ src/Services/Group/Group.Repository/
COPY src/Services/Group/Group.Services/ src/Services/Group/Group.Services/
COPY src/Services/Group/Group.API/ src/Services/Group/Group.API/
RUN dotnet publish src/Services/Group/Group.API/Group.API.csproj -c Release -o /app/publish --no-restore /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
# curl dùng cho healthcheck của docker compose
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
EXPOSE 8080
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Group.API.dll"]
