FROM nginx:alpine

RUN apk add --update nodejs npm
COPY . /src
WORKDIR /src
COPY dist/ /usr/share/nginx/html/

EXPOSE 80
