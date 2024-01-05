FROM nginx:alpine
RUN apk add --update nodejs npm
WORKDIR /mpw
COPY . .
RUN cp chain_params.test.json chain_params.json
RUN npm ci
RUN npm run build
RUN mv dist/* /usr/share/nginx/html/
EXPOSE 80
