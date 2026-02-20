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

    // Параметры для отображения
    availableParameters: [
        { id: 'grip', name: 'Коэф. сцепления', unit: '', color: '#28a745', property: 'gripCoefficient', visible: true, order: 1 },
        { id: 'shake', name: 'Вибрация', unit: '', color: '#fd7e14', property: 'shakeLevel', visible: false, order: 2 },
        { id: 'voltage', name: 'Напряжение', unit: 'В', color: '#6f42c1', property: 'voltagePower', visible: false, order: 3 },
        { id: 'caseTemp', name: 'Темп. корпуса', unit: '°C', color: '#20c997', property: 'caseTemperature', visible: false, order: 4 },
        { id: 'roadTemp', name: 'Темп. дороги', unit: '°C', color: '#dc3545', property: 'roadTemperature', visible: true, order: 5 },
        { id: 'water', name: 'Вода', unit: 'мм', color: '#0d6efd', property: 'waterHeight', visible: false, order: 6 },
        { id: 'ice', name: 'Лед', unit: 'мм', color: '#17a2b8', property: 'iceHeight', visible: false, order: 7 },
        { id: 'snow', name: 'Снег', unit: 'мм', color: '#6c757d', property: 'snowHeight', visible: false, order: 8 },
        { id: 'icePct', name: '% льда', unit: '%', color: '#6610f2', property: 'icePercentage', visible: false, order: 9 },
        { id: 'pgmPct', name: '% ПГМ', unit: '%', color: '#e83e8c', property: 'pgmPercentage', visible: false, order: 10 },
        { id: 'roadAngle', name: 'Уклон', unit: '°', color: '#ffc107', property: 'roadAngle', visible: false, order: 11 },
        { id: 'freezeTemp', name: 'Заморозки', unit: '°C', color: '#343a40', property: 'freezeTemperature', visible: false, order: 12 },
        { id: 'distance', name: 'Дистанция', unit: 'мм', color: '#7952b3', property: 'distanceToSurface', visible: false, order: 13 }
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
        this.loadData(1); // по умолчанию 24ч после рефакторинга

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

        // Чекбоксы параметров
        $(document).on('change', '.dspd-parameter-checkbox', () => {
            this.updateVisibleParameters();
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
        const container = $('#dspdParameterCheckboxes');
        if (!container.length) return;

        container.empty();

        const sorted = [...this.availableParameters].sort((a,b) => a.order - b.order);

        sorted.forEach(param => {
            const col = $(`
                <div class="col-md-3 col-sm-6 mb-2">
                    <div class="form-check">
                        <input class="form-check-input dspd-parameter-checkbox"
                               type="checkbox"
                               id="param_${param.id}"
                               data-param-id="${param.id}"
                               data-property="${param.property}"
                               ${param.visible ? 'checked' : ''}>
                        <label class="form-check-label small" for="param_${param.id}">
                            <span style="display:inline-block; width:12px; height:12px; background-color:${param.color}; border-radius:2px; margin-right:4px;"></span>
                            ${param.name} ${param.unit ? `(${param.unit})` : ''}
                        </label>
                    </div>
                </div>
            `);
            container.append(col);
        });

        const controls = $(`
            <div class="col-12 mt-2">
                <hr class="my-2">
                <div class="d-flex gap-2">
                    <button type="button" class="btn btn-sm btn-outline-success" id="dspdSelectAllParams">Выбрать все</button>
                    <button type="button" class="btn btn-sm btn-outline-secondary" id="dspdClearAllParams">Сбросить</button>
                    <span class="ms-auto text-muted small" id="dspdSelectedParamsCount">Выбрано: 2/4</span>
                </div>
            </div>
        `);
        container.append(controls);

        $('#dspdSelectAllParams').off('click').on('click', () => {
            $('.dspd-parameter-checkbox').prop('checked', true);
            this.limitSelectedParameters();
            this.updateVisibleParameters();
            this.renderChart();
            this.updateStatistics();
        });

        $('#dspdClearAllParams').off('click').on('click', () => {
            $('.dspd-parameter-checkbox').prop('checked', false);
            $('#param_grip, #param_roadTemp').prop('checked', true);
            this.updateVisibleParameters();
            this.renderChart();
            this.updateStatistics();
        });

        $(document).on('change', '.dspd-parameter-checkbox', () => this.limitSelectedParameters());
        this.limitSelectedParameters();
    },

    limitSelectedParameters: function() {
        const checked = $('.dspd-parameter-checkbox:checked');
        const count = checked.length;
        $('#dspdSelectedParamsCount').text(`Выбрано: ${count}/4`);

        if (count >= 4) {
            $('.dspd-parameter-checkbox:not(:checked)').prop('disabled', true);
        } else {
            $('.dspd-parameter-checkbox').prop('disabled', false);
        }
    },

    updateVisibleParameters: function() {
        this.availableParameters.forEach(p => {
            p.visible = $(`#param_${p.id}`).is(':checked');
        });
    },

    getSelectedParameters: function() {
        return this.availableParameters.filter(p => p.visible);
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
        if (!selected.length) return;

        const datasets = [];

        selected.forEach((p, i) => {
            const data = m.map(x => {
                const v = x[p.property];
                return v != null ? parseFloat(v) : null;
            });

            const ds = {
                label: p.name + (p.unit ? ` (${p.unit})` : ''),
                data: data,
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
            const avg = vals.reduce((a,b)=>a+b,0) / vals.length;
            const cur = vals[vals.length-1];

            const col = $(`
                <div class="col-md-3 col-sm-6 mb-2">
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