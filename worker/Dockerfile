# syntax=docker/dockerfile:1
FROM node:20-alpine
WORKDIR /app

# ffmpeg is installed now so the base image is ready the moment the real
# streaming pipeline is implemented on top of this scaffold.
RUN apk add --no-cache ffmpeg

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY tsconfig.json ./
COPY src ./src
RUN npm install typescript tsx --no-save && npx tsc -p tsconfig.json

EXPOSE 8080
CMD ["node", "dist/index.js"]
