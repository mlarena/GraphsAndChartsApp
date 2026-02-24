// dust-charts.js - Модуль для визуализации данных датчика концентрации пыли

const DUSTCharts = {
    chart: null,
    currentSensorId: null,
    allMeasurements: [],
    isLoading: false,
    currentDays: 1,
    currentChartType: 'line',
    currentTab: 'pm',
    autoUpdateInstance: null,

    pmParameters: [
        { id: 'pm10act', name: 'PM10 акт.', unit: 'мг/м³', color: '#dc3545', property: 'pm10Act', visible: true, order: 1, group: 'pm', icon: 'fa-chart-line' },
        { id: 'pm25act', name: 'PM2.5 акт.', unit: 'мг/м³', color: '#fd7e14', property: 'pm25Act', visible: false, order: 2, group: 'pm', icon: 'fa-chart-line' },
        { id: 'pm1act',  name: 'PM1 акт.',  unit: 'мг/м³', color: '#ffc107', property: 'pm1Act',  visible: false, order: 3, group: 'pm', icon: 'fa-chart-line' },
        { id: 'pm10awg', name: 'PM10 ср.',  unit: 'мг/м³', color: '#20c997', property: 'pm10Awg', visible: false, order: 4, group: 'pm', icon: 'fa-chart-line' },
        { id: 'pm25awg', name: 'PM2.5 ср.', unit: 'мг/м³', color: '#0d6efd', property: 'pm25Awg', visible: false, order: 5, group: 'pm', icon: 'fa-chart-line' },
        { id: 'pm1awg',  name: 'PM1 ср.',  unit: 'мг/м³', color: '#6610f2', property: 'pm1Awg', visible: false, order: 6, group: 'pm', icon: 'fa-chart-line' }
    ],

    technicalParameters: [
        { id: 'flow',     name: 'Поток пробы',   unit: '',     color: '#17a2b8', property: 'flowProbe',      visible: true, order: 1, group: 'technical', icon: 'fa-wind' },
        { id: 'temp',     name: 'Температура',   unit: '°C',   color: '#dc3545', property: 'temperatureProbe',visible: false, order: 2, group: 'technical', icon: 'fa-thermometer-half' },
        { id: 'humidity', name: 'Влажность',     unit: '%',    color: '#0d6efd', property: 'humidityProbe',   visible: false, order: 3, group: 'technical', icon: 'fa-tint' },
        { id: 'laser',    name: 'Статус лазера', unit: '',     color: '#6c757d', property: 'laserStatus',     visible: false, order: 4, group: 'technical', icon: 'fa-sun' },
        { id: 'voltage',  name: 'Напряжение',    unit: 'В',    color: '#28a745', property: 'supplyVoltage',   visible: false, order: 5, group: 'technical', icon: 'fa-bolt' }
    ],

    init: function(sensorId) {
        console.log('DUSTCharts.init()', sensorId);
        this.currentSensorId = sensorId;
        moment.locale('ru');

        this.createParameterRadios();
        
        // Инициализация автообновления через менеджер
        this.initAutoUpdate();
        
        this.loadData(1);

        // Обработчик кнопок периода
        $('#dustTimeRangeButtons .btn').off('click').on('click', (e) => {
            const btn = $(e.currentTarget);
            if (btn.hasClass('active')) return;

            $('#dustTimeRangeButtons .btn').removeClass('active');
            btn.addClass('active');
            const days = btn.data('days');
            this.currentDays = days;

            this.loadData(days);
        });

        // Обработчик типа графика (радио-кнопки)
        $('input[name="dustChartType"]').off('change').on('change', (e) => {
            this.currentChartType = $(e.currentTarget).val();
            this.renderChart();
        });

        // Обработчик переключения вкладок
        $('#dustTabs button').off('shown.bs.tab').on('shown.bs.tab', (e) => {
            const tabId = $(e.target).attr('id');
            this.currentTab = tabId === 'pm-tab' ? 'pm' : 'technical';
            this.updateChartTitle();
            this.renderChart();
            this.updateStatistics();
        });

        // Радио-кнопки параметров
        $(document).on('change', '.dust-parameter-radio', () => {
            this.updateVisibleParameters();
            this.renderChart();
            this.updateStatistics();
        });
    },

    initAutoUpdate: function() {
        if (typeof AutoUpdateManager === 'undefined') {
            console.error('AutoUpdateManager не загружен!');
            return;
        }

        const toggleElement = document.getElementById('dustAutoUpdateToggle');
        if (!toggleElement) {
            console.error('Элемент dustAutoUpdateToggle не найден!');
            return;
        }

        this.autoUpdateInstance = AutoUpdateManager.create('dust', {
            interval: 30000,
            onUpdate: () => {
                if (this.currentSensorId) {
                    console.log('DUST: автообновление...');
                    this.loadData(this.currentDays, true);
                }
            }
        });

        console.log('DUST: автообновление инициализировано');
    },

    initDateRangeSlider: function() {
        if (typeof DateRangeSlider === 'undefined') {
            console.error('DateRangeSlider не загружен!');
            return;
        }

        let slider = DateRangeSlider.get('dust');
        if (!slider) {
            slider = DateRangeSlider.create('dust', {
                onRangeChange: (filteredData) => {
                    const originalData = this.allMeasurements;
                    this.allMeasurements = filteredData;
                    this.renderChart();
                    this.updateStatistics();
                    this.allMeasurements = originalData;
                }
            });
        }

        DateRangeSlider.initSlider('dust', this.allMeasurements);
    },

    createParameterRadios: function() {
        this.createRadioGroup('pm', this.pmParameters);
        this.createRadioGroup('technical', this.technicalParameters);
    },

    createRadioGroup: function(groupName, parameters) {
        const container = $(`#dust${groupName.charAt(0).toUpperCase() + groupName.slice(1)}Radios`);
        if (!container.length) return;

        container.empty();
        
        parameters.sort((a, b) => a.order - b.order).forEach(p => {
            container.append(ChartUtils.createParameterRadio(p, groupName, 'dust-parameter-radio'));
        });
    },

    updateVisibleParameters: function() {
        const updateGroup = (groupParams) => {
            groupParams.forEach(p => {
                const radioId = `radio_${p.group}_${p.id}`;
                p.visible = $(`#${radioId}`).is(':checked');
            });
        };
        
        updateGroup(this.pmParameters);
        updateGroup(this.technicalParameters);
    },

    getSelectedParameters: function() {
        const groups = {
            'pm': this.pmParameters,
            'technical': this.technicalParameters
        };
        
        return groups[this.currentTab]?.filter(p => p.visible) || [];
    },

    updateChartTitle: function() {
        $('#dustChartTitle').text(this.currentTab === 'pm'
            ? 'Концентрация частиц PM (мг/м³)'
            : 'Технические параметры DUST');
    },

    cleanup: function() {
        console.log('DUSTCharts.cleanup()');
        
        if (this.autoUpdateInstance) {
            AutoUpdateManager.destroy('dust');
            this.autoUpdateInstance = null;
        }

        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
        
        this.allMeasurements = [];
    },

    loadData: function(days, silent = false) {
        if (this.isLoading && this.xhr) this.xhr.abort();
        this.isLoading = true;
        if (!silent) $('#dustChartLoadingIndicator').fadeIn(150);

        this.xhr = $.ajax({
            url: '/GraphsAndCharts/GetDUSTData',
            type: 'GET',
            data: { sensorId: this.currentSensorId, days },
            success: (data) => {
                const old = this.allMeasurements.length;
                this.allMeasurements = data.measurements || [];
                const hasNew = this.allMeasurements.length > old;

                this.renderChart();
                this.updateStatistics();
                this.updateLastUpdateTime(data);

                setTimeout(() => this.initDateRangeSlider(), 50);

                if (silent && hasNew && this.autoUpdateInstance && this.autoUpdateInstance.enabled) {
                    ChartUtils.showNotification('Получены новые данные DUST', 'warning');
                }

                this.isLoading = false;
                if (!silent) $('#dustChartLoadingIndicator').fadeOut(150);
                this.xhr = null;
            },
            error: (xhr, s, err) => {
                if (s !== 'abort') console.error('DUST load error:', err);
                this.isLoading = false;
                if (!silent) $('#dustChartLoadingIndicator').fadeOut(150);
                this.xhr = null;
            }
        });
    },

    renderChart: function() {
        if (!this.allMeasurements?.length) return;

        const measurements = this.allMeasurements;
        const timestamps = measurements.map(x => new Date(x.dataTimestamp));

        const timeRange = ChartUtils.getTimeRange(timestamps);
        ChartUtils.updateTimeScaleLabel('dust', timeRange);
        const cfg = ChartUtils.getTimeConfig(timeRange);

        const ctx = document.getElementById('dustChart')?.getContext('2d');
        if (!ctx) return;

        if (this.chart) this.chart.destroy();

        const selected = this.getSelectedParameters();
        if (!selected.length) {
            this.chart = new Chart(ctx, {
                type: 'line',
                data: { labels: [], datasets: [] },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Нет выбранного параметра',
                            color: '#666',
                            font: { size: 14 }
                        }
                    }
                }
            });
            return;
        }

        const datasets = [];

        selected.forEach((p, i) => {
            const validData = measurements
                .map(x => {
                    const value = x[p.property];
                    return {
                        x: new Date(x.dataTimestamp),
                        y: value != null ? parseFloat(value) : null
                    };
                })
                .filter(point => point.y !== null);

            if (validData.length === 0) return;

            const ds = {
                label: p.name + (p.unit ? ` (${p.unit})` : ''),
                data: validData,
                borderColor: p.color,
                backgroundColor: ChartUtils.hexToRgba(p.color, 0.1),
                borderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 6,
                tension: 0.3,
                fill: false,
                yAxisID: i === 0 ? 'y' : `y${i + 1}`
            };

            if (this.currentChartType === 'scatter') {
                ds.type = 'scatter';
                ds.backgroundColor = p.color;
                ds.borderColor = 'transparent';
                ds.pointRadius = 5;
            } else if (this.currentChartType === 'bar') {
                ds.type = 'bar';
                ds.barPercentage = 0.8;
                ds.categoryPercentage = 0.9;
            }

            datasets.push(ds);
        });

        if (datasets.length === 0) {
            this.chart = new Chart(ctx, {
                type: 'line',
                data: { labels: [], datasets: [] },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Нет данных для отображения',
                            color: '#666',
                            font: { size: 14 }
                        }
                    }
                }
            });
            return;
        }

        const yAxes = {};
        selected.forEach((p, i) => {
            const id = i === 0 ? 'y' : `y${i + 1}`;
            yAxes[id] = {
                type: 'linear',
                display: true,
                position: i === 0 ? 'left' : 'right',
                title: { display: true, text: p.name + (p.unit ? ` (${p.unit})` : '') },
                grid: { drawOnChartArea: i === 0 },
                ticks: { callback: v => v.toFixed(1) }
            };
        });

        this.chart = new Chart(ctx, {
            type: this.currentChartType === 'scatter' ? 'scatter' : 'line',
            data: { labels: timestamps, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 300 },
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { 
                        display: true, 
                        position: 'top', 
                        labels: { 
                            usePointStyle: true, 
                            boxWidth: 8,
                            filter: (item) => !item.text.includes('нет данных')
                        } 
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: (ctx) => {
                                const dataset = ctx.dataset;
                                const label = dataset.label || '';
                                const value = ctx.parsed.y;
                                if (value !== null && value !== undefined) {
                                    return `${label}: ${value.toFixed(2)}`;
                                }
                                return `${label}: нет данных`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: { 
                            unit: cfg.unit, 
                            displayFormats: cfg.displayFormats, 
                            tooltipFormat: 'dd.MM.yyyy HH:mm' 
                        },
                        title: { display: true, text: 'Дата/время' }
                    },
                    ...yAxes
                }
            }
        });
    },

    updateStatistics: function() {
        const container = $('#dustStatisticsContainer');
        if (!container.length) return;
        
        container.empty();

        const selected = this.getSelectedParameters();
        if (!selected.length) {
            container.html('<div class="col-12 text-center text-muted">Нет выбранного параметра</div>');
            return;
        }

        selected.forEach(p => {
            const values = this.allMeasurements
                .map(m => {
                    const v = m[p.property];
                    return v != null ? parseFloat(v) : null;
                })
                .filter(v => v != null);

            if (values.length === 0) return;

            const statItem = ChartUtils.createStatisticsItem(p, values);
            if (statItem) container.append(statItem);
        });
    },

    updateLastUpdateTime: function(data) {
        const measurements = data.measurements || [];
        if (!measurements.length) {
            $('#dustLastUpdateTime').text('Нет данных');
            return;
        }
        
        const last = measurements[measurements.length-1].dataTimestamp;
        $('#dustLastUpdateTime').text(moment(last).format('DD.MM.YYYY HH:mm:ss'));
        
        if (this.autoUpdateInstance) {
            this.autoUpdateInstance.updateLastUpdateTime(last);
        }
    }
};

$(document).ready(function() {
    console.log('✅ DUST Charts загружен');
    $(document).on('sensorChanged', () => {
        if (typeof DUSTCharts !== 'undefined') DUSTCharts.cleanup();
    });
});