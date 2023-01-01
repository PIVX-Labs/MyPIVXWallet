FROM nginx:alpine

RUN apk add --update nodejs npm
COPY . /src
WORKDIR /src
RUN npm i
RUN npm run build
COPY dist/ /usr/share/nginx/html/

EXPOSE 80
