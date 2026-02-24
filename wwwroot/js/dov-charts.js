// dov-charts.js - Полная версия с использованием AutoUpdateManager

const DOVCharts = {
    visibilityChart: null,
    brightnessChart: null,
    currentSensorId: null,
    allMeasurements: [],
    dateSlider: null,
    minDate: null,
    maxDate: null,
    currentChartType: 'visibility',
    isLoading: false,
    updateTimeout: null,
    sliderInitialized: false,
    currentDays: 1,
    autoUpdateInstance: null, // ссылка на экземпляр AutoUpdateManager

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
        // Проверяем, что AutoUpdateManager загружен
        if (typeof AutoUpdateManager === 'undefined') {
            console.error('AutoUpdateManager не загружен!');
            return;
        }

        // Убеждаемся, что чекбокс существует
        const toggleElement = document.getElementById('dovAutoUpdateToggle');
        if (!toggleElement) {
            console.error('Элемент dovAutoUpdateToggle не найден!');
            return;
        }

        // Создаем экземпляр автообновления
        this.autoUpdateInstance = AutoUpdateManager.create('dov', {
            interval: 30000,
            onUpdate: () => {
                if (this.currentSensorId) {
                    console.log('DOV: автообновление...');
                    this.loadData(this.currentDays, true);
                }
            },
            onStart: () => {
                console.log('DOV: автообновление запущено');
            },
            onStop: () => {
                console.log('DOV: автообновление остановлено');
            }
        });

        console.log('DOV: автообновление инициализировано');
    },

    cleanup: function() {
        console.log('DOVCharts.cleanup()');
        
        // Уничтожаем экземпляр автообновления
        if (this.autoUpdateInstance) {
            AutoUpdateManager.destroy('dov');
            this.autoUpdateInstance = null;
        }

        if (this.visibilityChart) {
            this.visibilityChart.destroy();
            this.visibilityChart = null;
        }
        if (this.brightnessChart) {
            this.brightnessChart.destroy();
            this.brightnessChart = null;
        }

        if (this.dateSlider) {
            try { this.dateSlider.destroy(); } catch(e) {}
            this.dateSlider = null;
        }

        this.sliderInitialized = false;
        this.allMeasurements = [];
    },

    initDateRangeSlider: function() {
        if (typeof noUiSlider === 'undefined') {
            console.error('noUiSlider не загружен');
            return;
        }

        if (!this.allMeasurements || this.allMeasurements.length < 2) {
            $('#dovDateRangeSection').addClass('disabled');
            $('#dovSliderContainer').addClass('disabled');
            return;
        }

        const timestamps = this.allMeasurements.map(m => new Date(m.dataTimestamp).getTime());
        this.minDate = Math.min(...timestamps);
        this.maxDate = Math.max(...timestamps);

        if (isNaN(this.minDate) || isNaN(this.maxDate) || this.minDate >= this.maxDate) {
            console.error('Некорректные даты для слайдера DOV');
            return;
        }

        const formatDate = (ts) => moment(ts).format('DD.MM.YYYY HH:mm');

        $('#dovMinDateLabel').text(formatDate(this.minDate));
        $('#dovMaxDateLabel').text(formatDate(this.maxDate));
        $('#dovDateRangeLabel').text(`${formatDate(this.minDate)} - ${formatDate(this.maxDate)}`);

        const slider = document.getElementById('dovDateRangeSlider');
        if (!slider) return;

        $('#dovDateRangeSection').removeClass('disabled');
        $('#dovSliderContainer').removeClass('disabled');

        if (this.dateSlider) {
            try { this.dateSlider.destroy(); } catch(e) {}
            this.dateSlider = null;
        }

        slider.innerHTML = '';

        setTimeout(() => {
            try {
                this.dateSlider = noUiSlider.create(slider, {
                    start: [this.minDate, this.maxDate],
                    connect: true,
                    range: { 'min': this.minDate, 'max': this.maxDate },
                    step: 3600000,
                    format: { to: v => Math.round(v), from: v => Math.round(v) },
                    behaviour: 'tap-drag',
                    animate: true,
                    animationDuration: 300
                });

                this.dateSlider.on('update', (values) => {
                    const start = moment(parseInt(values[0])).format('DD.MM.YYYY HH:mm');
                    const end   = moment(parseInt(values[1])).format('DD.MM.YYYY HH:mm');
                    $('#dovDateRangeLabel').text(`${start} - ${end}`);
                });

                this.dateSlider.on('start', () => {
                    // Генерируем событие для AutoUpdateManager
                    $(document).trigger('sliderDragStart');
                });

                this.dateSlider.on('end', (values) => {
                    const startTime = parseInt(values[0]);
                    const endTime   = parseInt(values[1]);
                    this.filterDataByDateRange(startTime, endTime);
                    // Генерируем событие для AutoUpdateManager
                    $(document).trigger('sliderDragEnd');
                });

                this.sliderInitialized = true;
            } catch(e) {
                console.error('Ошибка создания слайдера DOV:', e);
            }
        }, 50);
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

    filterDataByDateRange: function(startTime, endTime) {
        const filtered = this.allMeasurements.filter(m => {
            const t = new Date(m.dataTimestamp).getTime();
            return t >= startTime && t <= endTime;
        });

        if (this.currentChartType === 'visibility') {
            this.renderVisibilityChart({ measurements: filtered });
        } else {
            this.renderBrightnessChart({ measurements: filtered });
        }
        this.updateStatistics({ measurements: filtered });
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