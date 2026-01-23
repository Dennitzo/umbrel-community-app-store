FROM nginx:1.27.4-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html styles.css dashboard.js kaspa-database.svg /usr/share/nginx/html/

EXPOSE 19111

CMD ["nginx", "-g", "daemon off;"]
