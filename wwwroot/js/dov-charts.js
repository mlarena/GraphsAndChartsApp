// dov-charts.js - Модуль для визуализации данных датчика оптической видимости
// Модифицирован: вынесена логика слайдера в DateRangeSlider

const DOVCharts = {
    visibilityChart: null,
    brightnessChart: null,
    currentSensorId: null,
    allMeasurements: [],
    currentChartType: 'visibility',
    isLoading: false,
    updateTimeout: null,
    currentDays: 1,
    autoUpdateInstance: null,

    init: function(sensorId) {
        console.log('DOVCharts.init()', sensorId);
        this.currentSensorId = sensorId;
        moment.locale('ru');

        // Инициализация автообновления через менеджер
        this.initAutoUpdate();
        
        this.loadData(1); // по умолчанию 24ч

        // Обработчик кнопок периода
        $('#dovTimeRangeButtons .btn').off('click').on('click', (e) => {
            const btn = $(e.currentTarget);
            if (btn.hasClass('active')) return;

            $('#dovTimeRangeButtons .btn').removeClass('active');
            btn.addClass('active');
            const days = btn.data('days');
            this.currentDays = days;

            this.loadData(days);
        });

        // Обработчик выбора типа графика (радио-кнопки)
        $('input[name="dovChartType"]').off('change').on('change', (e) => {
            this.currentChartType = $(e.currentTarget).val();
            this.toggleChart();
            this.updateChartTitle();

            if (this.currentChartType === 'visibility') {
                this.renderVisibilityChart({ measurements: this.allMeasurements });
            } else {
                this.renderBrightnessChart({ measurements: this.allMeasurements });
            }
        });

        this.toggleChart();
        this.updateChartTitle();
    },

    initAutoUpdate: function() {
        if (typeof AutoUpdateManager === 'undefined') {
            console.error('AutoUpdateManager не загружен!');
            return;
        }

        const toggleElement = document.getElementById('dovAutoUpdateToggle');
        if (!toggleElement) {
            console.error('Элемент dovAutoUpdateToggle не найден!');
            return;
        }

        this.autoUpdateInstance = AutoUpdateManager.create('dov', {
            interval: 30000,
            onUpdate: () => {
                if (this.currentSensorId) {
                    console.log('DOV: автообновление...');
                    this.loadData(this.currentDays, true);
                }
            }
        });

        console.log('DOV: автообновление инициализировано');
    },

    initDateRangeSlider: function() {
        // Проверяем наличие DateRangeSlider
        if (typeof DateRangeSlider === 'undefined') {
            console.error('DateRangeSlider не загружен!');
            return;
        }

        // Создаем или получаем экземпляр слайдера
        let slider = DateRangeSlider.get('dov');
        if (!slider) {
            slider = DateRangeSlider.create('dov', {
                onRangeChange: (filteredData) => {
                    // Отрисовываем график с отфильтрованными данными
                    if (this.currentChartType === 'visibility') {
                        this.renderVisibilityChart({ measurements: filteredData });
                    } else {
                        this.renderBrightnessChart({ measurements: filteredData });
                    }
                    this.updateStatistics({ measurements: filteredData });
                }
            });
        }

        // Инициализируем слайдер с текущими данными
        DateRangeSlider.initSlider('dov', this.allMeasurements);
    },

    cleanup: function() {
        console.log('DOVCharts.cleanup()');
        
        // Уничтожаем экземпляр автообновления
        if (this.autoUpdateInstance) {
            AutoUpdateManager.destroy('dov');
            this.autoUpdateInstance = null;
        }

        // Уничтожаем слайдер (DateRangeSlider сам управляет своими экземплярами)
        // Не нужно вызывать destroy здесь, так как DateRangeSlider слушает событие sensorChanged

        if (this.visibilityChart) {
            this.visibilityChart.destroy();
            this.visibilityChart = null;
        }
        if (this.brightnessChart) {
            this.brightnessChart.destroy();
            this.brightnessChart = null;
        }

        this.allMeasurements = [];
    },

    loadData: function(days, silent = false) {
        if (this.isLoading && this.xhr) this.xhr.abort();
        this.isLoading = true;

        if (!silent) $('#dovChartLoadingIndicator').fadeIn(150);

        this.xhr = $.ajax({
            url: '/GraphsAndCharts/GetDOVData',
            type: 'GET',
            data: { sensorId: this.currentSensorId, days: days },
            success: (data) => {
                const oldCount = this.allMeasurements.length;
                this.allMeasurements = data.measurements || [];

                const hasNew = this.allMeasurements.length > oldCount;

                if (this.currentChartType === 'visibility') {
                    this.renderVisibilityChart(data);
                } else {
                    this.renderBrightnessChart(data);
                }

                this.updateStatistics(data);
                this.updateLastUpdateTime(data);

                // Инициализируем или обновляем слайдер
                setTimeout(() => this.initDateRangeSlider(), 50);

                if (silent && hasNew && this.autoUpdateInstance && this.autoUpdateInstance.enabled) {
                    this.showNotification('Получены новые данные');
                }

                this.isLoading = false;
                if (!silent) $('#dovChartLoadingIndicator').fadeOut(150);
                this.xhr = null;
            },
            error: (xhr, status, error) => {
                if (status !== 'abort') console.error('Ошибка загрузки DOV:', error);
                this.isLoading = false;
                if (!silent) $('#dovChartLoadingIndicator').fadeOut(150);
                this.xhr = null;
            }
        });
    },

    showNotification: function(message) {
        const $n = $(`
            <div class="alert alert-info alert-dismissible fade show position-fixed top-0 end-0 m-3" style="z-index:9999;" role="alert">
                <i class="fas fa-info-circle"></i> ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `);
        $('body').append($n);
        setTimeout(() => $n.alert('close'), 3000);
    },

    toggleChart: function() {
        if (this.currentChartType === 'visibility') {
            $('#dovVisibilityChart').show();
            $('#dovBrightnessChart').hide();
        } else {
            $('#dovVisibilityChart').hide();
            $('#dovBrightnessChart').show();
        }
    },

    updateChartTitle: function() {
        $('#dovChartTitle').text(
            this.currentChartType === 'visibility'
                ? 'Дальность видимости (метры)'
                : 'Освещенность (bright_flag)'
        );
    },

    renderVisibilityChart: function(data) {
        const m = data.measurements || [];
        if (!m.length) return;

        const timestamps = m.map(x => new Date(x.dataTimestamp));
        const values = m.map(x => parseFloat(x.visibleRange));

        const timeRange = this.getTimeRange(timestamps);
        this.updateTimeScaleLabel(timeRange);
        const cfg = this.getTimeConfig(timeRange);

        const ctx = document.getElementById('dovVisibilityChart')?.getContext('2d');
        if (!ctx) return;

        if (this.visibilityChart) this.visibilityChart.destroy();

        this.visibilityChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: timestamps,
                datasets: [{
                    label: 'Дальность видимости (м)',
                    data: values,
                    borderColor: 'rgba(23, 162, 184, 1)',
                    backgroundColor: 'rgba(23, 162, 184, 0.1)',
                    borderWidth: 2,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    tension: 0.3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 300 },
                plugins: { legend: { display: false } },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: cfg.unit,
                            displayFormats: cfg.displayFormats,
                            tooltipFormat: 'dd.MM.yyyy HH:mm'
                        }
                    },
                    y: {
                        beginAtZero: false,
                        title: { display: true, text: 'Метры' }
                    }
                }
            }
        });
    },

    renderBrightnessChart: function(data) {
        const m = data.measurements || [];
        if (!m.length) return;

        const timestamps = m.map(x => new Date(x.dataTimestamp));
        const flags = m.map(x => x.brightFlag);

        const colors = flags.map(f => {
            switch(f) {
                case 0: return '#28a745'; // день
                case 1: return '#ffc107'; // сумерки
                case 2: return '#6c757d'; // темно
                default: return '#17a2b8';
            }
        });

        const timeRange = this.getTimeRange(timestamps);
        this.updateTimeScaleLabel(timeRange);
        const cfg = this.getTimeConfig(timeRange);

        const ctx = document.getElementById('dovBrightnessChart')?.getContext('2d');
        if (!ctx) return;

        if (this.brightnessChart) this.brightnessChart.destroy();

        this.brightnessChart = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Флаг яркости',
                    data: m.map(x => ({ x: new Date(x.dataTimestamp), y: x.brightFlag })),
                    backgroundColor: colors,
                    pointRadius: 6,
                    pointHoverRadius: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 300 },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: ctx => {
                                const flag = ctx.raw.y;
                                const texts = ['День', 'Сумерки', 'Темно'];
                                return `${texts[flag] || '—'} в ${moment(ctx.raw.x).format('DD.MM.YYYY HH:mm')}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: cfg.unit,
                            displayFormats: cfg.displayFormats
                        }
                    },
                    y: {
                        beginAtZero: true,
                        max: 2.5,
                        ticks: {
                            stepSize: 1,
                            callback: v => ['День', 'Сумерки', 'Темно'][v] || v
                        }
                    }
                }
            }
        });
    },

    getTimeRange: function(timestamps) {
        if (timestamps.length < 2) return 'day';
        const diffHours = (Math.max(...timestamps.map(d => d.getTime())) - Math.min(...timestamps.map(d => d.getTime()))) / 3600000;
        if (diffHours <= 24) return 'hour';
        if (diffHours <= 72) return 'hour6';
        if (diffHours <= 168) return 'day';
        if (diffHours <= 720) return 'week';
        return 'month';
    },

    getTimeConfig: function(range) {
        const c = {
            hour:    { unit: 'hour',   displayFormats: { hour:   'HH:mm' } },
            hour6:   { unit: 'hour',   displayFormats: { hour:   'HH:mm' } },
            day:     { unit: 'day',    displayFormats: { day:    'dd.MM' } },
            week:    { unit: 'week',   displayFormats: { week:   'dd.MM' } },
            month:   { unit: 'month',  displayFormats: { month:  'MMM yyyy' } }
        };
        return c[range] || c.day;
    },

    updateTimeScaleLabel: function(range) {
        const labels = { hour: 'часы', hour6: '6 часов', day: 'дни', week: 'недели', month: 'месяцы' };
        $('#dovTimeScaleLabel').text(labels[range] || 'авто');
    },

    updateStatistics: function(data) {
        const m = data.measurements || [];
        if (m.length === 0) {
            $('#dovMinVisibility, #dovMaxVisibility, #dovAvgVisibility').text('-');
            $('#dovTotalMeasurements').text('0');
            return;
        }
        const vals = m.map(x => parseFloat(x.visibleRange)).filter(v => !isNaN(v));
        if (!vals.length) return;

        $('#dovMinVisibility').text(Math.min(...vals).toFixed(1));
        $('#dovMaxVisibility').text(Math.max(...vals).toFixed(1));
        $('#dovAvgVisibility').text((vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1));
        $('#dovTotalMeasurements').text(m.length);
    },

    updateLastUpdateTime: function(data) {
        const m = data.measurements || [];
        if (m.length === 0) {
            $('#dovLastUpdateTime').text('Нет данных');
            return;
        }
        const last = m[m.length-1].dataTimestamp;
        $('#dovLastUpdateTime').text(moment(last).format('DD.MM.YYYY HH:mm:ss'));
        
        if (this.autoUpdateInstance) {
            this.autoUpdateInstance.updateLastUpdateTime(last);
        }
    }
};

$(document).ready(function() {
    console.log('✅ DOV Charts загружен');
    $(document).on('sensorChanged', () => {
        if (typeof DOVCharts !== 'undefined') DOVCharts.cleanup();
    });
});