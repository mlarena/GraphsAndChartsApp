// iws-charts.js - Полная версия для метеостанции IWS

const IWSCharts = {
    chart: null,
    currentSensorId: null,
    allMeasurements: [],
    dateSlider: null,
    minDate: null,
    maxDate: null,
    isLoading: false,
    sliderInitialized: false,
    currentDays: 1,
    currentChartType: 'line',
    currentTab: 'weather',

    // Параметры погоды
    weatherParameters: [
        { id: 'envTemp',   name: 'Температура',     unit: '°C', color: '#dc3545', property: 'environmentTemperature', visible: true,  order: 1, group: 'weather', icon: 'fa-temperature-high' },
        { id: 'humidity',  name: 'Влажность',       unit: '%',  color: '#0d6efd', property: 'humidityPercentage',      visible: true,  order: 2, group: 'weather', icon: 'fa-tint' },
        { id: 'dewPoint',  name: 'Точка росы',      unit: '°C', color: '#17a2b8', property: 'dewPoint',                visible: true,  order: 3, group: 'weather', icon: 'fa-water' },
        { id: 'co2',       name: 'CO₂',             unit: 'ppm',color: '#6f42c1', property: 'co2Level',                visible: false, order: 4, group: 'weather', icon: 'fa-wind' }
    ],

    // Параметры ветра
    windParameters: [
        { id: 'windSpeed',    name: 'Скорость ветра', unit: 'м/с', color: '#28a745', property: 'windSpeed',     visible: true,  order: 1, group: 'wind', icon: 'fa-wind' },
        { id: 'windDirection',name: 'Направление',    unit: '°',   color: '#fd7e14', property: 'windDirection', visible: true,  order: 2, group: 'wind', icon: 'fa-compass' },
        { id: 'windVSound',   name: 'Скорость звука', unit: 'м/с', color: '#20c997', property: 'windVSound',    visible: false, order: 3, group: 'wind', icon: 'fa-volume-up' }
    ],

    // Параметры осадков
    precipitationParameters: [
        { id: 'precipIntensity', name: 'Интенсивность', unit: 'мм/ч', color: '#0d6efd', property: 'precipitationIntensity', visible: true,  order: 1, group: 'precipitation', icon: 'fa-cloud-rain' },
        { id: 'precipQuantity',  name: 'Количество',    unit: 'мм',   color: '#17a2b8', property: 'precipitationQuantity',  visible: true,  order: 2, group: 'precipitation', icon: 'fa-chart-line' },
        { id: 'precipType',      name: 'Тип осадков',   unit: '',     color: '#6c757d', property: 'precipitationType',     visible: false, order: 3, group: 'precipitation', icon: 'fa-question' },
        { id: 'precipElapsed',   name: 'Время осадков', unit: 'с',    color: '#ffc107', property: 'precipitationElapsed',  visible: false, order: 4, group: 'precipitation', icon: 'fa-clock' },
        { id: 'precipPeriod',    name: 'Период',        unit: 'с',    color: '#dc3545', property: 'precipitationPeriod',   visible: false, order: 5, group: 'precipitation', icon: 'fa-hourglass' }
    ],

    // Параметры давления
    pressureParameters: [
        { id: 'pressureHpa',   name: 'Давление (гПа)', unit: 'гПа', color: '#6610f2', property: 'pressureHpa',     visible: true, order: 1, group: 'pressure', icon: 'fa-thermometer-half' },
        { id: 'pressureQNH',   name: 'QNH (гПа)',      unit: 'гПа', color: '#6f42c1', property: 'pressureQNHHpa',  visible: true, order: 2, group: 'pressure', icon: 'fa-thermometer-half' },
        { id: 'pressureMmHg',  name: 'Давление (мм рт.ст.)', unit: 'мм', color: '#e83e8c', property: 'pressureMmHg', visible: true, order: 3, group: 'pressure', icon: 'fa-thermometer-half' }
    ],

    // Параметры позиционирования
    positionParameters: [
        { id: 'latitude',  name: 'Широта',      unit: '°', color: '#28a745', property: 'iwsLatitude',  visible: false, order: 1, group: 'position', icon: 'fa-map-pin' },
        { id: 'longitude', name: 'Долгота',     unit: '°', color: '#17a2b8', property: 'iwsLongitude', visible: false, order: 2, group: 'position', icon: 'fa-map-pin' },
        { id: 'altitude',  name: 'Высота',      unit: 'м', color: '#ffc107', property: 'altitude',     visible: true,  order: 3, group: 'position', icon: 'fa-mountain' },
        { id: 'gpsSpeed',  name: 'Скорость GPS',unit: 'м/с',color: '#dc3545', property: 'gpsSpeed',     visible: false, order: 4, group: 'position', icon: 'fa-tachometer-alt' }
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

    // Автообновление
    autoUpdateEnabled: true,
    autoUpdateInterval: 30000,
    autoUpdateTimerId: null,
    countdownInterval: null,
    lastUpdateTime: null,
    tempAutoUpdateState: null,

    init: function(sensorId) {
        console.log('IWSCharts.init()', sensorId);
        this.currentSensorId = sensorId;
        moment.locale('ru');

        this.createParameterCheckboxes();
        this.loadData(1); // загружаем за 24 часа по умолчанию

        // Обработчик кнопок периода
        $('#iwsTimeRangeButtons .btn').off('click').on('click', (e) => {
            const btn = $(e.currentTarget);
            if (btn.hasClass('active')) return;

            $('#iwsTimeRangeButtons .btn').removeClass('active');
            btn.addClass('active');
            const days = btn.data('days');
            this.currentDays = days;

            if (this.autoUpdateEnabled) {
                this.restartAutoUpdate();
            }

            this.loadData(days);
        });

        // Обработчик выбора типа графика
        $('#iwsChartTypeSelect').off('change').on('change', (e) => {
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
                'position-tab': 'position',
                'technical-tab': 'technical'
            };
            this.currentTab = tabMap[tabId] || 'weather';
            this.updateChartTitle();
            this.renderChart();
            this.updateStatistics();
        });

        // Обработчик изменения чекбоксов
        $(document).on('change', '.iws-parameter-checkbox', () => {
            this.updateVisibleParameters();
            this.renderChart();
            this.updateStatistics();
        });

        // Обработчик автообновления
        $('#iwsAutoUpdateToggle').off('change').on('change', (e) => {
            const checked = $(e.currentTarget).is(':checked');
            if (checked) {
                this.autoUpdateEnabled = true;
                this.startAutoUpdate();
                $('#iwsCountdownTimer').show();
                console.log('✅ Автообновление IWS ВКЛЮЧЕНО');
            } else {
                this.autoUpdateEnabled = false;
                this.stopAutoUpdate();
                $('#iwsCountdownTimer').hide();
                console.log('❌ Автообновление IWS ОТКЛЮЧЕНО');
            }
        });

        this.startAutoUpdate();
    },

    createParameterCheckboxes: function() {
        // Создаем чекбоксы для каждой группы
        this.createCheckboxGroup('weather', this.weatherParameters);
        this.createCheckboxGroup('wind', this.windParameters);
        this.createCheckboxGroup('precipitation', this.precipitationParameters);
        this.createCheckboxGroup('pressure', this.pressureParameters);
        this.createCheckboxGroup('position', this.positionParameters);
        this.createCheckboxGroup('technical', this.technicalParameters);
    },

    createCheckboxGroup: function(groupName, parameters) {
        const container = $(`#iws${groupName.charAt(0).toUpperCase() + groupName.slice(1)}Checkboxes`);
        if (!container.length) return;

        container.empty();
        
        // Сортируем и добавляем параметры
        parameters.sort((a, b) => a.order - b.order).forEach(p => {
            container.append(this.createCheckbox(p, groupName));
        });
    },

    createCheckbox: function(param, group) {
        const groupCap = group.charAt(0).toUpperCase() + group.slice(1);
        return $(`
            <div class="col-md-4 col-sm-6 mb-2">
                <div class="form-check">
                    <input class="form-check-input iws-parameter-checkbox"
                           type="checkbox"
                           id="iws_param_${param.id}"
                           data-param-id="${param.id}"
                           data-group="${group}"
                           data-property="${param.property}"
                           ${param.visible ? 'checked' : ''}>
                    <label class="form-check-label small" for="iws_param_${param.id}">
                        <i class="fas ${param.icon || 'fa-chart-line'} me-1" style="color:${param.color};"></i>
                        <span style="display:inline-block;width:8px;height:8px;background-color:${param.color};border-radius:50%;margin-right:4px;"></span>
                        ${param.name} ${param.unit ? `(${param.unit})` : ''}
                    </label>
                </div>
            </div>
        `);
    },

    updateVisibleParameters: function() {
        // Обновляем видимость для всех групп параметров
        this.weatherParameters.forEach(p => p.visible = $(`#iws_param_${p.id}`).is(':checked'));
        this.windParameters.forEach(p => p.visible = $(`#iws_param_${p.id}`).is(':checked'));
        this.precipitationParameters.forEach(p => p.visible = $(`#iws_param_${p.id}`).is(':checked'));
        this.pressureParameters.forEach(p => p.visible = $(`#iws_param_${p.id}`).is(':checked'));
        this.positionParameters.forEach(p => p.visible = $(`#iws_param_${p.id}`).is(':checked'));
        this.technicalParameters.forEach(p => p.visible = $(`#iws_param_${p.id}`).is(':checked'));
    },

    getSelectedParameters: function() {
        const groups = {
            'weather': this.weatherParameters,
            'wind': this.windParameters,
            'precipitation': this.precipitationParameters,
            'pressure': this.pressureParameters,
            'position': this.positionParameters,
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
            'position': 'Параметры позиционирования',
            'technical': 'Технические параметры'
        };
        $('#iwsChartTitle').text(titles[this.currentTab] || 'Параметры IWS');
    },

    startAutoUpdate: function() {
        this.stopAutoUpdate();

        if (!this.autoUpdateEnabled) return;

        console.log('🔄 Запуск автообновления IWS (30 сек)');

        let secondsLeft = 30;
        $('#iwsCountdownTimer').text(secondsLeft).show();

        this.countdownInterval = setInterval(() => {
            secondsLeft--;
            if (secondsLeft <= 0) secondsLeft = 30;
            $('#iwsCountdownTimer').text(secondsLeft);
        }, 1000);

        this.autoUpdateTimerId = setInterval(() => {
            if (this.autoUpdateEnabled && this.currentSensorId) {
                console.log('Автообновление IWS: загрузка...');
                this.loadData(this.currentDays, true);
            }
        }, this.autoUpdateInterval);
    },

    stopAutoUpdate: function() {
        if (this.autoUpdateTimerId) {
            clearInterval(this.autoUpdateTimerId);
            this.autoUpdateTimerId = null;
        }
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
    },

    restartAutoUpdate: function() {
        if (this.autoUpdateEnabled) this.startAutoUpdate();
    },

    cleanup: function() {
        console.log('IWSCharts.cleanup()');
        this.stopAutoUpdate();
        this.autoUpdateEnabled = true;

        $('#iwsAutoUpdateToggle').prop('checked', true);
        $('#iwsCountdownTimer').show().text('30');

        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }

        if (this.dateSlider) {
            try { this.dateSlider.destroy(); } catch(e) {}
            this.dateSlider = null;
        }

        this.sliderInitialized = false;
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
                this.updateStatistics(data);
                this.updateLastUpdateTime(data);

                setTimeout(() => this.initDateRangeSlider(), 50);

                if (silent && hasNew && this.autoUpdateEnabled) {
                    this.showNotification('Получены новые данные IWS');
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

    showNotification: function(message) {
        const $n = $(`
            <div class="alert alert-success alert-dismissible fade show position-fixed top-0 end-0 m-3" style="z-index:9999;" role="alert">
                <i class="fas fa-info-circle"></i> ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `);
        $('body').append($n);
        setTimeout(() => $n.alert('close'), 3000);
    },

    initDateRangeSlider: function() {
        if (typeof noUiSlider === 'undefined') {
            console.error('noUiSlider не загружен');
            return;
        }

        if (!this.allMeasurements || this.allMeasurements.length < 2) {
            $('#iwsDateRangeSection').addClass('disabled');
            $('#iwsSliderContainer').addClass('disabled');
            return;
        }

        const timestamps = this.allMeasurements.map(m => new Date(m.dataTimestamp).getTime());
        this.minDate = Math.min(...timestamps);
        this.maxDate = Math.max(...timestamps);

        if (isNaN(this.minDate) || isNaN(this.maxDate) || this.minDate >= this.maxDate) {
            console.error('Некорректные даты для слайдера IWS');
            return;
        }

        const formatDate = (ts) => moment(ts).format('DD.MM.YYYY HH:mm');

        $('#iwsMinDateLabel').text(formatDate(this.minDate));
        $('#iwsMaxDateLabel').text(formatDate(this.maxDate));
        $('#iwsDateRangeLabel').text(`${formatDate(this.minDate)} - ${formatDate(this.maxDate)}`);

        const slider = document.getElementById('iwsDateRangeSlider');
        if (!slider) return;

        $('#iwsDateRangeSection').removeClass('disabled');
        $('#iwsSliderContainer').removeClass('disabled');

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
                    $('#iwsDateRangeLabel').text(`${start} - ${end}`);
                });

                this.dateSlider.on('end', (values) => {
                    const startTime = parseInt(values[0]);
                    const endTime   = parseInt(values[1]);
                    this.filterDataByDateRange(startTime, endTime);
                });

                this.dateSlider.on('start', () => {
                    if (this.autoUpdateEnabled) {
                        this.tempAutoUpdateState = this.autoUpdateEnabled;
                        this.stopAutoUpdate();
                    }
                });

                this.dateSlider.on('end', () => {
                    if (this.tempAutoUpdateState) {
                        this.startAutoUpdate();
                        this.tempAutoUpdateState = null;
                    }
                });

                this.sliderInitialized = true;
            } catch(e) {
                console.error('Ошибка создания слайдера IWS:', e);
            }
        }, 50);
    },

    filterDataByDateRange: function(start, end) {
        const filtered = this.allMeasurements.filter(m => {
            const t = new Date(m.dataTimestamp).getTime();
            return t >= start && t <= end;
        });

        const original = this.allMeasurements;
        this.allMeasurements = filtered;
        this.renderChart();
        this.updateStatistics();
        this.allMeasurements = original;
    },

    renderChart: function() {
        if (!this.allMeasurements?.length) return;

        const measurements = this.allMeasurements;
        const timestamps = measurements.map(x => new Date(x.dataTimestamp));

        const timeRange = this.getTimeRange(timestamps);
        this.updateTimeScaleLabel(timeRange);
        const cfg = this.getTimeConfig(timeRange);

        const ctx = document.getElementById('iwsChart')?.getContext('2d');
        if (!ctx) return;

        if (this.chart) this.chart.destroy();

        const selected = this.getSelectedParameters();
        if (!selected.length) {
            // Показываем пустой график с сообщением
            this.chart = new Chart(ctx, {
                type: 'line',
                data: { labels: [], datasets: [] },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Нет выбранных параметров',
                            color: '#666',
                            font: { size: 14 }
                        }
                    }
                }
            });
            return;
        }

        const datasets = [];
        const yAxes = {};

        selected.forEach((param, index) => {
            // Фильтруем null значения
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
                backgroundColor: this.hexToRgba(param.color, 0.1),
                borderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 6,
                tension: 0.3,
                fill: false,
                yAxisID: index === 0 ? 'y' : `y${index + 1}`
            };

            // Применяем тип графика
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

            // Настраиваем ось Y
            const axisId = index === 0 ? 'y' : `y${index + 1}`;
            yAxes[axisId] = {
                type: 'linear',
                display: true,
                position: index === 0 ? 'left' : 'right',
                title: {
                    display: true,
                    text: `${param.name} ${param.unit ? `(${param.unit})` : ''}`
                },
                grid: {
                    drawOnChartArea: index === 0
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
            container.html('<div class="col-12 text-center text-muted">Нет выбранных параметров</div>');
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

            const col = $(`
                <div class="col-md-4 col-sm-6 mb-2">
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
            
            container.append(col);
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
        this.lastUpdateTime = last;
    },

    // Вспомогательные методы
    hexToRgba: function(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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
        const configs = {
            hour:   { unit: 'hour',   displayFormats: { hour: 'HH:mm' } },
            hour6:  { unit: 'hour',   displayFormats: { hour: 'HH:mm' } },
            day:    { unit: 'day',    displayFormats: { day: 'dd.MM' } },
            week:   { unit: 'week',   displayFormats: { week: 'dd.MM' } },
            month:  { unit: 'month',  displayFormats: { month: 'MMM yyyy' } }
        };
        return configs[range] || configs.day;
    },

    updateTimeScaleLabel: function(range) {
        const labels = {
            hour: 'часы',
            hour6: '6 часов',
            day: 'дни',
            week: 'недели',
            month: 'месяцы'
        };
        $('#iwsTimeScaleLabel').text(labels[range] || 'авто');
    }
};

// Инициализация при загрузке страницы
$(document).ready(function() {
    console.log('✅ IWS Charts загружен');
    
    // Очищаем при смене сенсора
    $(document).on('sensorChanged', () => {
        if (typeof IWSCharts !== 'undefined') {
            IWSCharts.cleanup();
        }
    });
});