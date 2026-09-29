// ============================================
// Виджет котика: открытие окна + переключение вкладок
// ============================================

(function () {
    document.addEventListener('DOMContentLoaded', () => {
        const btn = document.getElementById('catWidgetBtn');
        const overlay = document.getElementById('catWidgetOverlay');
        const closeBtn = document.getElementById('catWidgetClose');

        if (!btn || !overlay) {
            console.warn('Cat widget: не найдены элементы в HTML');
            return;
        }

        // --- Открыть окно ---
        btn.addEventListener('click', () => {
            overlay.classList.add('active');
        });

        // --- Закрыть окно ---
        function closeWidget() {
            overlay.classList.remove('active');
        }

        if (closeBtn) closeBtn.addEventListener('click', closeWidget);

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeWidget();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && overlay.classList.contains('active')) {
                closeWidget();
            }
        });

        // --- Переключение вкладок ---
        const tabs = overlay.querySelectorAll('.cat-tab');
        const contents = overlay.querySelectorAll('.cat-tab-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.dataset.tab;

                // Убираем active со всех вкладок и контентов
                tabs.forEach(t => t.classList.remove('active'));
                contents.forEach(c => c.classList.remove('active'));

                // Добавляем active на нужные
                tab.classList.add('active');
                const targetContent = overlay.querySelector(`.cat-tab-content[data-content="${target}"]`);
                if (targetContent) targetContent.classList.add('active');
            });
        });
    });
})();