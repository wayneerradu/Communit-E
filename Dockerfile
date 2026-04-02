FROM node:22-alpine

WORKDIR /app

COPY package.json package.json
COPY prisma prisma

RUN npm install

COPY . .

RUN npm run db:generate
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start:cloud"]
