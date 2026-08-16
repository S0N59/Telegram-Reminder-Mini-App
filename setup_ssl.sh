#!/bin/bash
sudo openssl req -newkey rsa:2048 -sha256 -nodes -keyout /etc/nginx/cert.key -x509 -days 3650 -out /etc/nginx/cert.pem -subj "/O=ReminderBot/CN=141.147.53.77"

cat << 'EOF' > nginx.conf
server {
    listen 80;
    server_name 141.147.53.77;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name 141.147.53.77;

    ssl_certificate /etc/nginx/cert.pem;
    ssl_certificate_key /etc/nginx/cert.key;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

sudo mv nginx.conf /etc/nginx/sites-available/reminder
sudo systemctl restart nginx
