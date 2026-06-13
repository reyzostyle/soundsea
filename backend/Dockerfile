FROM node:20-alpine

RUN apk add --no-cache ffmpeg python3 py3-pip

# Bump the date below to force a fresh yt-dlp install (busts Docker layer cache)
ENV YTDLP_REFRESH=2026-06-13
RUN pip3 install -U yt-dlp --break-system-packages

WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .

EXPOSE 4000
CMD ["node", "server.js"]
