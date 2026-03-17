FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npx nest build
EXPOSE 3002
CMD ["node", "dist/main"]
