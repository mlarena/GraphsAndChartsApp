// chart-utils.js - Общие утилиты для всех модулей графиков

const ChartUtils = (function() {
    'use strict';

    /**
     * Определение диапазона времени на основе массива временных меток
     * @param {Array<Date>} timestamps - массив объектов Date
     * @returns {string} - ключ диапазона ('hour', 'hour6', 'day', 'week', 'month')
     */
    function getTimeRange(timestamps) {
        if (!timestamps || timestamps.length < 2) return 'day';
        
        const diffHours = (Math.max(...timestamps.map(d => d.getTime())) - 
                          Math.min(...timestamps.map(d => d.getTime()))) / 3600000;
        
        if (diffHours <= 24) return 'hour';
        if (diffHours <= 72) return 'hour6';
        if (diffHours <= 168) return 'day';
        if (diffHours <= 720) return 'week';
        return 'month';
    }

    /**
     * Получение конфигурации времени для Chart.js на основе диапазона
     * @param {string} range - ключ диапазона
     * @returns {Object} - конфигурация для Chart.js
     */
    function getTimeConfig(range) {
        const configs = {
            hour:   { unit: 'hour',   displayFormats: { hour: 'HH:mm' } },
            hour6:  { unit: 'hour',   displayFormats: { hour: 'HH:mm' } },
            day:    { unit: 'day',    displayFormats: { day: 'dd.MM' } },
            week:   { unit: 'week',   displayFormats: { week: 'dd.MM' } },
            month:  { unit: 'month',  displayFormats: { month: 'MMM yyyy' } }
        };
        return configs[range] || configs.day;
    }

    /**
     * Обновление метки шкалы времени
     * @param {string} prefix - префикс сенсора
     * @param {string} range - ключ диапазона
     */
    function updateTimeScaleLabel(prefix, range) {
        const labels = { 
            hour: 'часы', 
            hour6: '6 часов', 
            day: 'дни', 
            week: 'недели', 
            month: 'месяцы' 
        };
        $(`#${prefix}TimeScaleLabel`).text(labels[range] || 'авто');
    }

    /**
     * Показ уведомления
     * @param {string} message - текст уведомления
     * @param {string} type - тип уведомления (info, success, warning, danger)
     */
    function showNotification(message, type = 'info') {
        const alertClass = {
            'info': 'alert-info',
            'success': 'alert-success',
            'warning': 'alert-warning',
            'danger': 'alert-danger'
        }[type] || 'alert-info';

        const icon = {
            'info': 'fa-info-circle',
            'success': 'fa-check-circle',
            'warning': 'fa-exclamation-triangle',
            'danger': 'fa-exclamation-circle'
        }[type] || 'fa-info-circle';

        const $notification = $(`
            <div class="alert ${alertClass} alert-dismissible fade show position-fixed top-0 end-0 m-3" style="z-index:9999;" role="alert">
                <i class="fas ${icon}"></i> ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `);
        
        $('body').append($notification);
        setTimeout(() => $notification.alert('close'), 3000);
    }

    /**
     * Конвертация HEX в RGBA
     * @param {string} hex - цвет в HEX формате
     * @param {number} alpha - прозрачность (0-1)
     * @returns {string} - цвет в RGBA формате
     */
    function hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    /**
     * Создание радио-кнопки для параметра
     * @param {Object} param - объект параметра
     * @param {string} groupName - имя группы
     * @param {string} className - класс для радио-кнопок
     * @returns {jQuery} - jQuery элемент
     */
    function createParameterRadio(param, groupName, className = 'parameter-radio') {
        const radioName = `${groupName}_param`;
        
        return $(`
            <div class="col-md-4 col-sm-6 mb-2">
                <div class="form-check">
                    <input class="form-check-input ${className}"
                           type="radio"
                           name="${radioName}"
                           id="radio_${groupName}_${param.id}"
                           value="${param.id}"
                           data-param-id="${param.id}"
                           data-group="${groupName}"
                           data-property="${param.property}"
                           ${param.visible ? 'checked' : ''}>
                    <label class="form-check-label small" for="radio_${groupName}_${param.id}" title="${param.description || ''}">
                        <i class="fas ${param.icon || 'fa-chart-line'} me-1" style="color:${param.color};"></i>
                        <span style="display:inline-block; width:8px; height:8px; background-color:${param.color}; border-radius:50%; margin-right:4px;"></span>
                        ${param.name} ${param.unit ? `(${param.unit})` : ''}
                    </label>
                </div>
            </div>
        `);
    }

    /**
     * Создание статистики для параметра
     * @param {Object} param - объект параметра
     * @param {Array} values - массив значений
     * @returns {jQuery} - jQuery элемент
     */
    function createStatisticsItem(param, values) {
        if (!values || values.length === 0) return null;

        const min = Math.min(...values);
        const max = Math.max(...values);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const current = values[values.length - 1];

        const formatValue = (value) => {
            if (param.unit === '°' && param.id === 'windDirection') {
                return value.toFixed(0) + '°';
            }
            return value.toFixed(2);
        };

        return $(`
            <div class="col-md-12">
                <div class="p-2 border rounded" style="border-left: 4px solid ${param.color} !important;">
                    <div class="small text-muted">
                        <i class="fas ${param.icon || 'fa-chart-line'} me-1"></i> ${param.name}
                    </div>
                    <div class="d-flex justify-content-between mt-1">
                        <span class="small">тек. <strong>${formatValue(current)}</strong></span>
                        <span class="small">мин <strong>${formatValue(min)}</strong></span>
                        <span class="small">ср. <strong>${formatValue(avg)}</strong></span>
                        <span class="small">макс <strong>${formatValue(max)}</strong></span>
                    </div>
                </div>
            </div>
        `);
    }

    // Публичный API
    return {
        getTimeRange: getTimeRange,
        getTimeConfig: getTimeConfig,
        updateTimeScaleLabel: updateTimeScaleLabel,
        showNotification: showNotification,
        hexToRgba: hexToRgba,
        createParameterRadio: createParameterRadio,
        createStatisticsItem: createStatisticsItem
    };
})();

// Глобальная инициализация
$(document).ready(function() {
    console.log('✅ ChartUtils загружен');
});

// Экспортируем в глобальную область
window.ChartUtils = ChartUtils;