FROM node:20-alpine

RUN apk add --no-cache ffmpeg python3 py3-pip \
  && pip3 install yt-dlp --break-system-packages

WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .

EXPOSE 4000
CMD ["node", "server.js"]
