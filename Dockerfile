FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache git

COPY package*.json ./
RUN npm ci

COPY . .
ARG API_BASE_URL=/api
ENV API_BASE_URL=${API_BASE_URL}
RUN npm run build -- --configuration=production

FROM nginx:alpine AS runtime
# Copy the built Angular app directory (adjust the app name if it changes)
COPY --from=build /app/dist/scolari-main-app-frt/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80