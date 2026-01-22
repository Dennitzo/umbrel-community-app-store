FROM nginx:1.27.4-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html styles.css dashboard.js kaspa-indexer.svg /usr/share/nginx/html/

EXPOSE 4321

CMD ["nginx", "-g", "daemon off;"]
