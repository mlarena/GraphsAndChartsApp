// Базовый JavaScript для всего приложения

// Функция для показа/скрытия загрузки
function showLoading(selector) {
    $(selector).html('<div class="text-center"><div class="spinner-border" role="status"><span class="visually-hidden">Загрузка...</span></div></div>');
}

// Функция для форматирования даты
function formatDate(date) {
    if (!date) return 'Нет данных';
    return new Date(date).toLocaleString('ru-RU');
}

// Инициализация при загрузке страницы
$(document).ready(function() {
    console.log('Приложение загружено');
    
    // Добавление обработчиков для всех форм с классом .ajax-form
    $('.ajax-form').on('submit', function(e) {
        e.preventDefault();
        const form = $(this);
        const url = form.attr('action');
        const method = form.attr('method') || 'POST';
        const data = form.serialize();
        
        $.ajax({
            url: url,
            type: method,
            data: data,
            success: function(response) {
                if (form.data('target')) {
                    $(form.data('target')).html(response);
                }
            },
            error: function(xhr) {
                alert('Произошла ошибка: ' + xhr.statusText);
            }
        });
    });
});