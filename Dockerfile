FROM --platform=$BUILDPLATFORM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /app

# Copy csproj and restore as distinct layers
COPY src/Sanad.Api/Sanad.Api.csproj src/Sanad.Api/
RUN dotnet restore src/Sanad.Api/Sanad.Api.csproj

# Copy everything else and build
COPY src/ src/
WORKDIR /app/src/Sanad.Api
RUN dotnet publish -c Release -o /app/publish

# Build runtime image
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app/publish .

# Expose port and configure ASP.NET Core variables
ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://+:8080

EXPOSE 8080
ENTRYPOINT ["dotnet", "Sanad.Api.dll"]
