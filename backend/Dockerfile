# Debian instead of Alpine: the PO token provider depends on the native "canvas"
# module, which only ships prebuilt binaries for glibc
FROM node:20-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg python3 python3-pip git ca-certificates curl unzip \
  && rm -rf /var/lib/apt/lists/*

# Deno: JS runtime yt-dlp needs to solve the "n" signature challenge (EJS)
RUN curl -fsSL https://deno.land/install.sh | sh
ENV PATH="/root/.deno/bin:${PATH}"

# Bump the date below to force a fresh yt-dlp install (busts Docker layer cache)
ENV YTDLP_REFRESH=2026-08-11
# curl_cffi lets yt-dlp impersonate a real browser's TLS fingerprint — TikTok's
# datacenter-IP anti-bot checks fail requests without it
RUN pip3 install -U yt-dlp bgutil-ytdlp-pot-provider curl_cffi --break-system-packages

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
