FROM node:16-alpine

RUN mkdir /app \
    && chown node:node /app

WORKDIR /app
USER node:node

COPY --chown=node:node package.json package-lock.json /app/
RUN NODE_ENV=development npm ci

ENV NODE_ENV=production
COPY --chown=node:node / /app/
RUN npm run build

CMD ["npm", "run", "start"]
