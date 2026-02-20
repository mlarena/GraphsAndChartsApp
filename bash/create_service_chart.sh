#!/bin/bash

APP_DIR="/opt/burstroy/graph"
SERVICE_FILE="/etc/systemd/system/burstroy-graph.service"
APP_FILE="$APP_DIR/GraphsAndChartsApp"

# Проверяем существование приложения
if [ ! -f "$APP_FILE" ]; then
    echo "Ошибка: Файл $APP_FILE не найден!"
    exit 1
fi

# Даем права на выполнение
chmod +x "$APP_FILE"
echo "Права на выполнение установлены"

sudo bash -c "cat > $SERVICE_FILE" <<EOF
[Unit]
Description=Burstroy Graph Service
After=network.target

[Service]
WorkingDirectory=$APP_DIR
ExecStart=$APP_FILE --urls "http://*:5003"
Restart=always
RestartSec=10
KillSignal=SIGINT
SyslogIdentifier=burstroy_graph
User=root
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=DOTNET_PRINT_TELEMETRY_MESSAGE=false

[Install]
WantedBy=multi-user.target
EOF

echo "Service файл создан: $SERVICE_FILE"

# Перезагружаем systemd
sudo systemctl daemon-reload
echo "systemd перезагружен"

# Запускаем службу
sudo systemctl start burstroy-graph.service
echo "Служба запущена"

# Показываем статус
sudo systemctl status burstroy-graph.service --no-pager