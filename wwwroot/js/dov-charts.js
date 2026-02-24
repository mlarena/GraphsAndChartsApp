// dov-charts.js - Модуль для визуализации данных датчика оптической видимости

const DOVCharts = {
    visibilityChart: null,
    brightnessChart: null,
    currentSensorId: null,
    allMeasurements: [],
    currentChartType: 'visibility',
    currentChartStyle: 'line',
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

        // Обработчик выбора типа данных (радио-кнопки visibility/brightness)
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

        // Обработчик выбора стиля графика (линейный/точечный)
        $('input[name="dovChartStyle"]').off('change').on('change', (e) => {
            this.currentChartStyle = $(e.currentTarget).val();
            
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
        if (typeof DateRangeSlider === 'undefined') {
            console.error('DateRangeSlider не загружен!');
            return;
        }

        let slider = DateRangeSlider.get('dov');
        if (!slider) {
            slider = DateRangeSlider.create('dov', {
                onRangeChange: (filteredData) => {
                    if (this.currentChartType === 'visibility') {
                        this.renderVisibilityChart({ measurements: filteredData });
                    } else {
                        this.renderBrightnessChart({ measurements: filteredData });
                    }
                    this.updateStatistics({ measurements: filteredData });
                }
            });
        }

        DateRangeSlider.initSlider('dov', this.allMeasurements);
    },

    cleanup: function() {
        console.log('DOVCharts.cleanup()');
        
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

                setTimeout(() => this.initDateRangeSlider(), 50);

                if (silent && hasNew && this.autoUpdateInstance && this.autoUpdateInstance.enabled) {
                    ChartUtils.showNotification('Получены новые данные DOV', 'info');
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
        const measurements = data.measurements || [];
        if (!measurements.length) return;

        const timestamps = measurements.map(x => new Date(x.dataTimestamp));
        const values = measurements.map(x => parseFloat(x.visibleRange));

        const timeRange = ChartUtils.getTimeRange(timestamps);
        ChartUtils.updateTimeScaleLabel('dov', timeRange);
        const cfg = ChartUtils.getTimeConfig(timeRange);

        const ctx = document.getElementById('dovVisibilityChart')?.getContext('2d');
        if (!ctx) return;

        if (this.visibilityChart) this.visibilityChart.destroy();

        const chartType = this.currentChartStyle === 'scatter' ? 'scatter' : 'line';
        
        const datasets = [{
            label: 'Дальность видимости (м)',
            data: this.currentChartStyle === 'scatter' 
                ? measurements.map(x => ({ x: new Date(x.dataTimestamp), y: parseFloat(x.visibleRange) }))
                : values,
            borderColor: 'rgba(23, 162, 184, 1)',
            backgroundColor: this.currentChartStyle === 'scatter' 
                ? 'rgba(23, 162, 184, 0.8)'
                : 'rgba(23, 162, 184, 0.1)',
            borderWidth: 2,
            pointRadius: this.currentChartStyle === 'scatter' ? 5 : 3,
            pointHoverRadius: this.currentChartStyle === 'scatter' ? 8 : 6,
            tension: this.currentChartStyle === 'line' ? 0.3 : 0,
            fill: this.currentChartStyle === 'line'
        }];

        const options = {
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
        };

        if (this.currentChartStyle === 'scatter') {
            this.visibilityChart = new Chart(ctx, {
                type: 'scatter',
                data: { datasets },
                options: options
            });
        } else {
            this.visibilityChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: timestamps,
                    datasets: datasets
                },
                options: options
            });
        }
    },

    renderBrightnessChart: function(data) {
        const measurements = data.measurements || [];
        if (!measurements.length) return;

        const timestamps = measurements.map(x => new Date(x.dataTimestamp));
        const flags = measurements.map(x => x.brightFlag);

        const colors = flags.map(f => {
            switch(f) {
                case 0: return '#28a745'; // день
                case 1: return '#ffc107'; // сумерки
                case 2: return '#6c757d'; // темно
                default: return '#17a2b8';
            }
        });

        const timeRange = ChartUtils.getTimeRange(timestamps);
        ChartUtils.updateTimeScaleLabel('dov', timeRange);
        const cfg = ChartUtils.getTimeConfig(timeRange);

        const ctx = document.getElementById('dovBrightnessChart')?.getContext('2d');
        if (!ctx) return;

        if (this.brightnessChart) this.brightnessChart.destroy();

        const chartType = this.currentChartStyle === 'scatter' ? 'scatter' : 'line';

        const datasets = [{
            label: 'Флаг яркости',
            data: measurements.map(x => ({ x: new Date(x.dataTimestamp), y: x.brightFlag })),
            backgroundColor: colors,
            borderColor: this.currentChartStyle === 'line' ? 'rgba(23, 162, 184, 0.5)' : 'transparent',
            borderWidth: this.currentChartStyle === 'line' ? 1 : 0,
            pointRadius: this.currentChartStyle === 'scatter' ? 6 : 3,
            pointHoverRadius: this.currentChartStyle === 'scatter' ? 10 : 6,
            tension: this.currentChartStyle === 'line' ? 0.1 : 0,
            stepped: this.currentChartStyle === 'line'
        }];

        const options = {
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
                },
                legend: { display: false }
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
        };

        if (this.currentChartStyle === 'scatter') {
            this.brightnessChart = new Chart(ctx, {
                type: 'scatter',
                data: { datasets },
                options: options
            });
        } else {
            this.brightnessChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: timestamps,
                    datasets: datasets.map(ds => ({
                        ...ds,
                        data: flags
                    }))
                },
                options: options
            });
        }
    },

    updateStatistics: function(data) {
        const measurements = data.measurements || [];
        if (measurements.length === 0) {
            $('#dovMinVisibility, #dovMaxVisibility, #dovAvgVisibility').text('-');
            $('#dovTotalMeasurements').text('0');
            return;
        }
        
        const values = measurements
            .map(x => parseFloat(x.visibleRange))
            .filter(v => !isNaN(v));
            
        if (!values.length) return;

        $('#dovMinVisibility').text(Math.min(...values).toFixed(1));
        $('#dovMaxVisibility').text(Math.max(...values).toFixed(1));
        $('#dovAvgVisibility').text((values.reduce((a,b)=>a+b,0)/values.length).toFixed(1));
        $('#dovTotalMeasurements').text(measurements.length);
    },

    updateLastUpdateTime: function(data) {
        const measurements = data.measurements || [];
        if (measurements.length === 0) {
            $('#dovLastUpdateTime').text('Нет данных');
            return;
        }
        
        const last = measurements[measurements.length-1].dataTimestamp;
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