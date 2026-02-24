// dspd-charts.js - Модуль для визуализации данных датчика состояния дорожного полотна

const DSPDCharts = {
    chart: null,
    currentSensorId: null,
    allMeasurements: [],
    isLoading: false,
    currentDays: 1,
    currentChartType: 'line',
    currentTab: 'roadCondition',
    autoUpdateInstance: null,

    // Параметры сцепления и состояния дороги
    roadConditionParameters: [
        { id: 'grip', name: 'Коэф. сцепления', unit: '', color: '#28a745', property: 'gripCoefficient', visible: true, order: 1, group: 'roadCondition', icon: 'fa-road', description: 'Коэффициент сцепления с дорогой' },
        { id: 'roadTemp', name: 'Темп. дороги', unit: '°C', color: '#dc3545', property: 'roadTemperature', visible: false, order: 2, group: 'roadCondition', icon: 'fa-thermometer-half', description: 'Температура дорожного покрытия' },
        { id: 'roadAngle', name: 'Уклон', unit: '°', color: '#ffc107', property: 'roadAngle', visible: false, order: 3, group: 'roadCondition', icon: 'fa-mountain', description: 'Угол наклона дороги' },
        { id: 'freezeTemp', name: 'Заморозки', unit: '°C', color: '#343a40', property: 'freezeTemperature', visible: false, order: 4, group: 'roadCondition', icon: 'fa-snowflake', description: 'Температура замерзания' }
    ],

    // Параметры осадков на дороге
    precipitationLayerParameters: [
        { id: 'water', name: 'Вода', unit: 'мм', color: '#0d6efd', property: 'waterHeight', visible: true, order: 1, group: 'precipitationLayer', icon: 'fa-water', description: 'Высота слоя воды' },
        { id: 'ice', name: 'Лед', unit: 'мм', color: '#17a2b8', property: 'iceHeight', visible: false, order: 2, group: 'precipitationLayer', icon: 'fa-regular fa-snowflake', description: 'Высота слоя льда' },
        { id: 'snow', name: 'Снег', unit: 'мм', color: '#6c757d', property: 'snowHeight', visible: false, order: 3, group: 'precipitationLayer', icon: 'fa-snowman', description: 'Высота слоя снега' },
        { id: 'icePct', name: '% льда', unit: '%', color: '#6610f2', property: 'icePercentage', visible: false, order: 4, group: 'precipitationLayer', icon: 'fa-percent', description: 'Процент содержания льда' },
        { id: 'pgmPct', name: '% ПГМ', unit: '%', color: '#e83e8c', property: 'pgmPercentage', visible: false, order: 5, group: 'precipitationLayer', icon: 'fa-flask', description: 'Процент противогололедных материалов' }
    ],

    // Технические параметры датчика
    technicalParameters: [
        { id: 'voltage', name: 'Напряжение', unit: 'В', color: '#6f42c1', property: 'voltagePower', visible: true, order: 1, group: 'technical', icon: 'fa-bolt', description: 'Напряжение питания' },
        { id: 'caseTemp', name: 'Темп. корпуса', unit: '°C', color: '#20c997', property: 'caseTemperature', visible: false, order: 2, group: 'technical', icon: 'fa-thermometer-empty', description: 'Температура корпуса датчика' },
        { id: 'shake', name: 'Вибрация', unit: '', color: '#fd7e14', property: 'shakeLevel', visible: false, order: 3, group: 'technical', icon: 'fa-wave-square', description: 'Уровень вибрации' }
    ],

    init: function(sensorId) {
        console.log('DSPDCharts.init()', sensorId);
        this.currentSensorId = sensorId;
        moment.locale('ru');

        this.createParameterRadios();
        
        // Инициализация автообновления через менеджер
        this.initAutoUpdate();
        
        this.loadData(1);

        // Обработчик кнопок периода
        $('#dspdTimeRangeButtons .btn').off('click').on('click', (e) => {
            const btn = $(e.currentTarget);
            if (btn.hasClass('active')) return;

            $('#dspdTimeRangeButtons .btn').removeClass('active');
            btn.addClass('active');
            const days = btn.data('days');
            this.currentDays = days;

            this.loadData(days);
        });

        // Обработчик типа графика (радио-кнопки)
        $('input[name="dspdChartType"]').off('change').on('change', (e) => {
            this.currentChartType = $(e.currentTarget).val();
            this.renderChart();
        });

        // Обработчик переключения вкладок
        $('#dspdTabs button').off('shown.bs.tab').on('shown.bs.tab', (e) => {
            const tabId = $(e.target).attr('id');
            const tabMap = {
                'road-condition-tab': 'roadCondition',
                'precipitation-layer-tab': 'precipitationLayer',
                'technical-tab': 'technical'
            };
            this.currentTab = tabMap[tabId] || 'roadCondition';
            this.updateChartTitle();
            this.renderChart();
            this.updateStatistics();
        });

        // Радио-кнопки параметров
        $(document).on('change', '.dspd-parameter-radio', () => {
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

        const toggleElement = document.getElementById('dspdAutoUpdateToggle');
        if (!toggleElement) {
            console.error('Элемент dspdAutoUpdateToggle не найден!');
            return;
        }

        this.autoUpdateInstance = AutoUpdateManager.create('dspd', {
            interval: 30000,
            onUpdate: () => {
                if (this.currentSensorId) {
                    console.log('DSPD: автообновление...');
                    this.loadData(this.currentDays, true);
                }
            }
        });

        console.log('DSPD: автообновление инициализировано');
    },

    initDateRangeSlider: function() {
        if (typeof DateRangeSlider === 'undefined') {
            console.error('DateRangeSlider не загружен!');
            return;
        }

        let slider = DateRangeSlider.get('dspd');
        if (!slider) {
            slider = DateRangeSlider.create('dspd', {
                onRangeChange: (filteredData) => {
                    const originalData = this.allMeasurements;
                    this.allMeasurements = filteredData;
                    this.renderChart();
                    this.updateStatistics();
                    this.allMeasurements = originalData;
                }
            });
        }

        DateRangeSlider.initSlider('dspd', this.allMeasurements);
    },

    createParameterRadios: function() {
        this.createRadioGroup('roadCondition', this.roadConditionParameters);
        this.createRadioGroup('precipitationLayer', this.precipitationLayerParameters);
        this.createRadioGroup('technical', this.technicalParameters);
    },

    createRadioGroup: function(groupName, parameters) {
        const container = $(`#dspd${groupName.charAt(0).toUpperCase() + groupName.slice(1)}Radios`);
        if (!container.length) return;

        container.empty();
        
        parameters.sort((a, b) => a.order - b.order).forEach(p => {
            container.append(ChartUtils.createParameterRadio(p, groupName, 'dspd-parameter-radio'));
        });
    },

    updateVisibleParameters: function() {
        const updateGroup = (groupParams) => {
            groupParams.forEach(p => {
                const radioId = `radio_${p.group}_${p.id}`;
                p.visible = $(`#${radioId}`).is(':checked');
            });
        };
        
        updateGroup(this.roadConditionParameters);
        updateGroup(this.precipitationLayerParameters);
        updateGroup(this.technicalParameters);
    },

    getSelectedParameters: function() {
        const groups = {
            'roadCondition': this.roadConditionParameters,
            'precipitationLayer': this.precipitationLayerParameters,
            'technical': this.technicalParameters
        };
        
        return groups[this.currentTab]?.filter(p => p.visible) || [];
    },

    updateChartTitle: function() {
        const titles = {
            'roadCondition': 'Состояние дороги',
            'precipitationLayer': 'Осадки на дороге',
            'technical': 'Технические параметры'
        };
        $('#dspdChartTitle').text(`DSPD: ${titles[this.currentTab] || 'Параметры'}`);
    },

    cleanup: function() {
        console.log('DSPDCharts.cleanup()');
        
        if (this.autoUpdateInstance) {
            AutoUpdateManager.destroy('dspd');
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
        if (!silent) $('#dspdChartLoadingIndicator').fadeIn(150);

        this.xhr = $.ajax({
            url: '/GraphsAndCharts/GetDSPDData',
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
                    ChartUtils.showNotification('Получены новые данные DSPD', 'success');
                }

                this.isLoading = false;
                if (!silent) $('#dspdChartLoadingIndicator').fadeOut(150);
                this.xhr = null;
            },
            error: (xhr, s, err) => {
                if (s !== 'abort') console.error('DSPD load error:', err);
                this.isLoading = false;
                if (!silent) $('#dspdChartLoadingIndicator').fadeOut(150);
                this.xhr = null;
            }
        });
    },

    renderChart: function() {
        if (!this.allMeasurements?.length) return;

        const measurements = this.allMeasurements;
        const timestamps = measurements.map(x => new Date(x.dataTimestamp));

        const timeRange = ChartUtils.getTimeRange(timestamps);
        ChartUtils.updateTimeScaleLabel('dspd', timeRange);
        const cfg = ChartUtils.getTimeConfig(timeRange);

        const ctx = document.getElementById('dspdChart')?.getContext('2d');
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
        const container = $('#dspdStatisticsContainer');
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
            $('#dspdLastUpdateTime').text('Нет данных');
            return;
        }
        
        const last = measurements[measurements.length-1].dataTimestamp;
        $('#dspdLastUpdateTime').text(moment(last).format('DD.MM.YYYY HH:mm:ss'));
        
        if (this.autoUpdateInstance) {
            this.autoUpdateInstance.updateLastUpdateTime(last);
        }
    }
};

$(document).ready(function() {
    console.log('✅ DSPD Charts загружен');
    $(document).on('sensorChanged', () => {
        if (typeof DSPDCharts !== 'undefined') DSPDCharts.cleanup();
    });
});