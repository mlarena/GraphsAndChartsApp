// mueks-charts.js - Модуль для визуализации данных модуля управления электроснабжением
// Модифицирован: вынесена логика слайдера в DateRangeSlider

const MUEKSCharts = {
    chart: null,
    currentSensorId: null,
    allMeasurements: [],
    isLoading: false,
    currentDays: 7,
    currentChartType: 'line',
    currentTab: 'voltage',
    autoUpdateInstance: null,

    voltageParameters: [
        { id: 'voltageIn12b', name: 'Напряжение вх. 12В', unit: 'В', color: '#dc3545', property: 'voltagePowerIn12b', visible: true, order: 1, group: 'voltage', icon: 'fa-bolt' },
        { id: 'voltageOut12b',name: 'Напряжение вых. 12В',unit: 'В', color: '#fd7e14', property: 'voltageOut12b',     visible: false, order: 2, group: 'voltage', icon: 'fa-bolt' },
        { id: 'voltageAkb',   name: 'Напряжение АКБ',     unit: 'В', color: '#ffc107', property: 'voltageAkb',        visible: false, order: 3, group: 'voltage', icon: 'fa-battery-half' }
    ],

    currentParameters: [
        { id: 'currentOut12b',name: 'Ток вых. 12В', unit: 'А', color: '#0d6efd', property: 'currentOut12b', visible: true, order: 1, group: 'current', icon: 'fa-wave-square' },
        { id: 'currentOut48b',name: 'Ток вых. 48В', unit: 'А', color: '#17a2b8', property: 'currentOut48b', visible: false, order: 2, group: 'current', icon: 'fa-wave-square' },
        { id: 'currentAkb',   name: 'Ток АКБ',      unit: 'А', color: '#20c997', property: 'currentAkb',    visible: false, order: 3, group: 'current', icon: 'fa-battery-half' }
    ],

    energyParameters: [
        { id: 'wattHours',    name: 'Ватт-часы АКБ', unit: 'Вт·ч', color: '#6f42c1', property: 'wattHoursAkb', visible: true,  order: 1, group: 'energy', icon: 'fa-bolt' },
        { id: 'visibleRange', name: 'Видимый диапазон',unit: '',   color: '#e83e8c', property: 'visibleRange',visible: false, order: 2, group: 'energy', icon: 'fa-eye' }
    ],

    statusParameters: [
        { id: 'temperature', name: 'Температура',   unit: '°C', color: '#28a745', property: 'temperatureBox', visible: true,  order: 1, group: 'status', icon: 'fa-thermometer-half' },
        { id: 'sensor220b',  name: 'Датчик 220В',   unit: '',   color: '#dc3545', property: 'sensor220b',     visible: false, order: 2, group: 'status', icon: 'fa-plug' },
        { id: 'doorStatus',  name: 'Статус двери',  unit: '',   color: '#ffc107', property: 'doorStatus',      visible: false, order: 3, group: 'status', icon: 'fa-door-open' }
    ],

    tdsParameters: [
        { id: 'tdsH',     name: 'TDS H',     unit: '', color: '#6c757d', property: 'tdsH',     visible: true, order: 1, group: 'tds', icon: 'fa-microchip', isText: true },
        { id: 'tdsTds',   name: 'TDS TDS',   unit: '', color: '#17a2b8', property: 'tdsTds',   visible: true, order: 2, group: 'tds', icon: 'fa-microchip', isText: true },
        { id: 'tkosaT1',  name: 'TKOСА T1',  unit: '', color: '#6610f2', property: 'tkosaT1',  visible: true, order: 3, group: 'tds', icon: 'fa-microchip', isText: true },
        { id: 'tkosaT3',  name: 'TKOСА T3',  unit: '', color: '#e83e8c', property: 'tkosaT3',  visible: true, order: 4, group: 'tds', icon: 'fa-microchip', isText: true }
    ],

    init: function(sensorId) {
        console.log('MUEKSCharts.init()', sensorId);
        this.currentSensorId = sensorId;
        moment.locale('ru');

        this.createAllRadios();
        
        // Инициализация автообновления через менеджер
        this.initAutoUpdate();
        
        this.loadData(this.currentDays);

        // Обработчик кнопок периода
        $('#mueksTimeRangeButtons .btn').off('click').on('click', (e) => {
            const btn = $(e.currentTarget);
            if (btn.hasClass('active')) return;

            $('#mueksTimeRangeButtons .btn').removeClass('active');
            btn.addClass('active');
            const days = btn.data('days');
            this.currentDays = days;

            this.loadData(days);
        });

        // Обработчик типа графика (радио-кнопки)
        $('input[name="mueksChartType"]').off('change').on('change', (e) => {
            this.currentChartType = $(e.currentTarget).val();
            if (this.currentTab !== 'tds') this.renderChart();
        });

        // Обработчик переключения вкладок
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

        // Обработчик радио-кнопок параметров
        $(document).on('change', '.mueks-parameter-radio', () => {
            this.updateVisibleParameters();
            if (this.currentTab !== 'tds') {
                this.renderChart();
                this.updateStatistics();
            }
        });
    },

    initAutoUpdate: function() {
        if (typeof AutoUpdateManager === 'undefined') {
            console.error('AutoUpdateManager не загружен!');
            return;
        }

        const toggleElement = document.getElementById('mueksAutoUpdateToggle');
        if (!toggleElement) {
            console.error('Элемент mueksAutoUpdateToggle не найден!');
            return;
        }

        this.autoUpdateInstance = AutoUpdateManager.create('mueks', {
            interval: 30000,
            onUpdate: () => {
                if (this.currentSensorId) {
                    console.log('MUEKS: автообновление...');
                    this.loadData(this.currentDays, true);
                }
            }
        });

        console.log('MUEKS: автообновление инициализировано');
    },

    initDateRangeSlider: function() {
        // Проверяем наличие DateRangeSlider
        if (typeof DateRangeSlider === 'undefined') {
            console.error('DateRangeSlider не загружен!');
            return;
        }

        // Создаем или получаем экземпляр слайдера
        let slider = DateRangeSlider.get('mueks');
        if (!slider) {
            slider = DateRangeSlider.create('mueks', {
                onRangeChange: (filteredData) => {
                    // Временно заменяем все измерения отфильтрованными для отрисовки
                    const originalData = this.allMeasurements;
                    this.allMeasurements = filteredData;
                    
                    if (this.currentTab === 'tds') {
                        this.renderTdsTable();
                    } else {
                        this.renderChart();
                        this.updateStatistics();
                    }
                    
                    this.allMeasurements = originalData;
                }
            });
        }

        // Инициализируем слайдер с текущими данными
        DateRangeSlider.initSlider('mueks', this.allMeasurements);
    },

    createAllRadios: function() {
        this.createRadiosForGroup('voltage',  this.voltageParameters,  '#mueksVoltageRadios');
        this.createRadiosForGroup('current',  this.currentParameters,  '#mueksCurrentRadios');
        this.createRadiosForGroup('energy',   this.energyParameters,   '#mueksEnergyRadios');
        this.createRadiosForGroup('status',   this.statusParameters,   '#mueksStatusRadios');
        // TDS — без радио-кнопок
    },

    createRadiosForGroup: function(groupName, params, containerSelector) {
        const container = $(containerSelector);
        if (!container.length) return;

        container.empty();

        params.sort((a,b)=>a.order-b.order).forEach(p => {
            container.append(this.createRadioColumn(p, groupName));
        });
    },

    createRadioColumn: function(param, group) {
        const radioName = `mueks_${group}_param`;
        
        return $(`
            <div class="col-md-4 col-sm-6 mb-2">
                <div class="form-check">
                    <input class="form-check-input mueks-parameter-radio"
                           type="radio"
                           name="${radioName}"
                           id="mueks_radio_${param.id}"
                           value="${param.id}"
                           data-param-id="${param.id}"
                           data-group="${group}"
                           data-property="${param.property}"
                           ${param.visible ? 'checked' : ''}>
                    <label class="form-check-label small" for="mueks_radio_${param.id}" title="${param.description || ''}">
                        <i class="fas ${param.icon} fa-xs text-muted me-1" style="color:${param.color};"></i>
                        <span style="display:inline-block;width:8px;height:8px;background-color:${param.color};border-radius:50%;margin-right:4px;"></span>
                        ${param.name} ${param.unit ? `(${param.unit})` : ''}
                    </label>
                </div>
            </div>
        `);
    },

    updateVisibleParameters: function() {
        [...this.voltageParameters, ...this.currentParameters, ...this.energyParameters, ...this.statusParameters]
            .forEach(p => p.visible = $(`#mueks_radio_${p.id}`).is(':checked'));
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

    cleanup: function() {
        console.log('MUEKSCharts.cleanup()');
        
        if (this.autoUpdateInstance) {
            AutoUpdateManager.destroy('mueks');
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

                // Инициализируем или обновляем слайдер
                setTimeout(() => this.initDateRangeSlider(), 50);

                if (silent && hasNew && this.autoUpdateInstance && this.autoUpdateInstance.enabled) {
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
                yAxisID: i === 0 ? 'y' : `y${i+1}`
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
        const container = $('#mueksStatisticsContainer');
        if (!container.length) return;
        container.empty();

        const selected = this.getSelectedParameters().filter(p => !p.isText);
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
                        <div class="small text-muted"><i class="fas ${p.icon} fa-xs me-1" style="color:${p.color};"></i>${p.name}</div>
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
        
        if (this.autoUpdateInstance) {
            this.autoUpdateInstance.updateLastUpdateTime(last);
        }
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