#!/bin/bash

ZIP_FILE="/opt/burstroy/tmp/GraphsAndChartsApp.zip"
TARGET_DIR="/opt/burstroy/graph"

# Создаем целевую директорию, если не существует
mkdir -p "$TARGET_DIR"

# Делаем резервную копию appsettings.json, если файл существует
if [ -f "$TARGET_DIR/appsettings.json" ]; then
    BACKUP_NAME="$(date +%Y%m%d_%H%M%S)_appsettings.json"
    cp "$TARGET_DIR/appsettings.json" "$TARGET_DIR/$BACKUP_NAME"
    echo "Создана резервная копия: $BACKUP_NAME"
fi

# Распаковываем архив с заменой всех файлов
unzip -o "$ZIP_FILE" -d "$TARGET_DIR"

echo "Готово"