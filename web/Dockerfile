FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM alpine:latest
COPY --from=build /app/dist /srv
CMD ["sh", "-c", "cp -r /srv/* /web-dist/ && tail -f /dev/null"]
