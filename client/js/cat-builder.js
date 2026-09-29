// ============================================
// Конструктор кота — 4 слоя + пресеты + ползунки
// ============================================

const canvas = document.getElementById('cat-canvas');
const ctx = canvas.getContext('2d');

// Ссылки на картинки
const IMG = {
    base:    'https://raw.githubusercontent.com/shalpflie20-crypto/Be-wild/refs/heads/main/osnowa.png',
    spots:   'https://raw.githubusercontent.com/shalpflie20-crypto/Be-wild/refs/heads/main/spots.png',
    stripes: 'https://raw.githubusercontent.com/shalpflie20-crypto/Be-wild/refs/heads/main/stripes.png',
    line:    'https://raw.githubusercontent.com/shalpflie20-crypto/Be-wild/refs/heads/main/ine.png'
};

const images = {};

// Состояние кота
const catState = {
    // Шерсть
    bodyColor: '#b8825a',
    bodyH: 20,
    bodyS: 70,
    bodyL: 50,

    // Узор
    pattern: 'none',
    patternColor: '#3a2418',
    patternH: 20,
    patternS: 70,
    patternL: 30,
    patternOpacity: 100
};

// Пресеты цветов
const COLOR_PRESETS = [
    { hex: '#b8825a', name: 'Рыжий',    h: 20, s: 70, l: 50 },
    { hex: '#8b6f47', name: 'Бурый',    h: 28, s: 32, l: 41 },
    { hex: '#e8d5b0', name: 'Кремовый', h: 35, s: 50, l: 80 },
    { hex: '#5a5a5a', name: 'Серый',    h: 0,  s: 0,  l: 35 },
    { hex: '#2a2a2a', name: 'Чёрный',   h: 0,  s: 0,  l: 16 },
    { hex: '#f5e6c8', name: 'Белый',    h: 40, s: 50, l: 87 },
    { hex: '#d4a76a', name: 'Золотой',  h: 35, s: 60, l: 62 },
    { hex: '#7a5c3a', name: 'Кофейный', h: 28, s: 35, l: 35 }
];

// ============================================
// ЗАГРУЗКА КАРТИНОК
// ============================================
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

async function loadAllImages() {
    try {
        const [base, spots, stripes, line] = await Promise.all([
            loadImage(IMG.base),
            loadImage(IMG.spots),
            loadImage(IMG.stripes),
            loadImage(IMG.line)
        ]);
        images.base = base;
        images.spots = spots;
        images.stripes = stripes;
        images.line = line;
        drawCat();
    } catch (e) {
        console.error('Ошибка загрузки картинок:', e);
        ctx.fillStyle = '#333';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Не удалось загрузить картинки', canvas.width / 2, canvas.height / 2);
    }
}

// ============================================
// HSL → HEX
// ============================================
function hslToHex(h, s, l) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

// ============================================
// ОКРАСКА СЛОЯ
// ============================================
function drawColoredLayer(image, color) {
    const tmp = document.createElement('canvas');
    tmp.width = canvas.width;
    tmp.height = canvas.height;
    const tmpCtx = tmp.getContext('2d');

    tmpCtx.drawImage(image, 0, 0, tmp.width, tmp.height);
    tmpCtx.globalCompositeOperation = 'source-in';
    tmpCtx.fillStyle = color;
    tmpCtx.fillRect(0, 0, tmp.width, tmp.height);

    return tmp;
}

// ============================================
// ГЛАВНАЯ ФУНКЦИЯ РИСОВАНИЯ
// ============================================
function drawCat() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!images.base) return;

    // 1. База
    const coloredBase = drawColoredLayer(images.base, catState.bodyColor);
    ctx.drawImage(coloredBase, 0, 0);

    // 2. Узор (если выбран)
    if (catState.pattern !== 'none') {
        const patternImage = catState.pattern === 'spots' ? images.spots : images.stripes;
        if (patternImage) {
            const coloredPattern = drawColoredLayer(patternImage, catState.patternColor);

            ctx.save();
            ctx.globalAlpha = catState.patternOpacity / 100;
            ctx.drawImage(coloredPattern, 0, 0);
            ctx.restore();
        }
    }

    // 3. Лайн
    if (images.line) {
        ctx.drawImage(images.line, 0, 0, canvas.width, canvas.height);
    }
}

// ============================================
// ПРЕСЕТЫ ДЛЯ ШЕРСТИ
// ============================================
function buildBodyPalette() {
    const container = document.getElementById('bodyColors');
    if (!container) return;

    COLOR_PRESETS.forEach((preset, index) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'color-swatch' + (index === 0 ? ' active' : '');
        btn.style.background = preset.hex;
        btn.title = preset.name;

        btn.addEventListener('click', () => {
            document.querySelectorAll('#bodyColors .color-swatch').forEach(s => s.classList.remove('active'));
            btn.classList.add('active');

            catState.bodyH = preset.h;
            catState.bodyS = preset.s;
            catState.bodyL = preset.l;
            catState.bodyColor = preset.hex;

            document.getElementById('bodySat').value = preset.s;
            document.getElementById('bodyLight').value = preset.l;
            document.getElementById('bodySatVal').textContent = preset.s;
            document.getElementById('bodyLightVal').textContent = preset.l;

            drawCat();
        });

        container.appendChild(btn);
    });
}

