// date-range-slider.js - Универсальный модуль для управления слайдером диапазона дат

const DateRangeSlider = (function() {
    'use strict';
    
    // Приватное хранилище экземпляров
    const instances = new Map();
    
    class SliderInstance {
        constructor(prefix, options = {}) {
            this.prefix = prefix;
            this.sliderElement = document.getElementById(`${prefix}DateRangeSlider`);
            this.container = $(`#${prefix}DateRangeSection`);
            this.sliderContainer = $(`#${prefix}SliderContainer`);
            this.dateRangeLabel = $(`#${prefix}DateRangeLabel`);
            this.minDateLabel = $(`#${prefix}MinDateLabel`);
            this.maxDateLabel = $(`#${prefix}MaxDateLabel`);
            
            this.slider = null;
            this.minDate = null;
            this.maxDate = null;
            this.measurements = [];
            this.onRangeChangeCallback = options.onRangeChange || null;
            this.initialized = false;
            
            // Проверка наличия необходимых элементов
            if (!this.sliderElement) {
                console.error(`DateRangeSlider [${prefix}]: элемент слайдера не найден`);
                return;
            }
        }
        
        /**
         * Инициализация или обновление слайдера на основе новых данных
         * @param {Array} measurements - массив измерений с полем dataTimestamp
         * @returns {boolean} - успешность инициализации
         */
        init(measurements) {
            if (typeof noUiSlider === 'undefined') {
                console.error('DateRangeSlider: noUiSlider не загружен');
                return false;
            }
            
            this.measurements = measurements || [];
            
            // Если данных недостаточно, отключаем слайдер
            if (!this.measurements || this.measurements.length < 2) {
                this.container.addClass('disabled');
                this.sliderContainer.addClass('disabled');
                this.destroy();
                return false;
            }
            
            // Получаем временные метки
            const timestamps = this.measurements
                .map(m => new Date(m.dataTimestamp).getTime())
                .filter(ts => !isNaN(ts));
            
            if (timestamps.length < 2) {
                this.container.addClass('disabled');
                this.sliderContainer.addClass('disabled');
                this.destroy();
                return false;
            }
            
            this.minDate = Math.min(...timestamps);
            this.maxDate = Math.max(...timestamps);
            
            if (isNaN(this.minDate) || isNaN(this.maxDate) || this.minDate >= this.maxDate) {
                console.error(`DateRangeSlider [${this.prefix}]: некорректные даты`);
                return false;
            }
            
            // Обновляем метки дат
            this.updateDateLabels(this.minDate, this.maxDate);
            
            // Активируем секцию слайдера
            this.container.removeClass('disabled');
            this.sliderContainer.removeClass('disabled');
            
            // Если слайдер уже существует, обновляем его диапазон
            if (this.slider) {
                this.slider.updateOptions({
                    range: { min: this.minDate, max: this.maxDate },
                    start: [this.minDate, this.maxDate]
                });
                return true;
            }
            
            // Иначе создаем новый слайдер
            return this.createSlider();
        }
        
        /**
         * Создание нового экземпляра слайдера
         * @private
         */
        createSlider() {
            // Очищаем контейнер слайдера
            this.sliderElement.innerHTML = '';
            
            setTimeout(() => {
                try {
                    this.slider = noUiSlider.create(this.sliderElement, {
                        start: [this.minDate, this.maxDate],
                        connect: true,
                        range: { min: this.minDate, max: this.maxDate },
                        step: 3600000, // 1 час
                        format: {
                            to: v => Math.round(v),
                            from: v => Math.round(v)
                        },
                        behaviour: 'tap-drag',
                        animate: true,
                        animationDuration: 300
                    });
                    
                    // Обработчик обновления (при движении ползунков)
                    this.slider.on('update', (values) => {
                        const start = parseInt(values[0]);
                        const end = parseInt(values[1]);
                        this.updateRangeLabel(start, end);
                    });
                    
                    // Обработчик начала взаимодействия
                    this.slider.on('start', () => {
                        $(document).trigger('sliderDragStart');
                    });
                    
                    // Обработчик окончания взаимодействия
                    this.slider.on('end', (values) => {
                        const startTime = parseInt(values[0]);
                        const endTime = parseInt(values[1]);
                        
                        // Вызываем callback с выбранным диапазоном
                        if (this.onRangeChangeCallback) {
                            const filteredData = this.filterData(startTime, endTime);
                            this.onRangeChangeCallback(filteredData, startTime, endTime);
                        }
                        
                        $(document).trigger('sliderDragEnd');
                    });
                    
                    this.initialized = true;
                    console.log(`DateRangeSlider [${this.prefix}]: инициализирован`);
                    
                } catch (e) {
                    console.error(`DateRangeSlider [${this.prefix}]: ошибка создания`, e);
                    this.initialized = false;
                }
            }, 50);
            
            return true;
        }
        
        /**
         * Фильтрация данных по диапазону дат
         * @param {number} startTime - начало диапазона (timestamp)
         * @param {number} endTime - конец диапазона (timestamp)
         * @returns {Array} - отфильтрованный массив измерений
         */
        filterData(startTime, endTime) {
            return this.measurements.filter(m => {
                const t = new Date(m.dataTimestamp).getTime();
                return t >= startTime && t <= endTime;
            });
        }
        
        /**
         * Обновление меток минимальной и максимальной даты
         * @param {number} min - минимальный timestamp
         * @param {number} max - максимальный timestamp
         */
        updateDateLabels(min, max) {
            const formatDate = (ts) => moment(ts).format('DD.MM.YYYY HH:mm');
            this.minDateLabel.text(formatDate(min));
            this.maxDateLabel.text(formatDate(max));
        }
        
        /**
         * Обновление метки выбранного диапазона
         * @param {number} start - начало диапазона (timestamp)
         * @param {number} end - конец диапазона (timestamp)
         */
        updateRangeLabel(start, end) {
            const formatDate = (ts) => moment(ts).format('DD.MM.YYYY HH:mm');
            this.dateRangeLabel.text(`${formatDate(start)} - ${formatDate(end)}`);
        }
        
        /**
         * Уничтожение слайдера
         */
        destroy() {
            if (this.slider) {
                try {
                    this.slider.destroy();
                } catch (e) {
                    console.error(`DateRangeSlider [${this.prefix}]: ошибка при уничтожении`, e);
                }
                this.slider = null;
            }
            this.initialized = false;
        }
        
        /**
         * Проверка, инициализирован ли слайдер
         * @returns {boolean}
         */
        isInitialized() {
            return this.initialized && this.slider !== null;
        }
        
        /**
         * Получение текущего диапазона
         * @returns {Object|null} - объект с полями start и end или null
         */
        getCurrentRange() {
            if (!this.slider) return null;
            const values = this.slider.get();
            return {
                start: parseInt(values[0]),
                end: parseInt(values[1])
            };
        }
        
        /**
         * Программная установка диапазона
         * @param {number} start - начало диапазона (timestamp)
         * @param {number} end - конец диапазона (timestamp)
         */
        setRange(start, end) {
            if (!this.slider) return;
            this.slider.set([start, end]);
        }
        
        /**
         * Сброс к полному диапазону
         */
        resetToFullRange() {
            if (!this.slider || !this.minDate || !this.maxDate) return;
            this.setRange(this.minDate, this.maxDate);
        }
    }
    
    // Публичный API
    return {
        /**
         * Создать новый экземпляр слайдера
         * @param {string} prefix - уникальный префикс для идентификации
         * @param {Object} options - настройки
         * @param {Function} options.onRangeChange - callback при изменении диапазона
         * @returns {SliderInstance} - экземпляр слайдера
         */
        create: function(prefix, options = {}) {
            if (instances.has(prefix)) {
                console.warn(`DateRangeSlider: экземпляр с префиксом "${prefix}" уже существует. Уничтожаем старый.`);
                this.destroy(prefix);
            }
            
            const instance = new SliderInstance(prefix, options);
            instances.set(prefix, instance);
            return instance;
        },
        
        /**
         * Получить экземпляр по префиксу
         * @param {string} prefix
         * @returns {SliderInstance|undefined}
         */
        get: function(prefix) {
            return instances.get(prefix);
        },
        
        /**
         * Уничтожить экземпляр по префиксу
         * @param {string} prefix
         */
        destroy: function(prefix) {
            const instance = instances.get(prefix);
            if (instance) {
                instance.destroy();
                instances.delete(prefix);
            }
        },
        
        /**
         * Уничтожить все экземпляры
         */
        destroyAll: function() {
            instances.forEach((instance, prefix) => {
                instance.destroy();
            });
            instances.clear();
        },
        
        /**
         * Инициализировать слайдер для конкретного префикса
         * @param {string} prefix
         * @param {Array} measurements
         * @returns {boolean}
         */
        initSlider: function(prefix, measurements) {
            const instance = instances.get(prefix);
            if (!instance) return false;
            return instance.init(measurements);
        }
    };
})();

// Глобальный обработчик для очистки
$(document).ready(function() {
    console.log('✅ DateRangeSlider загружен');
    
    // Очищаем все слайдеры при смене сенсора
    $(document).on('sensorChanged', function() {
        DateRangeSlider.destroyAll();
    });
});

// Экспортируем в глобальную область
window.DateRangeSlider = DateRangeSlider;