// dust-charts.js - Модуль для визуализации данных датчика концентрации пыли

const DUSTCharts = {
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
    currentTab: 'pm',
    autoUpdateInstance: null, // ссылка на экземпляр AutoUpdateManager

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
        // Проверяем, что AutoUpdateManager загружен
        if (typeof AutoUpdateManager === 'undefined') {
            console.error('AutoUpdateManager не загружен!');
            return;
        }

        // Убеждаемся, что чекбокс существует
        const toggleElement = document.getElementById('dustAutoUpdateToggle');
        if (!toggleElement) {
            console.error('Элемент dustAutoUpdateToggle не найден!');
            return;
        }

        // Создаем экземпляр автообновления
        this.autoUpdateInstance = AutoUpdateManager.create('dust', {
            interval: 30000,
            onUpdate: () => {
                if (this.currentSensorId) {
                    console.log('DUST: автообновление...');
                    this.loadData(this.currentDays, true);
                }
            },
            onStart: () => {
                console.log('DUST: автообновление запущено');
            },
            onStop: () => {
                console.log('DUST: автообновление остановлено');
            }
        });

        console.log('DUST: автообновление инициализировано');
    },

    createParameterRadios: function() {
        // Создаем радио-кнопки для каждой группы
        this.createRadioGroup('Pm', this.pmParameters);
        this.createRadioGroup('Technical', this.technicalParameters);
    },

    createRadioGroup: function(groupName, parameters) {
        const container = $(`#dust${groupName}Radios`);
        if (!container.length) return;

        container.empty();
        
        // Сортируем и добавляем параметры
        parameters.sort((a, b) => a.order - b.order).forEach(p => {
            container.append(this.createRadio(p, groupName.toLowerCase()));
        });
    },

    createRadio: function(param, group) {
        const radioName = `dust_${group}_param`;
        
        return $(`
            <div class="col-md-4 col-sm-6 mb-2">
                <div class="form-check">
                    <input class="form-check-input dust-parameter-radio"
                           type="radio"
                           name="${radioName}"
                           id="dust_radio_${param.id}"
                           value="${param.id}"
                           data-param-id="${param.id}"
                           data-group="${group}"
                           data-property="${param.property}"
                           ${param.visible ? 'checked' : ''}>
                    <label class="form-check-label small" for="dust_radio_${param.id}" title="${param.description || ''}">
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
        const updateGroup = (groupParams) => {
            groupParams.forEach(p => {
                const radioId = `dust_radio_${p.id}`;
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
        
        // Возвращаем только выбранный параметр (должен быть один)
        return groups[this.currentTab]?.filter(p => p.visible) || [];
    },

    updateChartTitle: function() {
        $('#dustChartTitle').text(this.currentTab === 'pm'
            ? 'Концентрация частиц PM (мг/м³)'
            : 'Технические параметры DUST');
    },

    cleanup: function() {
        console.log('DUSTCharts.cleanup()');
        
        // Уничтожаем экземпляр автообновления
        if (this.autoUpdateInstance) {
            AutoUpdateManager.destroy('dust');
            this.autoUpdateInstance = null;
        }

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
                    this.showNotification('Получены новые данные DUST');
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

    initDateRangeSlider: function() {
        if (typeof noUiSlider === 'undefined') {
            console.error('noUiSlider не загружен');
            return;
        }

        if (!this.allMeasurements || this.allMeasurements.length < 2) {
            $('#dustDateRangeSection').addClass('disabled');
            $('#dustSliderContainer').addClass('disabled');
            return;
        }

        const ts = this.allMeasurements.map(m => new Date(m.dataTimestamp).getTime());
        this.minDate = Math.min(...ts);
        this.maxDate = Math.max(...ts);

        if (isNaN(this.minDate) || isNaN(this.maxDate) || this.minDate >= this.maxDate) return;

        const fmt = t => moment(t).format('DD.MM.YYYY HH:mm');

        $('#dustMinDateLabel').text(fmt(this.minDate));
        $('#dustMaxDateLabel').text(fmt(this.maxDate));
        $('#dustDateRangeLabel').text(`${fmt(this.minDate)} - ${fmt(this.maxDate)}`);

        const slider = document.getElementById('dustDateRangeSlider');
        if (!slider) return;

        $('#dustDateRangeSection').removeClass('disabled');
        $('#dustSliderContainer').removeClass('disabled');

        if (this.dateSlider) try { this.dateSlider.destroy(); } catch(e) {}
        this.dateSlider = null;
        slider.innerHTML = '';

        setTimeout(() => {
            try {
                this.dateSlider = noUiSlider.create(slider, {
                    start: [this.minDate, this.maxDate],
                    connect: true,
                    range: { min: this.minDate, max: this.maxDate },
                    step: 3600000,
                    format: { to: v => Math.round(v), from: v => Math.round(v) },
                    behaviour: 'tap-drag',
                    animate: true,
                    animationDuration: 300
                });

                this.dateSlider.on('update', v => {
                    const s = moment(parseInt(v[0])).format('DD.MM.YYYY HH:mm');
                    const e = moment(parseInt(v[1])).format('DD.MM.YYYY HH:mm');
                    $('#dustDateRangeLabel').text(`${s} - ${e}`);
                });

                this.dateSlider.on('start', () => {
                    // Генерируем событие для AutoUpdateManager
                    $(document).trigger('sliderDragStart');
                });

                this.dateSlider.on('end', v => {
                    this.filterDataByDateRange(parseInt(v[0]), parseInt(v[1]));
                    // Генерируем событие для AutoUpdateManager
                    $(document).trigger('sliderDragEnd');
                });

                this.sliderInitialized = true;
            } catch(e) {
                console.error('Ошибка слайдера DUST:', e);
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
        const container = $('#dustStatisticsContainer');
        if (!container.length) return;
        container.empty();

        const selected = this.getSelectedParameters();
        if (!selected.length) {
            container.html('<div class="col-12 text-center text-muted">Нет выбранного параметра</div>');
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
                <div class="col-md-12">
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
            $('#dustLastUpdateTime').text('Нет данных');
            return;
        }
        const last = m[m.length-1].dataTimestamp;
        $('#dustLastUpdateTime').text(moment(last).format('DD.MM.YYYY HH:mm:ss'));
        
        if (this.autoUpdateInstance) {
            this.autoUpdateInstance.updateLastUpdateTime(last);
        }
    },

    showNotification: function(msg) {
        const n = $(`
            <div class="alert alert-warning alert-dismissible fade show position-fixed top-0 end-0 m-3" style="z-index:9999;" role="alert">
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
            month:  { unit: 'month',  displayFormats: { month:  'MMM yyyy' } }
        };
        return c[r] || c.day;
    },

    updateTimeScaleLabel: function(r) {
        const l = { hour: 'часы', hour6: '6 часов', day: 'дни', week: 'недели', month: 'месяцы' };
        $('#dustTimeScaleLabel').text(l[r] || 'авто');
    }
};

$(document).ready(function() {
    console.log('✅ DUST Charts загружен');
    $(document).on('sensorChanged', () => {
        if (typeof DUSTCharts !== 'undefined') DUSTCharts.cleanup();
    });
});