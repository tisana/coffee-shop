FROM node:24-alpine AS deps
WORKDIR /app

COPY package*.json ./
COPY apps/staff-web/package.json apps/staff-web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

FROM deps AS build
COPY tsconfig.base.json ./
COPY apps/staff-web apps/staff-web
COPY packages/shared packages/shared
RUN npm run build --workspace @coffee-shop/shared
RUN npm run build --workspace @coffee-shop/staff-web

FROM nginx:1.27-alpine AS runner
COPY --from=build /app/apps/staff-web/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
