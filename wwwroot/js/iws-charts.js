// iws-charts.js - Модуль для визуализации данных метеостанции IWS

const IWSCharts = {
    chart: null,
    currentSensorId: null,
    allMeasurements: [],
    isLoading: false,
    currentDays: 1,
    currentChartType: 'line',
    currentTab: 'weather',
    autoUpdateInstance: null,

    // Параметры погоды
    weatherParameters: [
        { id: 'envTemp',   name: 'Температура',     unit: '°C', color: '#dc3545', property: 'environmentTemperature', visible: true,  order: 1, group: 'weather', icon: 'fa-temperature-high' },
        { id: 'humidity',  name: 'Влажность',       unit: '%',  color: '#0d6efd', property: 'humidityPercentage',      visible: false, order: 2, group: 'weather', icon: 'fa-tint' },
        { id: 'dewPoint',  name: 'Точка росы',      unit: '°C', color: '#17a2b8', property: 'dewPoint',                visible: false, order: 3, group: 'weather', icon: 'fa-water' },
        { id: 'co2',       name: 'CO₂',             unit: 'ppm',color: '#6f42c1', property: 'co2Level',                visible: false, order: 4, group: 'weather', icon: 'fa-wind' }
    ],

    // Параметры ветра
    windParameters: [
        { id: 'windSpeed',    name: 'Скорость ветра', unit: 'м/с', color: '#28a745', property: 'windSpeed',     visible: true,  order: 1, group: 'wind', icon: 'fa-wind' },
        { id: 'windDirection',name: 'Направление',    unit: '°',   color: '#fd7e14', property: 'windDirection', visible: false, order: 2, group: 'wind', icon: 'fa-compass' },
        { id: 'windVSound',   name: 'Скорость звука', unit: 'м/с', color: '#20c997', property: 'windVSound',    visible: false, order: 3, group: 'wind', icon: 'fa-volume-up' }
    ],

    // Параметры осадков
    precipitationParameters: [
        { id: 'precipIntensity', name: 'Интенсивность', unit: 'мм/ч', color: '#0d6efd', property: 'precipitationIntensity', visible: true,  order: 1, group: 'precipitation', icon: 'fa-cloud-rain' },
        { id: 'precipQuantity',  name: 'Количество',    unit: 'мм',   color: '#17a2b8', property: 'precipitationQuantity',  visible: false, order: 2, group: 'precipitation', icon: 'fa-chart-line' }
    ],

    // Параметры давления
    pressureParameters: [
        { id: 'pressureHpa',   name: 'Давление (гПа)', unit: 'гПа', color: '#6610f2', property: 'pressureHpa',     visible: true, order: 1, group: 'pressure', icon: 'fa-thermometer-half' },
        { id: 'pressureQNH',   name: 'QNH (гПа)',      unit: 'гПа', color: '#6f42c1', property: 'pressureQNHHpa',  visible: false, order: 2, group: 'pressure', icon: 'fa-thermometer-half' },
        { id: 'pressureMmHg',  name: 'Давление (мм рт.ст.)', unit: 'мм', color: '#e83e8c', property: 'pressureMmHg', visible: false, order: 3, group: 'pressure', icon: 'fa-thermometer-half' }
    ],

    // Технические параметры
    technicalParameters: [
        { id: 'supplyVoltage', name: 'Напряжение',      unit: 'В',   color: '#28a745', property: 'supplyVoltage',     visible: true,  order: 1, group: 'technical', icon: 'fa-bolt' },
        { id: 'status',        name: 'Статус',          unit: '',    color: '#6c757d', property: 'statusOk',          visible: false, order: 2, group: 'technical', icon: 'fa-check-circle' },
        { id: 'ksp',           name: 'KSP',             unit: '',    color: '#17a2b8', property: 'kspValue',          visible: false, order: 3, group: 'technical', icon: 'fa-microchip' },
        { id: 'acceleration',  name: 'Ускорение σ',     unit: 'м/с²',color: '#fd7e14', property: 'accelerationStdDev',visible: false, order: 4, group: 'technical', icon: 'fa-wave-square' },
        { id: 'roll',          name: 'Крен',            unit: '°',   color: '#dc3545', property: 'rollAngle',         visible: false, order: 5, group: 'technical', icon: 'fa-rotate-left' },
        { id: 'pitch',         name: 'Тангаж',          unit: '°',   color: '#0d6efd', property: 'pitchAngle',        visible: false, order: 6, group: 'technical', icon: 'fa-rotate-right' }
    ],

    init: function(sensorId) {
        console.log('IWSCharts.init()', sensorId);
        this.currentSensorId = sensorId;
        moment.locale('ru');

        this.createParameterRadios();
        
        // Инициализация автообновления через менеджер
        this.initAutoUpdate();
        
        this.loadData(1);

        // Обработчик кнопок периода
        $('#iwsTimeRangeButtons .btn').off('click').on('click', (e) => {
            const btn = $(e.currentTarget);
            if (btn.hasClass('active')) return;

            $('#iwsTimeRangeButtons .btn').removeClass('active');
            btn.addClass('active');
            const days = btn.data('days');
            this.currentDays = days;

            this.loadData(days);
        });

        // Обработчик выбора типа графика (радио-кнопки)
        $('input[name="iwsChartType"]').off('change').on('change', (e) => {
            this.currentChartType = $(e.currentTarget).val();
            this.renderChart();
        });

        // Обработчик переключения вкладок
        $('#iwsTabs button').off('shown.bs.tab').on('shown.bs.tab', (e) => {
            const tabId = $(e.target).attr('id');
            const tabMap = {
                'weather-tab': 'weather',
                'wind-tab': 'wind',
                'precipitation-tab': 'precipitation',
                'pressure-tab': 'pressure',
                'technical-tab': 'technical'
            };
            this.currentTab = tabMap[tabId] || 'weather';
            this.updateChartTitle();
            this.renderChart();
            this.updateStatistics();
        });

        // Обработчик изменения радио-кнопок
        $(document).on('change', '.iws-parameter-radio', () => {
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

        const toggleElement = document.getElementById('iwsAutoUpdateToggle');
        if (!toggleElement) {
            console.error('Элемент iwsAutoUpdateToggle не найден!');
            return;
        }

        this.autoUpdateInstance = AutoUpdateManager.create('iws', {
            interval: 30000,
            onUpdate: () => {
                if (this.currentSensorId) {
                    console.log('IWS: автообновление...');
                    this.loadData(this.currentDays, true);
                }
            }
        });

        console.log('IWS: автообновление инициализировано');
    },

    initDateRangeSlider: function() {
        if (typeof DateRangeSlider === 'undefined') {
            console.error('DateRangeSlider не загружен!');
            return;
        }

        let slider = DateRangeSlider.get('iws');
        if (!slider) {
            slider = DateRangeSlider.create('iws', {
                onRangeChange: (filteredData) => {
                    const originalData = this.allMeasurements;
                    this.allMeasurements = filteredData;
                    this.renderChart();
                    this.updateStatistics();
                    this.allMeasurements = originalData;
                }
            });
        }

        DateRangeSlider.initSlider('iws', this.allMeasurements);
    },

    createParameterRadios: function() {
        this.createRadioGroup('weather', this.weatherParameters);
        this.createRadioGroup('wind', this.windParameters);
        this.createRadioGroup('precipitation', this.precipitationParameters);
        this.createRadioGroup('pressure', this.pressureParameters);
        this.createRadioGroup('technical', this.technicalParameters);
    },

    createRadioGroup: function(groupName, parameters) {
        const container = $(`#iws${groupName.charAt(0).toUpperCase() + groupName.slice(1)}Radios`);
        if (!container.length) return;

        container.empty();
        
        parameters.sort((a, b) => a.order - b.order).forEach(p => {
            container.append(ChartUtils.createParameterRadio(p, groupName, 'iws-parameter-radio'));
        });
    },

    updateVisibleParameters: function() {
        const updateGroup = (groupParams) => {
            groupParams.forEach(p => {
                const radioId = `radio_${p.group}_${p.id}`;
                p.visible = $(`#${radioId}`).is(':checked');
            });
        };
        
        updateGroup(this.weatherParameters);
        updateGroup(this.windParameters);
        updateGroup(this.precipitationParameters);
        updateGroup(this.pressureParameters);
        updateGroup(this.technicalParameters);
    },

    getSelectedParameters: function() {
        const groups = {
            'weather': this.weatherParameters,
            'wind': this.windParameters,
            'precipitation': this.precipitationParameters,
            'pressure': this.pressureParameters,
            'technical': this.technicalParameters
        };
        
        return groups[this.currentTab]?.filter(p => p.visible) || [];
    },

    updateChartTitle: function() {
        const titles = {
            'weather': 'Параметры погоды',
            'wind': 'Параметры ветра',
            'precipitation': 'Параметры осадков',
            'pressure': 'Параметры давления',
            'technical': 'Технические параметры'
        };
        $('#iwsChartTitle').text(titles[this.currentTab] || 'Параметры IWS');
    },

    cleanup: function() {
        console.log('IWSCharts.cleanup()');
        
        if (this.autoUpdateInstance) {
            AutoUpdateManager.destroy('iws');
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

        if (!silent) $('#iwsChartLoadingIndicator').fadeIn(150);

        this.xhr = $.ajax({
            url: '/GraphsAndCharts/GetIWSData',
            type: 'GET',
            data: { sensorId: this.currentSensorId, days: days },
            success: (data) => {
                const oldCount = this.allMeasurements.length;
                this.allMeasurements = data.measurements || [];
                const hasNew = this.allMeasurements.length > oldCount;

                this.renderChart();
                this.updateStatistics();
                this.updateLastUpdateTime(data);

                setTimeout(() => this.initDateRangeSlider(), 50);

                if (silent && hasNew && this.autoUpdateInstance && this.autoUpdateInstance.enabled) {
                    ChartUtils.showNotification('Получены новые данные IWS', 'success');
                }

                this.isLoading = false;
                if (!silent) $('#iwsChartLoadingIndicator').fadeOut(150);
                this.xhr = null;
            },
            error: (xhr, status, error) => {
                if (status !== 'abort') console.error('Ошибка загрузки IWS:', error);
                this.isLoading = false;
                if (!silent) $('#iwsChartLoadingIndicator').fadeOut(150);
                this.xhr = null;
            }
        });
    },

    renderChart: function() {
        if (!this.allMeasurements?.length) return;

        const measurements = this.allMeasurements;
        const timestamps = measurements.map(x => new Date(x.dataTimestamp));

        const timeRange = ChartUtils.getTimeRange(timestamps);
        ChartUtils.updateTimeScaleLabel('iws', timeRange);
        const cfg = ChartUtils.getTimeConfig(timeRange);

        const ctx = document.getElementById('iwsChart')?.getContext('2d');
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

        selected.forEach((param, i) => {
            const validData = measurements
                .map(m => {
                    const value = m[param.property];
                    return {
                        x: new Date(m.dataTimestamp),
                        y: value != null ? parseFloat(value) : null
                    };
                })
                .filter(point => point.y !== null);

            if (validData.length === 0) return;

            const dataset = {
                label: `${param.name} ${param.unit ? `(${param.unit})` : ''}`,
                data: validData,
                borderColor: param.color,
                backgroundColor: ChartUtils.hexToRgba(param.color, 0.1),
                borderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 6,
                tension: 0.3,
                fill: false,
                yAxisID: i === 0 ? 'y' : `y${i + 1}`
            };

            if (this.currentChartType === 'scatter') {
                dataset.type = 'scatter';
                dataset.backgroundColor = param.color;
                dataset.borderColor = 'transparent';
                dataset.pointRadius = 5;
            } else if (this.currentChartType === 'bar') {
                dataset.type = 'bar';
                dataset.barPercentage = 0.8;
                dataset.categoryPercentage = 0.9;
            }

            datasets.push(dataset);
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
        selected.forEach((param, i) => {
            const id = i === 0 ? 'y' : `y${i + 1}`;
            yAxes[id] = {
                type: 'linear',
                display: true,
                position: i === 0 ? 'left' : 'right',
                title: {
                    display: true,
                    text: `${param.name} ${param.unit ? `(${param.unit})` : ''}`
                },
                grid: {
                    drawOnChartArea: i === 0
                },
                ticks: {
                    callback: function(value) {
                        if (param.unit === '°' && param.id === 'windDirection') {
                            return value + '°';
                        }
                        return param.unit ? value.toFixed(1) : value;
                    }
                }
            };
        });

        this.chart = new Chart(ctx, {
            type: this.currentChartType === 'scatter' ? 'scatter' : 'line',
            data: {
                labels: timestamps,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 300 },
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            boxWidth: 8
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    const param = selected.find(p => p.name === context.dataset.label.split(' ')[0]);
                                    if (param && param.unit === '°' && param.id === 'windDirection') {
                                        label += context.parsed.y.toFixed(0) + '°';
                                    } else {
                                        label += context.parsed.y.toFixed(2);
                                    }
                                }
                                return label;
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
                        title: {
                            display: true,
                            text: 'Дата/время'
                        }
                    },
                    ...yAxes
                }
            }
        });
    },

    updateStatistics: function() {
        const container = $('#iwsStatisticsContainer');
        if (!container.length) return;
        
        container.empty();

        const selected = this.getSelectedParameters();
        if (!selected.length) {
            container.html('<div class="col-12 text-center text-muted">Нет выбранного параметра</div>');
            return;
        }

        selected.forEach(param => {
            const values = this.allMeasurements
                .map(m => {
                    const v = m[param.property];
                    return v != null ? parseFloat(v) : null;
                })
                .filter(v => v !== null);

            if (values.length === 0) return;

            const statItem = ChartUtils.createStatisticsItem(param, values);
            if (statItem) container.append(statItem);
        });
    },

    updateLastUpdateTime: function(data) {
        const measurements = data.measurements || [];
        if (measurements.length === 0) {
            $('#iwsLastUpdateTime').text('Нет данных');
            return;
        }
        
        const last = measurements[measurements.length - 1].dataTimestamp;
        $('#iwsLastUpdateTime').text(moment(last).format('DD.MM.YYYY HH:mm:ss'));
        
        if (this.autoUpdateInstance) {
            this.autoUpdateInstance.updateLastUpdateTime(last);
        }
    }
};

$(document).ready(function() {
    console.log('✅ IWS Charts загружен');
    
    $(document).on('sensorChanged', () => {
        if (typeof IWSCharts !== 'undefined') {
            IWSCharts.cleanup();
        }
    });
});