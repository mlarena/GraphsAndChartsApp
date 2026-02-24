// auto-update.js - Универсальный модуль для управления автообновлением

const AutoUpdateManager = (function() {
    // Приватные переменные
    const instances = new Map(); // хранилище экземпляров
    
    class AutoUpdateInstance {
        constructor(prefix, options = {}) {
            this.prefix = prefix;
            this.containerId = `${prefix}AutoUpdateControl`;
            this.toggleId = `${prefix}AutoUpdateToggle`;
            this.timerId = `${prefix}CountdownTimer`;
            
            this.enabled = false;
            this.interval = options.interval || 30000; // 30 секунд
            this.autoUpdateTimerId = null;
            this.countdownInterval = null;
            this.tempState = null;
            this.onUpdateCallback = options.onUpdate || null;
            this.onStartCallback = options.onStart || null;
            this.onStopCallback = options.onStop || null;
            this.lastUpdateTime = null;
            
            this.init();
        }
        
        init() {
            console.log(`AutoUpdate [${this.prefix}]: initialized`);
            
            // Принудительно устанавливаем начальное состояние
            const toggleElement = document.getElementById(this.toggleId);
            if (toggleElement) {
                toggleElement.checked = this.enabled;
                // Добавляем обработчик события
                toggleElement.addEventListener('change', (e) => {
                    this.setEnabled(e.target.checked);
                });
            }
            
            this.start();
        }
        
        start() {
            this.stop(); // очищаем предыдущие таймеры
            
            if (!this.enabled) return;
            
            console.log(`AutoUpdate [${this.prefix}]: started (${this.interval/1000}с)`);
            
            // Запускаем обратный отсчет
            let secondsLeft = this.interval / 1000;
            this.updateTimerDisplay(secondsLeft);
            
            this.countdownInterval = setInterval(() => {
                secondsLeft--;
                if (secondsLeft <= 0) secondsLeft = this.interval / 1000;
                this.updateTimerDisplay(secondsLeft);
            }, 1000);
            
            // Запускаем автообновление
            this.autoUpdateTimerId = setInterval(() => {
                if (this.enabled && this.onUpdateCallback) {
                    console.log(`AutoUpdate [${this.prefix}]: updating...`);
                    this.onUpdateCallback();
                }
            }, this.interval);
            
            if (this.onStartCallback) this.onStartCallback();
        }
        
        stop() {
            if (this.autoUpdateTimerId) {
                clearInterval(this.autoUpdateTimerId);
                this.autoUpdateTimerId = null;
            }
            if (this.countdownInterval) {
                clearInterval(this.countdownInterval);
                this.countdownInterval = null;
            }
            
            if (this.onStopCallback) this.onStopCallback();
        }
        
        pause() {
            if (this.enabled) {
                this.tempState = true;
                this.stop();
                this.hideTimer();
                console.log(`AutoUpdate [${this.prefix}]: paused`);
            }
        }
        
        resume() {
            if (this.tempState) {
                this.tempState = null;
                this.start();
                this.showTimer();
                console.log(`AutoUpdate [${this.prefix}]: resumed`);
            }
        }
        
        setEnabled(enabled) {
            if (this.enabled === enabled) return;
            
            this.enabled = enabled;
            
            if (enabled) {
                this.start();
                this.showTimer();
                console.log(`AutoUpdate [${this.prefix}]: enabled`);
            } else {
                this.stop();
                this.hideTimer();
                console.log(`AutoUpdate [${this.prefix}]: disabled`);
            }
        }
        
        updateTimerDisplay(seconds) {
            const timerElement = document.getElementById(this.timerId);
            if (timerElement) {
                timerElement.textContent = seconds;
            }
        }
        
        showTimer() {
            const timerElement = document.getElementById(this.timerId);
            if (timerElement) {
                timerElement.style.display = '';
            }
        }
        
        hideTimer() {
            const timerElement = document.getElementById(this.timerId);
            if (timerElement) {
                timerElement.style.display = 'none';
            }
        }
        
        destroy() {
            console.log(`AutoUpdate [${this.prefix}]: destroyed`);
            this.stop();
        }
        
        updateLastUpdateTime(timestamp) {
            this.lastUpdateTime = timestamp;
        }
    }
    
    // Публичный API
    return {
        /**
         * Создать новый экземпляр автообновления
         * @param {string} prefix - уникальный префикс для идентификации компонента
         * @param {Object} options - настройки
         * @param {number} options.interval - интервал в мс (по умолчанию 30000)
         * @param {Function} options.onUpdate - callback при обновлении
         * @param {Function} options.onStart - callback при старте
         * @param {Function} options.onStop - callback при остановке
         * @returns {Object} - экземпляр AutoUpdateInstance
         */
        create: function(prefix, options = {}) {
            if (instances.has(prefix)) {
                console.warn(`AutoUpdate instance with prefix "${prefix}" already exists. Destroying old one.`);
                this.destroy(prefix);
            }
            
            const instance = new AutoUpdateInstance(prefix, options);
            instances.set(prefix, instance);
            return instance;
        },
        
        /**
         * Получить экземпляр по префиксу
         */
        get: function(prefix) {
            return instances.get(prefix);
        },
        
        /**
         * Уничтожить экземпляр по префиксу
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
         * Приостановить все автообновления (для слайдера)
         */
        pauseAll: function() {
            instances.forEach(instance => instance.pause());
        },
        
        /**
         * Возобновить все автообновления
         */
        resumeAll: function() {
            instances.forEach(instance => instance.resume());
        }
    };
})();

// Глобальный обработчик для событий слайдера
$(document).ready(function() {
    // Обработка начала работы со слайдером
    $(document).on('sliderDragStart', function() {
        AutoUpdateManager.pauseAll();
    });
    
    // Обработка окончания работы со слайдером
    $(document).on('sliderDragEnd', function() {
        AutoUpdateManager.resumeAll();
    });
    
    console.log('✅ AutoUpdateManager загружен');
});

// Экспортируем в глобальную область
window.AutoUpdateManager = AutoUpdateManager;