// ============================================
// ПРЕСЕТЫ ДЛЯ УЗОРА
// ============================================
function buildPatternPalette() {
    const container = document.getElementById('patternColors');
    if (!container) return;

    COLOR_PRESETS.forEach((preset) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'color-swatch' + (preset.hex === '#2a2a2a' ? ' active' : '');
        btn.style.background = preset.hex;
        btn.title = preset.name;

        if (preset.hex === '#2a2a2a') {
            catState.patternH = preset.h;
            catState.patternS = preset.s;
            catState.patternL = preset.l;
            catState.patternColor = preset.hex;
        }

        btn.addEventListener('click', () => {
            document.querySelectorAll('#patternColors .color-swatch').forEach(s => s.classList.remove('active'));
            btn.classList.add('active');

            catState.patternH = preset.h;
            catState.patternS = preset.s;
            catState.patternL = preset.l;
            catState.patternColor = preset.hex;

            document.getElementById('patternSat').value = preset.s;
            document.getElementById('patternLight').value = preset.l;
            document.getElementById('patternSatVal').textContent = preset.s;
            document.getElementById('patternLightVal').textContent = preset.l;

            drawCat();
        });

        container.appendChild(btn);
    });

    document.getElementById('patternSat').value = catState.patternS;
    document.getElementById('patternLight').value = catState.patternL;
    document.getElementById('patternSatVal').textContent = catState.patternS;
    document.getElementById('patternLightVal').textContent = catState.patternL;
}

// ============================================
// ПОЛЗУНКИ ШЕРСТИ
// ============================================
function setupBodySliders() {
    const sat = document.getElementById('bodySat');
    const light = document.getElementById('bodyLight');
    const satVal = document.getElementById('bodySatVal');
    const lightVal = document.getElementById('bodyLightVal');

    function update() {
        catState.bodyS = parseInt(sat.value);
        catState.bodyL = parseInt(light.value);
        satVal.textContent = catState.bodyS;
        lightVal.textContent = catState.bodyL;

        catState.bodyColor = hslToHex(catState.bodyH, catState.bodyS, catState.bodyL);

        document.querySelectorAll('#bodyColors .color-swatch').forEach(s => s.classList.remove('active'));

        drawCat();
    }

    sat.addEventListener('input', update);
    light.addEventListener('input', update);
}

// ============================================
// ПОЛЗУНКИ УЗОРА
// ============================================
function setupPatternSliders() {
    const sat = document.getElementById('patternSat');
    const light = document.getElementById('patternLight');
    const opacity = document.getElementById('patternOpacity');
    const satVal = document.getElementById('patternSatVal');
    const lightVal = document.getElementById('patternLightVal');
    const opacityVal = document.getElementById('patternOpacityVal');

    function update() {
        catState.patternS = parseInt(sat.value);
        catState.patternL = parseInt(light.value);
        catState.patternOpacity = parseInt(opacity.value);
        satVal.textContent = catState.patternS;
        lightVal.textContent = catState.patternL;
        opacityVal.textContent = catState.patternOpacity;

        catState.patternColor = hslToHex(catState.patternH, catState.patternS, catState.patternL);

        document.querySelectorAll('#patternColors .color-swatch').forEach(s => s.classList.remove('active'));

        drawCat();
    }

    sat.addEventListener('input', update);
    light.addEventListener('input', update);
    opacity.addEventListener('input', update);
}

// ============================================
// КНОПКИ УЗОРА
// ============================================
function setupPatternButtons() {
    const settingsBlock = document.getElementById('patternSettings');
    if (!settingsBlock) return;

    function updateVisibility() {
        if (catState.pattern === 'none') {
            settingsBlock.classList.remove('visible');
        } else {
            settingsBlock.classList.add('visible');
        }
    }

    document.querySelectorAll('.pattern-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            catState.pattern = btn.dataset.pattern;
            document.querySelectorAll('.pattern-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            updateVisibility();
            drawCat();
        });
    });

    // При загрузке страницы — синхронизируем видимость с текущим pattern
    updateVisibility();
}

// ============================================
// СОХРАНЕНИЕ
// ============================================
function saveAndPlay() {
    localStorage.setItem('starClan_cat', JSON.stringify({
        bodyColor: catState.bodyColor,
        pattern: catState.pattern,
        patternColor: catState.patternColor,
        patternOpacity: catState.patternOpacity
    }));
    window.location.href = 'game.html';
}

// ============================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================
document.getElementById('saveAndPlayBtn').addEventListener('click', saveAndPlay);

buildBodyPalette();
buildPatternPalette();
setupBodySliders();
setupPatternSliders();
setupPatternButtons();
loadAllImages();