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

    pmParameters: [
        { id: 'pm10act', name: 'PM10 акт.', unit: 'мг/м³', color: '#dc3545', property: 'pm10Act', visible: true, order: 1, group: 'pm' },
        { id: 'pm25act', name: 'PM2.5 акт.', unit: 'мг/м³', color: '#fd7e14', property: 'pm25Act', visible: true, order: 2, group: 'pm' },
        { id: 'pm1act',  name: 'PM1 акт.',  unit: 'мг/м³', color: '#ffc107', property: 'pm1Act',  visible: true, order: 3, group: 'pm' },
        { id: 'pm10awg', name: 'PM10 ср.',  unit: 'мг/м³', color: '#20c997', property: 'pm10Awg', visible: false, order: 4, group: 'pm' },
        { id: 'pm25awg', name: 'PM2.5 ср.', unit: 'мг/м³', color: '#0d6efd', property: 'pm25Awg', visible: false, order: 5, group: 'pm' },
        { id: 'pm1awg',  name: 'PM1 ср.',  unit: 'мг/м³', color: '#6610f2', property: 'pm1Awg', visible: false, order: 6, group: 'pm' }
    ],

    technicalParameters: [
        { id: 'flow',     name: 'Поток пробы',   unit: '',     color: '#17a2b8', property: 'flowProbe',      visible: true, order: 1, group: 'technical' },
        { id: 'temp',     name: 'Температура',   unit: '°C',   color: '#dc3545', property: 'temperatureProbe',visible: true, order: 2, group: 'technical' },
        { id: 'humidity', name: 'Влажность',     unit: '%',    color: '#0d6efd', property: 'humidityProbe',   visible: true, order: 3, group: 'technical' },
        { id: 'laser',    name: 'Статус лазера', unit: '',     color: '#6c757d', property: 'laserStatus',     visible: false,order: 4, group: 'technical' },
        { id: 'voltage',  name: 'Напряжение',    unit: 'В',    color: '#28a745', property: 'supplyVoltage',   visible: true, order: 5, group: 'technical' }
    ],

    autoUpdateEnabled: true,
    autoUpdateInterval: 30000,
    autoUpdateTimerId: null,
    countdownInterval: null,
    lastUpdateTime: null,
    tempAutoUpdateState: null,

    init: function(sensorId) {
        console.log('DUSTCharts.init()', sensorId);
        this.currentSensorId = sensorId;
        moment.locale('ru');

        this.createParameterCheckboxes();
        this.loadData(1);

        $('#dustTimeRangeButtons .btn').off('click').on('click', (e) => {
            const btn = $(e.currentTarget);
            if (btn.hasClass('active')) return;
            $('#dustTimeRangeButtons .btn').removeClass('active');
            btn.addClass('active');
            const days = btn.data('days');
            this.currentDays = days;
            if (this.autoUpdateEnabled) this.restartAutoUpdate();
            this.loadData(days);
        });

        $('#dustChartTypeSelect').off('change').on('change', (e) => {
            this.currentChartType = $(e.currentTarget).val();
            this.renderChart();
        });

        $('#dustTabs button').off('shown.bs.tab').on('shown.bs.tab', (e) => {
            this.currentTab = $(e.target).attr('id') === 'pm-tab' ? 'pm' : 'technical';
            this.updateChartTitle();
            this.renderChart();
            this.updateStatistics();
        });

        $(document).on('change', '.dust-parameter-checkbox', () => {
            this.updateVisibleParameters();
            this.renderChart();
            this.updateStatistics();
        });

        $('#dustAutoUpdateToggle').off('change').on('change', (e) => {
            const checked = $(e.currentTarget).is(':checked');
            if (checked) {
                this.autoUpdateEnabled = true;
                this.startAutoUpdate();
                $('#dustCountdownTimer').show();
            } else {
                this.autoUpdateEnabled = false;
                this.stopAutoUpdate();
                $('#dustCountdownTimer').hide();
            }
        });

        // Кнопки "все / сброс" для вкладок
        $(document).on('click', '#dustSelectAllPm', () => {
            $('#dustPmCheckboxes .dust-parameter-checkbox').prop('checked', true);
            this.updateVisibleParameters();
            this.renderChart();
            this.updateStatistics();
        });

        $(document).on('click', '#dustClearAllPm', () => {
            $('#dustPmCheckboxes .dust-parameter-checkbox').prop('checked', false);
            $('#dust_param_pm10act, #dust_param_pm25act, #dust_param_pm1act').prop('checked', true);
            this.updateVisibleParameters();
            this.renderChart();
            this.updateStatistics();
        });

        $(document).on('click', '#dustSelectAllTechnical', () => {
            $('#dustTechnicalCheckboxes .dust-parameter-checkbox').prop('checked', true);
            this.updateVisibleParameters();
            this.renderChart();
            this.updateStatistics();
        });

        $(document).on('click', '#dustClearAllTechnical', () => {
            $('#dustTechnicalCheckboxes .dust-parameter-checkbox').prop('checked', false);
            $('#dust_param_flow, #dust_param_temp, #dust_param_humidity, #dust_param_voltage').prop('checked', true);
            this.updateVisibleParameters();
            this.renderChart();
            this.updateStatistics();
        });

        this.startAutoUpdate();
    },

    createParameterCheckboxes: function() {
        const pm = $('#dustPmCheckboxes');
        if (pm.length) {
            pm.empty();
            this.pmParameters.sort((a,b)=>a.order-b.order).forEach(p => pm.append(this.createCheckbox(p, 'pm')));
            pm.append(this.createControlButtons('pm'));
        }

        const tech = $('#dustTechnicalCheckboxes');
        if (tech.length) {
            tech.empty();
            this.technicalParameters.sort((a,b)=>a.order-b.order).forEach(p => tech.append(this.createCheckbox(p, 'technical')));
            tech.append(this.createControlButtons('technical'));
        }
    },

    createCheckbox: function(param, group) {
        return $(`
            <div class="col-md-4 col-sm-6 mb-2">
                <div class="form-check">
                    <input class="form-check-input dust-parameter-checkbox"
                           type="checkbox"
                           id="dust_param_${param.id}"
                           data-param-id="${param.id}"
                           data-group="${group}"
                           data-property="${param.property}"
                           ${param.visible ? 'checked' : ''}>
                    <label class="form-check-label small" for="dust_param_${param.id}">
                        <span style="display:inline-block;width:12px;height:12px;background-color:${param.color};border-radius:2px;margin-right:4px;"></span>
                        ${param.name} ${param.unit ? `(${param.unit})` : ''}
                    </label>
                </div>
            </div>
        `);
    },

    createControlButtons: function(group) {
        const cap = group.charAt(0).toUpperCase() + group.slice(1);
        return $(`
            <div class="col-12 mt-2">
                <hr class="my-2">
                <div class="d-flex gap-2">
                    <button type="button" class="btn btn-sm btn-outline-warning" id="dustSelectAll${cap}">Выбрать все</button>
                    <button type="button" class="btn btn-sm btn-outline-secondary" id="dustClearAll${cap}">Сбросить</button>
                </div>
            </div>
        `);
    },

    updateVisibleParameters: function() {
        this.pmParameters.forEach(p => p.visible = $(`#dust_param_${p.id}`).is(':checked'));
        this.technicalParameters.forEach(p => p.visible = $(`#dust_param_${p.id}`).is(':checked'));
    },

    getSelectedParameters: function() {
        return this.currentTab === 'pm'
            ? this.pmParameters.filter(p => p.visible)
            : this.technicalParameters.filter(p => p.visible);
    },

    updateChartTitle: function() {
        $('#dustChartTitle').text(this.currentTab === 'pm'
            ? 'Концентрация частиц PM (мг/м³)'
            : 'Технические параметры DUST');
    },

    startAutoUpdate: function() {
        this.stopAutoUpdate();
        if (!this.autoUpdateEnabled) return;

        let sec = 30;
        $('#dustCountdownTimer').text(sec).show();

        this.countdownInterval = setInterval(() => {
            sec = sec <= 0 ? 30 : sec - 1;
            $('#dustCountdownTimer').text(sec);
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
        $('#dustAutoUpdateToggle').prop('checked', true);
        $('#dustCountdownTimer').show().text('30');

        if (this.chart) this.chart.destroy();
        if (this.dateSlider) try { this.dateSlider.destroy(); } catch(e) {}
        this.chart = this.dateSlider = null;
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

                if (silent && hasNew && this.autoUpdateEnabled) {
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
        if (typeof noUiSlider === 'undefined') return console.error('noUiSlider не загружен');

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

                this.dateSlider.on('end', v => this.filterDataByDateRange(parseInt(v[0]), parseInt(v[1])));

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
        if (!selected.length) return;

        const datasets = [];

        selected.forEach((p, i) => {
            const ds = {
                label: p.name + (p.unit ? ` (${p.unit})` : ''),
                data: m.map(x => {
                    const v = x[p.property];
                    return v != null ? parseFloat(v) : null;
                }),
                borderColor: p.color,
                backgroundColor: this.hexToRgba(p.color, 0.1),
                borderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 6,
                tension: 0.3,
                fill: false,
                yAxisID: `y${i === 0 ? '' : i + 1}`
            };

            if (this.currentChartType === 'scatter') {
                ds.type = 'scatter';
                ds.data = m.map(x => {
                    const v = x[p.property];
                    return v != null ? { x: new Date(x.dataTimestamp), y: parseFloat(v) } : null;
                }).filter(Boolean);
                ds.backgroundColor = p.color;
                ds.borderColor = 'transparent';
                ds.pointRadius = 5;
            }

            if (this.currentChartType === 'bar') {
                ds.type = 'bar';
                ds.barPercentage = 0.8;
                ds.categoryPercentage = 0.9;
            }

            datasets.push(ds);
        });

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
                    legend: { display: true, position: 'top', labels: { usePointStyle: true, boxWidth: 8 } },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: { label: ctx => `${ctx.dataset.label || ''}: ${ctx.parsed.y?.toFixed(2) ?? ''}` }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: { unit: cfg.unit, displayFormats: cfg.displayFormats, tooltipFormat: 'dd.MM.yyyy HH:mm' },
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
            const avg = vals.reduce((a,b)=>a+b,0) / vals.length;
            const cur = vals[vals.length-1];

            const col = $(`
                <div class="col-md-4 col-sm-6 mb-2">
                    <div class="p-2 border rounded" style="border-left: 4px solid ${p.color} !important;">
                        <div class="small text-muted">${p.name}</div>
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
        this.lastUpdateTime = last;
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