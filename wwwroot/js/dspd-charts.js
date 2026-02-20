// DSPD Charts - Модуль для визуализации данных датчика состояния дорожного полотна

const DSPDCharts = {
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
    currentTab: 'roadCondition',

    // Параметры сцепления и состояния дороги
    roadConditionParameters: [
        { id: 'grip', name: 'Коэф. сцепления', unit: '', color: '#28a745', property: 'gripCoefficient', visible: true, order: 1, group: 'roadCondition', icon: 'fa-road', description: 'Коэффициент сцепления с дорогой' },
        { id: 'roadTemp', name: 'Темп. дороги', unit: '°C', color: '#dc3545', property: 'roadTemperature', visible: true, order: 2, group: 'roadCondition', icon: 'fa-thermometer-half', description: 'Температура дорожного покрытия' },
        { id: 'roadAngle', name: 'Уклон', unit: '°', color: '#ffc107', property: 'roadAngle', visible: false, order: 3, group: 'roadCondition', icon: 'fa-mountain', description: 'Угол наклона дороги' },
        { id: 'freezeTemp', name: 'Заморозки', unit: '°C', color: '#343a40', property: 'freezeTemperature', visible: false, order: 4, group: 'roadCondition', icon: 'fa-snowflake', description: 'Температура замерзания' }
    ],

    // Параметры осадков на дороге
    precipitationLayerParameters: [
        { id: 'water', name: 'Вода', unit: 'мм', color: '#0d6efd', property: 'waterHeight', visible: true, order: 1, group: 'precipitationLayer', icon: 'fa-water', description: 'Высота слоя воды' },
        { id: 'ice', name: 'Лед', unit: 'мм', color: '#17a2b8', property: 'iceHeight', visible: true, order: 2, group: 'precipitationLayer', icon: 'fa-regular fa-snowflake', description: 'Высота слоя льда' },
        { id: 'snow', name: 'Снег', unit: 'мм', color: '#6c757d', property: 'snowHeight', visible: true, order: 3, group: 'precipitationLayer', icon: 'fa-snowman', description: 'Высота слоя снега' },
        { id: 'icePct', name: '% льда', unit: '%', color: '#6610f2', property: 'icePercentage', visible: false, order: 4, group: 'precipitationLayer', icon: 'fa-percent', description: 'Процент содержания льда' },
        { id: 'pgmPct', name: '% ПГМ', unit: '%', color: '#e83e8c', property: 'pgmPercentage', visible: false, order: 5, group: 'precipitationLayer', icon: 'fa-flask', description: 'Процент противогололедных материалов' }
    ],

    // Технические параметры датчика
    technicalParameters: [
        { id: 'voltage', name: 'Напряжение', unit: 'В', color: '#6f42c1', property: 'voltagePower', visible: true, order: 1, group: 'technical', icon: 'fa-bolt', description: 'Напряжение питания' },
        { id: 'caseTemp', name: 'Темп. корпуса', unit: '°C', color: '#20c997', property: 'caseTemperature', visible: true, order: 2, group: 'technical', icon: 'fa-thermometer-empty', description: 'Температура корпуса датчика' },
        { id: 'shake', name: 'Вибрация', unit: '', color: '#fd7e14', property: 'shakeLevel', visible: false, order: 3, group: 'technical', icon: 'fa-wave-square', description: 'Уровень вибрации' },
        { id: 'distance', name: 'Дистанция', unit: 'мм', color: '#7952b3', property: 'distanceToSurface', visible: false, order: 4, group: 'technical', icon: 'fa-ruler', description: 'Расстояние до поверхности' }
    ],

    // Параметры калибровки и статуса
    calibrationParameters: [
        { id: 'calibrationNeeded', name: 'Калибровка', unit: '', color: '#dc3545', property: 'calibrationNeeded', visible: false, order: 1, group: 'calibration', icon: 'fa-exclamation-triangle', description: 'Требуется калибровка' },
        { id: 'gpsValid', name: 'GPS статус', unit: '', color: '#28a745', property: 'gpsValid', visible: false, order: 2, group: 'calibration', icon: 'fa-satellite', description: 'Статус GPS сигнала' }
    ],

    // Параметры позиционирования
    positionParameters: [
        { id: 'gpsLat', name: 'Широта', unit: '°', color: '#17a2b8', property: 'gpsLatitude', visible: false, order: 1, group: 'position', icon: 'fa-map-pin', description: 'GPS широта' },
        { id: 'gpsLon', name: 'Долгота', unit: '°', color: '#20c997', property: 'gpsLongitude', visible: false, order: 2, group: 'position', icon: 'fa-map-pin', description: 'GPS долгота' }
    ],

    // Автообновление
    autoUpdateEnabled: true,
    autoUpdateInterval: 30000,
    autoUpdateTimerId: null,
    countdownInterval: null,
    lastUpdateTime: null,
    tempAutoUpdateState: null,

    init: function(sensorId) {
        console.log('DSPDCharts.init()', sensorId);
        this.currentSensorId = sensorId;
        moment.locale('ru');

        this.createParameterCheckboxes();
        this.loadData(1); // по умолчанию 24ч

        // Обработчик кнопок периода
        $('#dspdTimeRangeButtons .btn').off('click').on('click', (e) => {
            const btn = $(e.currentTarget);
            if (btn.hasClass('active')) return;

            $('#dspdTimeRangeButtons .btn').removeClass('active');
            btn.addClass('active');
            const days = btn.data('days');
            this.currentDays = days;

            if (this.autoUpdateEnabled) this.restartAutoUpdate();

            this.loadData(days);
        });

        // Обработчик типа графика
        $('#dspdChartTypeSelect').off('change').on('change', (e) => {
            this.currentChartType = $(e.currentTarget).val();
            this.renderChart();
        });

        // Обработчик переключения вкладок
        $('#dspdTabs button').off('shown.bs.tab').on('shown.bs.tab', (e) => {
            const tabId = $(e.target).attr('id');
            const tabMap = {
                'road-condition-tab': 'roadCondition',
                'precipitation-layer-tab': 'precipitationLayer',
                'technical-tab': 'technical',
                'calibration-tab': 'calibration',
                'position-tab': 'position'
            };
            this.currentTab = tabMap[tabId] || 'roadCondition';
            this.updateChartTitle();
            this.renderChart();
            this.updateStatistics();
        });

        // Чекбоксы параметров
        $(document).on('change', '.dspd-parameter-checkbox', () => {
            this.updateVisibleParameters();
            this.limitSelectedParameters();
            this.renderChart();
            this.updateStatistics();
        });

        // Автообновление
        $('#dspdAutoUpdateToggle').off('change').on('change', (e) => {
            const isChecked = $(e.currentTarget).is(':checked');
            if (isChecked) {
                this.autoUpdateEnabled = true;
                this.startAutoUpdate();
                $('#dspdCountdownTimer').show();
            } else {
                this.autoUpdateEnabled = false;
                this.stopAutoUpdate();
                $('#dspdCountdownTimer').hide();
            }
        });

        this.startAutoUpdate();
    },

    createParameterCheckboxes: function() {
        // Создаем чекбоксы для каждой группы
        this.createCheckboxGroup('RoadCondition', this.roadConditionParameters);
        this.createCheckboxGroup('PrecipitationLayer', this.precipitationLayerParameters);
        this.createCheckboxGroup('Technical', this.technicalParameters);
        this.createCheckboxGroup('Calibration', this.calibrationParameters);
        this.createCheckboxGroup('Position', this.positionParameters);
    },

    createCheckboxGroup: function(groupName, parameters) {
        const container = $(`#dspd${groupName}Checkboxes`);
        if (!container.length) return;

        container.empty();
        
        // Сортируем и добавляем параметры
        parameters.sort((a, b) => a.order - b.order).forEach(p => {
            container.append(this.createCheckbox(p, groupName));
        });
    },

    createCheckbox: function(param, group) {
        return $(`
            <div class="col-md-4 col-sm-6 mb-2">
                <div class="form-check">
                    <input class="form-check-input dspd-parameter-checkbox"
                           type="checkbox"
                           id="dspd_param_${param.id}"
                           data-param-id="${param.id}"
                           data-group="${param.group}"
                           data-property="${param.property}"
                           ${param.visible ? 'checked' : ''}>
                    <label class="form-check-label small" for="dspd_param_${param.id}" title="${param.description || ''}">
                        <i class="fas ${param.icon || 'fa-chart-line'} me-1" style="color:${param.color};"></i>
                        <span style="display:inline-block; width:8px; height:8px; background-color:${param.color}; border-radius:50%; margin-right:4px;"></span>
                        ${param.name} ${param.unit ? `(${param.unit})` : ''}
                    </label>
                </div>
            </div>
        `);
    },

    limitSelectedParameters: function() {
        // Обновляем счетчики для каждой группы
        const groups = ['roadCondition', 'precipitationLayer', 'technical', 'calibration', 'position'];
        
        groups.forEach(group => {
            const groupParams = this[`${group}Parameters`] || [];
            const groupCheckboxes = groupParams.map(p => $(`#dspd_param_${p.id}`));
            const checkedCount = groupCheckboxes.filter(cb => cb.is(':checked')).length;
            
            const groupName = {
                'roadCondition': 'RoadCondition',
                'precipitationLayer': 'PrecipitationLayer',
                'technical': 'Technical',
                'calibration': 'Calibration',
                'position': 'Position'
            }[group];
            
            // Блокируем невыбранные чекбоксы если достигнут лимит
            if (checkedCount >= 4) {
                groupParams.forEach(p => {
                    if (!$(`#dspd_param_${p.id}`).is(':checked')) {
                        $(`#dspd_param_${p.id}`).prop('disabled', true);
                    }
                });
            } else {
                groupParams.forEach(p => {
                    $(`#dspd_param_${p.id}`).prop('disabled', false);
                });
            }
        });
    },

    updateVisibleParameters: function() {
        // Обновляем видимость для всех групп параметров
        this.roadConditionParameters.forEach(p => p.visible = $(`#dspd_param_${p.id}`).is(':checked'));
        this.precipitationLayerParameters.forEach(p => p.visible = $(`#dspd_param_${p.id}`).is(':checked'));
        this.technicalParameters.forEach(p => p.visible = $(`#dspd_param_${p.id}`).is(':checked'));
        this.calibrationParameters.forEach(p => p.visible = $(`#dspd_param_${p.id}`).is(':checked'));
        this.positionParameters.forEach(p => p.visible = $(`#dspd_param_${p.id}`).is(':checked'));
    },

    getSelectedParameters: function() {
        const groups = {
            'roadCondition': this.roadConditionParameters,
            'precipitationLayer': this.precipitationLayerParameters,
            'technical': this.technicalParameters,
            'calibration': this.calibrationParameters,
            'position': this.positionParameters
        };
        
        return groups[this.currentTab]?.filter(p => p.visible) || [];
    },

    updateChartTitle: function() {
        const titles = {
            'roadCondition': 'Состояние дороги',
            'precipitationLayer': 'Осадки на дороге',
            'technical': 'Технические параметры',
            'calibration': 'Калибровка и статус',
            'position': 'Позиционирование'
        };
        $('#dspdChartTitle').text(`DSPD: ${titles[this.currentTab] || 'Параметры'}`);
    },

    startAutoUpdate: function() {
        this.stopAutoUpdate();
        if (!this.autoUpdateEnabled) return;

        let sec = 30;
        $('#dspdCountdownTimer').text(sec).show();

        this.countdownInterval = setInterval(() => {
            sec = sec <= 0 ? 30 : sec - 1;
            $('#dspdCountdownTimer').text(sec);
        }, 1000);

        this.autoUpdateTimerId = setInterval(() => {
            if (this.autoUpdateEnabled) this.loadData(this.currentDays, true);
        }, 30000);
    },

    stopAutoUpdate: function() {
        clearInterval(this.autoUpdateTimerId);
        clearInterval(this.countdownInterval);
        this.autoUpdateTimerId = this.countdownInterval = null;
    },

    restartAutoUpdate: function() {
        if (this.autoUpdateEnabled) this.startAutoUpdate();
    },

    cleanup: function() {
        this.stopAutoUpdate();
        this.autoUpdateEnabled = true;
        $('#dspdAutoUpdateToggle').prop('checked', true);
        $('#dspdCountdownTimer').show().text('30');

        if (this.chart) this.chart.destroy();
        if (this.dateSlider) try { this.dateSlider.destroy(); } catch(e) {}
        this.chart = this.dateSlider = null;
        this.sliderInitialized = false;
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

                if (silent && hasNew && this.autoUpdateEnabled) {
                    this.showNotification('Получены новые данные DSPD');
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

    initDateRangeSlider: function() {
        if (typeof noUiSlider === 'undefined') {
            console.error('noUiSlider не загружен');
            return;
        }

        if (!this.allMeasurements || this.allMeasurements.length < 2) {
            $('#dspdDateRangeSection').addClass('disabled');
            $('#dspdSliderContainer').addClass('disabled');
            return;
        }

        const ts = this.allMeasurements.map(m => new Date(m.dataTimestamp).getTime());
        this.minDate = Math.min(...ts);
        this.maxDate = Math.max(...ts);

        if (isNaN(this.minDate) || isNaN(this.maxDate) || this.minDate >= this.maxDate) return;

        const fmt = ts => moment(ts).format('DD.MM.YYYY HH:mm');

        $('#dspdMinDateLabel').text(fmt(this.minDate));
        $('#dspdMaxDateLabel').text(fmt(this.maxDate));
        $('#dspdDateRangeLabel').text(`${fmt(this.minDate)} - ${fmt(this.maxDate)}`);

        const sliderEl = document.getElementById('dspdDateRangeSlider');
        if (!sliderEl) return;

        $('#dspdDateRangeSection').removeClass('disabled');
        $('#dspdSliderContainer').removeClass('disabled');

        if (this.dateSlider) try { this.dateSlider.destroy(); } catch(e) {}
        this.dateSlider = null;
        sliderEl.innerHTML = '';

        setTimeout(() => {
            try {
                this.dateSlider = noUiSlider.create(sliderEl, {
                    start: [this.minDate, this.maxDate],
                    connect: true,
                    range: { min: this.minDate, max: this.maxDate },
                    step: 3600000,
                    format: { to: v => Math.round(v), from: v => Math.round(v) },
                    behaviour: 'tap-drag',
                    animate: true,
                    animationDuration: 300
                });

                this.dateSlider.on('update', values => {
                    const s = moment(parseInt(values[0])).format('DD.MM.YYYY HH:mm');
                    const e = moment(parseInt(values[1])).format('DD.MM.YYYY HH:mm');
                    $('#dspdDateRangeLabel').text(`${s} - ${e}`);
                });

                this.dateSlider.on('end', values => {
                    this.filterDataByDateRange(parseInt(values[0]), parseInt(values[1]));
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
                console.error('Ошибка слайдера DSPD:', e);
            }
        }, 50);
    },

    filterDataByDateRange: function(start, end) {
        const filtered = this.allMeasurements.filter(m => {
            const t = new Date(m.dataTimestamp).getTime();
            return t >= start && t <= end;
        });

        const orig = this.allMeasurements;
        this.allMeasurements = filtered;
        this.renderChart();
        this.updateStatistics();
        this.allMeasurements = orig;
    },

    renderChart: function() {
        if (!this.allMeasurements?.length) return;

        const m = this.allMeasurements;
        const ts = m.map(x => new Date(x.dataTimestamp));

        const range = this.getTimeRange(ts);
        this.updateTimeScaleLabel(range);
        const cfg = this.getTimeConfig(range);

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

        selected.forEach((p, i) => {
            // Фильтруем null значения
            const validData = m
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
                backgroundColor: this.hexToRgba(p.color, 0.1),
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
            data: { labels: ts, datasets },
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
            container.html('<div class="col-12 text-center text-muted">Нет выбранных параметров</div>');
            return;
        }

        selected.forEach(p => {
            const vals = this.allMeasurements
                .map(m => {
                    const v = m[p.property];
                    return v != null ? parseFloat(v) : null;
                })
                .filter(v => v != null);

            if (!vals.length) return;

            const min = Math.min(...vals);
            const max = Math.max(...vals);
            const avg = vals.reduce((a,b) => a + b, 0) / vals.length;
            const cur = vals[vals.length-1];

            const col = $(`
                <div class="col-md-3 col-sm-6 mb-2">
                    <div class="p-2 border rounded" style="border-left: 4px solid ${p.color} !important;">
                        <div class="small text-muted">
                            <i class="fas ${p.icon || 'fa-chart-line'} me-1"></i> ${p.name}
                        </div>
                        <div class="d-flex justify-content-between mt-1">
                            <span class="small">тек. <strong>${cur.toFixed(2)}</strong></span>
                            <span class="small">мин <strong>${min.toFixed(2)}</strong></span>
                            <span class="small">ср. <strong>${avg.toFixed(2)}</strong></span>
                            <span class="small">макс <strong>${max.toFixed(2)}</strong></span>
                        </div>
                    </div>
                </div>
            `);
            container.append(col);
        });
    },

    updateLastUpdateTime: function(data) {
        const m = data.measurements || [];
        if (!m.length) {
            $('#dspdLastUpdateTime').text('Нет данных');
            return;
        }
        const last = m[m.length-1].dataTimestamp;
        $('#dspdLastUpdateTime').text(moment(last).format('DD.MM.YYYY HH:mm:ss'));
        this.lastUpdateTime = last;
    },

    showNotification: function(msg) {
        const n = $(`
            <div class="alert alert-success alert-dismissible fade show position-fixed top-0 end-0 m-3" style="z-index:9999;" role="alert">
                <i class="fas fa-info-circle"></i> ${msg}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `);
        $('body').append(n);
        setTimeout(() => n.alert('close'), 3000);
    },

    hexToRgba: function(hex, a) {
        const r = parseInt(hex.slice(1,3),16);
        const g = parseInt(hex.slice(3,5),16);
        const b = parseInt(hex.slice(5,7),16);
        return `rgba(${r},${g},${b},${a})`;
    },

    getTimeRange: function(ts) {
        if (ts.length < 2) return 'day';
        const diff = (Math.max(...ts.map(d=>d.getTime())) - Math.min(...ts.map(d=>d.getTime()))) / 3600000;
        if (diff <= 24) return 'hour';
        if (diff <= 72) return 'hour6';
        if (diff <= 168) return 'day';
        if (diff <= 720) return 'week';
        return 'month';
    },

    getTimeConfig: function(r) {
        const c = {
            hour:   { unit: 'hour',   displayFormats: { hour:   'HH:mm' } },
            hour6:  { unit: 'hour',   displayFormats: { hour:   'HH:mm' } },
            day:    { unit: 'day',    displayFormats: { day:    'dd.MM' } },
            week:   { unit: 'week',   displayFormats: { week:   'dd.MM' } },
            month:  { unit: 'month',  displayFormats: { month:  'MMM YYYY' } }
        };
        return c[r] || c.day;
    },

    updateTimeScaleLabel: function(r) {
        const l = { hour: 'часы', hour6: '6 часов', day: 'дни', week: 'недели', month: 'месяцы' };
        $('#dspdTimeScaleLabel').text(l[r] || 'авто');
    }
};

$(document).ready(function() {
    console.log('✅ DSPD Charts загружен');
    $(document).on('sensorChanged', () => {
        if (typeof DSPDCharts !== 'undefined') DSPDCharts.cleanup();
    });
});