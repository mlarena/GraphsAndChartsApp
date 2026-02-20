const MUEKSCharts = {
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
    currentTab: 'voltage',

    voltageParameters: [
        { id: 'voltageIn12b', name: 'Напряжение вх. 12В', unit: 'В', color: '#dc3545', property: 'voltagePowerIn12b', visible: true, order: 1, group: 'voltage', icon: 'fa-bolt' },
        { id: 'voltageOut12b',name: 'Напряжение вых. 12В',unit: 'В', color: '#fd7e14', property: 'voltageOut12b',     visible: true, order: 2, group: 'voltage', icon: 'fa-bolt' },
        { id: 'voltageAkb',   name: 'Напряжение АКБ',     unit: 'В', color: '#ffc107', property: 'voltageAkb',        visible: true, order: 3, group: 'voltage', icon: 'fa-battery-half' }
    ],

    currentParameters: [
        { id: 'currentOut12b',name: 'Ток вых. 12В', unit: 'А', color: '#0d6efd', property: 'currentOut12b', visible: true, order: 1, group: 'current', icon: 'fa-wave-square' },
        { id: 'currentOut48b',name: 'Ток вых. 48В', unit: 'А', color: '#17a2b8', property: 'currentOut48b', visible: true, order: 2, group: 'current', icon: 'fa-wave-square' },
        { id: 'currentAkb',   name: 'Ток АКБ',      unit: 'А', color: '#20c997', property: 'currentAkb',    visible: true, order: 3, group: 'current', icon: 'fa-battery-half' }
    ],

    energyParameters: [
        { id: 'wattHours',    name: 'Ватт-часы АКБ', unit: 'Вт·ч', color: '#6f42c1', property: 'wattHoursAkb', visible: true,  order: 1, group: 'energy', icon: 'fa-bolt' },
        { id: 'visibleRange', name: 'Видимый диапазон',unit: '',   color: '#e83e8c', property: 'visibleRange',visible: false, order: 2, group: 'energy', icon: 'fa-eye' }
    ],

    statusParameters: [
        { id: 'temperature', name: 'Температура',   unit: '°C', color: '#28a745', property: 'temperatureBox', visible: true,  order: 1, group: 'status', icon: 'fa-thermometer-half' },
        { id: 'sensor220b',  name: 'Датчик 220В',   unit: '',   color: '#dc3545', property: 'sensor220b',     visible: true,  order: 2, group: 'status', icon: 'fa-plug' },
        { id: 'doorStatus',  name: 'Статус двери',  unit: '',   color: '#ffc107', property: 'doorStatus',      visible: true,  order: 3, group: 'status', icon: 'fa-door-open' }
    ],

    tdsParameters: [
        { id: 'tdsH',     name: 'TDS H',     unit: '', color: '#6c757d', property: 'tdsH',     visible: true, order: 1, group: 'tds', icon: 'fa-microchip', isText: true },
        { id: 'tdsTds',   name: 'TDS TDS',   unit: '', color: '#17a2b8', property: 'tdsTds',   visible: true, order: 2, group: 'tds', icon: 'fa-microchip', isText: true },
        { id: 'tkosaT1',  name: 'TKOСА T1',  unit: '', color: '#6610f2', property: 'tkosaT1',  visible: true, order: 3, group: 'tds', icon: 'fa-microchip', isText: true },
        { id: 'tkosaT3',  name: 'TKOСА T3',  unit: '', color: '#e83e8c', property: 'tkosaT3',  visible: true, order: 4, group: 'tds', icon: 'fa-microchip', isText: true }
    ],

    autoUpdateEnabled: true,
    autoUpdateInterval: 30000,
    autoUpdateTimerId: null,
    countdownInterval: null,
    lastUpdateTime: null,
    tempAutoUpdateState: null,

    init: function(sensorId) {
        console.log('MUEKSCharts.init()', sensorId);
        this.currentSensorId = sensorId;
        moment.locale('ru');

        this.createAllCheckboxes();
        this.loadData(1);

        $('#mueksTimeRangeButtons .btn').off('click').on('click', (e) => {
            const btn = $(e.currentTarget);
            if (btn.hasClass('active')) return;
            $('#mueksTimeRangeButtons .btn').removeClass('active');
            btn.addClass('active');
            const days = btn.data('days');
            this.currentDays = days;
            if (this.autoUpdateEnabled) this.restartAutoUpdate();
            this.loadData(days);
        });

        $('#mueksChartTypeSelect').off('change').on('change', (e) => {
            this.currentChartType = $(e.currentTarget).val();
            if (this.currentTab !== 'tds') this.renderChart();
        });

        $('#mueksTabs button').off('shown.bs.tab').on('shown.bs.tab', (e) => {
            const tabId = $(e.target).attr('id');
            this.currentTab = tabId.replace('-tab', '');
            this.updateChartTitle();

            if (this.currentTab === 'tds') {
                $('#mueksChartsContainer').hide();
                this.renderTdsTable();
            } else {
                $('#mueksChartsContainer').show();
                this.renderChart();
                this.updateStatistics();
            }
        });

        $(document).on('change', '.mueks-parameter-checkbox', () => {
            this.updateVisibleParameters();
            if (this.currentTab !== 'tds') {
                this.renderChart();
                this.updateStatistics();
            }
        });

        $('#mueksAutoUpdateToggle').off('change').on('change', (e) => {
            const checked = $(e.currentTarget).is(':checked');
            if (checked) {
                this.autoUpdateEnabled = true;
                this.startAutoUpdate();
                $('#mueksCountdownTimer').show();
            } else {
                this.autoUpdateEnabled = false;
                this.stopAutoUpdate();
                $('#mueksCountdownTimer').hide();
            }
        });

        this.addGroupSelectionHandlers();
        this.startAutoUpdate();
    },

    createAllCheckboxes: function() {
        this.createCheckboxesForGroup('voltage',  this.voltageParameters,  '#mueksVoltageCheckboxes');
        this.createCheckboxesForGroup('current',  this.currentParameters,  '#mueksCurrentCheckboxes');
        this.createCheckboxesForGroup('energy',   this.energyParameters,   '#mueksEnergyCheckboxes');
        this.createCheckboxesForGroup('status',   this.statusParameters,   '#mueksStatusCheckboxes');
        // TDS — без чекбоксов
    },

    createCheckboxesForGroup: function(groupName, params, containerSelector) {
        const container = $(containerSelector);
        if (!container.length) return;

        container.empty();

        params.sort((a,b)=>a.order-b.order).forEach(p => {
            container.append(this.createCheckboxColumn(p, groupName));
        });

        container.append(this.createControlButtons(groupName));
    },

    createCheckboxColumn: function(param, group) {
        return $(`
            <div class="col-md-4 col-sm-6 mb-2">
                <div class="form-check">
                    <input class="form-check-input mueks-parameter-checkbox"
                           type="checkbox"
                           id="mueks_param_${param.id}"
                           data-param-id="${param.id}"
                           data-group="${group}"
                           data-property="${param.property}"
                           ${param.visible ? 'checked' : ''}>
                    <label class="form-check-label small" for="mueks_param_${param.id}">
                        <span style="display:inline-block;width:12px;height:12px;background-color:${param.color};border-radius:2px;margin-right:4px;"></span>
                        <i class="fas ${param.icon} fa-xs text-muted me-1"></i>
                        ${param.name} ${param.unit ? `(${param.unit})` : ''}
                    </label>
                </div>
            </div>
        `);
    },

    createControlButtons: function(group) {
        return $(`
            <div class="col-12 mt-2">
                <hr class="my-2">
                <div class="d-flex gap-2">
                    <button type="button" class="btn btn-sm btn-outline-danger mueks-select-all" data-group="${group}">Выбрать все</button>
                    <button type="button" class="btn btn-sm btn-outline-secondary mueks-clear-all" data-group="${group}">Сбросить</button>
                </div>
            </div>
        `);
    },

    addGroupSelectionHandlers: function() {
        $(document).off('click', '.mueks-select-all').on('click', '.mueks-select-all', (e) => {
            const g = $(e.currentTarget).data('group');
            const sel = `#mueks${g.charAt(0).toUpperCase()+g.slice(1)}Checkboxes .mueks-parameter-checkbox`;
            $(sel).prop('checked', true);
            this.updateVisibleParameters();
            if (this.currentTab !== 'tds') {
                this.renderChart();
                this.updateStatistics();
            }
        });

        $(document).off('click', '.mueks-clear-all').on('click', '.mueks-clear-all', (e) => {
            const g = $(e.currentTarget).data('group');
            const sel = `#mueks${g.charAt(0).toUpperCase()+g.slice(1)}Checkboxes .mueks-parameter-checkbox`;
            $(sel).prop('checked', false);
            this.updateVisibleParameters();
            if (this.currentTab !== 'tds') {
                this.renderChart();
                this.updateStatistics();
            }
        });
    },

    updateVisibleParameters: function() {
        [...this.voltageParameters, ...this.currentParameters, ...this.energyParameters, ...this.statusParameters]
            .forEach(p => p.visible = $(`#mueks_param_${p.id}`).is(':checked'));
    },

    getSelectedParameters: function() {
        const groups = {
            voltage: this.voltageParameters,
            current: this.currentParameters,
            energy:  this.energyParameters,
            status:  this.statusParameters,
            tds:     this.tdsParameters
        };
        return (groups[this.currentTab] || []).filter(p => p.visible);
    },

    updateChartTitle: function() {
        const titles = {
            voltage:  'Параметры напряжения (В)',
            current:  'Параметры тока (А)',
            energy:   'Параметры энергии',
            status:   'Статусы и температура',
            tds:      'TDS параметры'
        };
        $('#mueksChartTitle').text(titles[this.currentTab] || 'Параметры MUEKS');
    },

    renderTdsTable: function() {
        if (!this.allMeasurements?.length) return;

        const container = $('#mueksTdsTable');
        if (!container.length) return;

        const recent = this.allMeasurements.slice(-10).reverse();

        let html = `
            <table class="table table-sm table-bordered table-hover">
                <thead class="table-light">
                    <tr>
                        <th>Дата/время</th>
                        <th>TDS H</th>
                        <th>TDS TDS</th>
                        <th>TKOСА T1</th>
                        <th>TKOСА T3</th>
                    </tr>
                </thead>
                <tbody>
        `;

        recent.forEach(m => {
            html += `
                <tr>
                    <td>${moment(m.dataTimestamp).format('DD.MM.YYYY HH:mm:ss')}</td>
                    <td>${m.tdsH ?? '-'}</td>
                    <td>${m.tdsTds ?? '-'}</td>
                    <td>${m.tkosaT1 ?? '-'}</td>
                    <td>${m.tkosaT3 ?? '-'}</td>
                </tr>
            `;
        });

        html += `</tbody></table><div class="text-muted small">Последние 10 записей</div>`;
        container.html(html);
    },

    startAutoUpdate: function() {
        this.stopAutoUpdate();
        if (!this.autoUpdateEnabled) return;

        let sec = 30;
        $('#mueksCountdownTimer').text(sec).show();

        this.countdownInterval = setInterval(() => {
            sec = sec <= 0 ? 30 : sec - 1;
            $('#mueksCountdownTimer').text(sec);
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
        $('#mueksAutoUpdateToggle').prop('checked', true);
        $('#mueksCountdownTimer').show().text('30');

        if (this.chart) this.chart.destroy();
        if (this.dateSlider) try { this.dateSlider.destroy(); } catch(e) {}
        this.chart = this.dateSlider = null;
        this.sliderInitialized = false;
        this.allMeasurements = [];
    },

    loadData: function(days, silent = false) {
        if (this.isLoading && this.xhr) this.xhr.abort();
        this.isLoading = true;
        if (!silent) $('#mueksChartLoadingIndicator').fadeIn(150);

        this.xhr = $.ajax({
            url: '/GraphsAndCharts/GetMUEKSData',
            type: 'GET',
            data: { sensorId: this.currentSensorId, days },
            success: (data) => {
                const old = this.allMeasurements.length;
                this.allMeasurements = data.measurements || [];
                const hasNew = this.allMeasurements.length > old;

                if (this.currentTab === 'tds') {
                    this.renderTdsTable();
                } else {
                    this.renderChart();
                    this.updateStatistics();
                }

                this.updateLastUpdateTime(data);

                setTimeout(() => this.initDateRangeSlider(), 50);

                if (silent && hasNew && this.autoUpdateEnabled) {
                    this.showNotification('Получены новые данные MUEKS');
                }

                this.isLoading = false;
                if (!silent) $('#mueksChartLoadingIndicator').fadeOut(150);
                this.xhr = null;
            },
            error: (xhr, s, err) => {
                if (s !== 'abort') console.error('MUEKS load error:', err);
                this.isLoading = false;
                if (!silent) $('#mueksChartLoadingIndicator').fadeOut(150);
                this.xhr = null;
            }
        });
    },

    initDateRangeSlider: function() {
        if (typeof noUiSlider === 'undefined') return console.error('noUiSlider не загружен');

        if (!this.allMeasurements || this.allMeasurements.length < 2) {
            $('#mueksDateRangeSection').addClass('disabled');
            $('#mueksSliderContainer').addClass('disabled');
            return;
        }

        const ts = this.allMeasurements.map(m => new Date(m.dataTimestamp).getTime());
        this.minDate = Math.min(...ts);
        this.maxDate = Math.max(...ts);

        if (isNaN(this.minDate) || isNaN(this.maxDate) || this.minDate >= this.maxDate) return;

        const fmt = t => moment(t).format('DD.MM.YYYY HH:mm');

        $('#mueksMinDateLabel').text(fmt(this.minDate));
        $('#mueksMaxDateLabel').text(fmt(this.maxDate));
        $('#mueksDateRangeLabel').text(`${fmt(this.minDate)} - ${fmt(this.maxDate)}`);

        const slider = document.getElementById('mueksDateRangeSlider');
        if (!slider) return;

        $('#mueksDateRangeSection').removeClass('disabled');
        $('#mueksSliderContainer').removeClass('disabled');

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
                    $('#mueksDateRangeLabel').text(`${s} - ${e}`);
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
                console.error('Ошибка слайдера MUEKS:', e);
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

        if (this.currentTab === 'tds') {
            this.renderTdsTable();
        } else {
            this.renderChart();
            this.updateStatistics();
        }

        this.allMeasurements = orig;
    },

    renderChart: function() {
        if (!this.allMeasurements?.length) return;

        const m = this.allMeasurements;
        const ts = m.map(x => new Date(x.dataTimestamp));

        const range = this.getTimeRange(ts);
        this.updateTimeScaleLabel(range);
        const cfg = this.getTimeConfig(range);

        const ctx = document.getElementById('mueksChart')?.getContext('2d');
        if (!ctx) return;

        if (this.chart) this.chart.destroy();

        const selected = this.getSelectedParameters().filter(p => !p.isText);
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
                yAxisID: i === 0 ? 'y' : `y${i+1}`
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
            const id = i === 0 ? 'y' : `y${i+1}`;
            yAxes[id] = {
                type: 'linear',
                display: true,
                position: i === 0 ? 'left' : 'right',
                title: { display: true, text: p.name + (p.unit ? ` (${p.unit})` : '') },
                grid: { drawOnChartArea: i === 0 },
                ticks: { callback: v => v ? v.toFixed(1) : v }
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
        const container = $('#mueksStatisticsContainer');
        if (!container.length) return;
        container.empty();

        const selected = this.getSelectedParameters().filter(p => !p.isText);
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
                        <div class="small text-muted"><i class="fas ${p.icon} fa-xs me-1"></i>${p.name}</div>
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
            $('#mueksLastUpdateTime').text('Нет данных');
            return;
        }
        const last = m[m.length-1].dataTimestamp;
        $('#mueksLastUpdateTime').text(moment(last).format('DD.MM.YYYY HH:mm:ss'));
        this.lastUpdateTime = last;
    },

    showNotification: function(msg) {
        const n = $(`
            <div class="alert alert-danger alert-dismissible fade show position-fixed top-0 end-0 m-3" style="z-index:9999;" role="alert">
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
        $('#mueksTimeScaleLabel').text(l[r] || 'авто');
    }
};

$(document).ready(function() {
    console.log('✅ MUEKS Charts загружен');
    $(document).on('sensorChanged', () => {
        if (typeof MUEKSCharts !== 'undefined') MUEKSCharts.cleanup();
    });
});