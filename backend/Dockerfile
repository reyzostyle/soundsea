FROM node:20-alpine

RUN apk add --no-cache ffmpeg python3 py3-pip git

# Bump the date below to force a fresh yt-dlp install (busts Docker layer cache)
ENV YTDLP_REFRESH=2026-06-13
RUN pip3 install -U yt-dlp bgutil-ytdlp-pot-provider --break-system-packages

# PO token provider server — required for YouTube downloads from datacenter IPs
RUN git clone --depth 1 https://github.com/Brainicism/bgutil-ytdlp-pot-provider.git /opt/pot \
  && cd /opt/pot/server \
  && npm install \
  && npx tsc

WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .

EXPOSE 4000
# start the PO token provider (port 4416, auto-detected by the yt-dlp plugin), then the app
CMD ["sh", "-c", "node /opt/pot/server/build/main.js & exec node server.js"]
