// ============================================
// Игровое поле — большая карта, камера, мышь, нюх, ветер,
// погода (дождь/снег), следы-стрелки, время суток, светлячки.
// Каждая локация живёт независимо.
// Светлячки и запахи мыши — поверх ночного затемнения.
// ============================================

const viewport = document.getElementById('viewport');
const worldEl = document.getElementById('world');
const worldFgWrapper = document.getElementById('world-fg-wrapper');
const catCanvas = document.getElementById('cat-canvas');
const catCtx = catCanvas.getContext('2d');
const bgLayer = document.getElementById('bg-layer');
const fgLayer = document.getElementById('fg-layer');
const mouseEl = document.getElementById('mouse');

const smellLayer = document.getElementById('smell-layer');
const smellCtx = smellLayer.getContext('2d');

const smellFgLayer = document.getElementById('smell-layer-fg');
const smellFgCtx = smellFgLayer.getContext('2d');

const sniffIndicator = document.getElementById('sniffIndicator');

const windIndicator = document.getElementById('windIndicator');
const windArrow = document.getElementById('windArrow');
const windSpeedEl = document.getElementById('windSpeed');

const smellLabel = document.getElementById('smellLabel');

const weatherOverlay = document.getElementById('weather-overlay');
const weatherPanel = document.getElementById('weatherPanel');

const nightOverlay = document.getElementById('night-overlay');
const timePanel = document.getElementById('timePanel');

// ============================================
// ССЫЛКИ НА КАРТИНКИ
// ============================================
const IMG = {
    base:    'https://raw.githubusercontent.com/shalpflie20-crypto/bew/refs/heads/main/osnowa.png',
    spots:   'https://raw.githubusercontent.com/shalpflie20-crypto/bew/refs/heads/main/spots.png',
    stripes: 'https://raw.githubusercontent.com/shalpflie20-crypto/bew/refs/heads/main/stripes.png',
    line:    'https://raw.githubusercontent.com/shalpflie20-crypto/bew/refs/heads/main/ine.png'
};

const images = {};

// ============================================
// ЛОКАЦИИ
// ============================================
const LOCATIONS = {
    forest: {
        name: '🌿 Лесная поляна',
        bg: 'https://raw.githubusercontent.com/shalpflie20-crypto/bew/refs/heads/main/%D1%83.png',
        fg: 'https://raw.githubusercontent.com/shalpflie20-crypto/bew/refs/heads/main/1885e0f5-7082-4036-9a8d-5a49afb17b03.png',
        width: 4000,
        height: 4000,
        mouse: { x: 2000, y: 2000, label: 'мышь' }
    },
    cave: {
        name: '🏔 Пещера',
        bg: 'https://raw.githubusercontent.com/shalpflie20-crypto/bew/refs/heads/main/e47acf3a1b4d10889d2d82ab9354db8f.png',
        fg: null,
        width: 3000,
        height: 3000,
        mouse: null
    }
};

// ============================================
// НЕЗАВИСИМОЕ ХРАНИЛИЩЕ ЛОКАЦИЙ
// ============================================
const WORLD_STATE = {
    forest: {
        smell: [], trail: [], paw: [],
        smellTimer: 0, catTrailTimer: 0, pawTimer: 0,
        lastCatX: 0, lastCatY: 0,
        catX: 2000, catY: 2000
    },
    cave: {
        smell: [], trail: [], paw: [],
        smellTimer: 0, catTrailTimer: 0, pawTimer: 0,
        lastCatX: 0, lastCatY: 0,
        catX: 200, catY: 200
    }
};

let currentLocation = 'forest';
let currentSmellSource = { label: 'мышь', x: 0, y: 0 };

// Псевдонимы на массивы активной локации
let smellParticles = WORLD_STATE.forest.smell;
let catTrailParticles = WORLD_STATE.forest.trail;
let pawParticles = WORLD_STATE.forest.paw;

// ============================================
// ПОГОДА
// ============================================
let currentWeather = 'clear';

const WEATHER_SETTINGS = {
    'clear':       { smellLifeMul: 1.0,  smellAlphaMul: 1.0, pawLifeMul: 1.0,    pawAlphaMul: 1.0, spawnPaw: true },
    'rain-light':  { smellLifeMul: 0.7,  smellAlphaMul: 0.7, pawLifeMul: 1.0,    pawAlphaMul: 0.7, spawnPaw: true },
    'rain-heavy':  { smellLifeMul: 1.0,  smellAlphaMul: 0.1, pawLifeMul: 0.0167, pawAlphaMul: 1.0, spawnPaw: true },
    'snow-light':  { smellLifeMul: 1.0,  smellAlphaMul: 0.7, pawLifeMul: 1.0,    pawAlphaMul: 0.7, spawnPaw: true },
    'blizzard':    { smellLifeMul: 1.0,  smellAlphaMul: 0.1, pawLifeMul: 0,      pawAlphaMul: 0,   spawnPaw: false }
};

function setWeather(weatherKey) {
    if (!WEATHER_SETTINGS[weatherKey]) return;

    currentWeather = weatherKey;

    document.querySelectorAll('.weather-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.weather === weatherKey);
    });

    weatherOverlay.className = '';
    if (weatherKey !== 'clear') {
        weatherOverlay.classList.add(weatherKey);
    }

    const newSettings = WEATHER_SETTINGS[weatherKey];

    for (const locKey in WORLD_STATE) {
        const state = WORLD_STATE[locKey];

        for (const p of state.smell) {
            if (p.baseLife === undefined) continue;
            const lifeFraction = p.maxLife > 0 ? p.life / p.maxLife : 0;
            const newMaxLife = p.baseLife * newSettings.smellLifeMul;
            p.maxLife = newMaxLife;
            p.life = lifeFraction * newMaxLife;
        }

        for (const p of state.paw) {
            if (p.baseLife === undefined) continue;
            const lifeFraction = p.maxLife > 0 ? p.life / p.maxLife : 0;
            const newMaxLife = p.baseLife * newSettings.pawLifeMul;
            if (newMaxLife <= 0) { p.life = 0; continue; }
            p.maxLife = newMaxLife;
            p.life = lifeFraction * newMaxLife;
        }
    }
}

if (weatherPanel) {
    weatherPanel.querySelectorAll('.weather-btn').forEach(btn => {
        btn.addEventListener('click', () => setWeather(btn.dataset.weather));
    });
}

// ============================================
// ВРЕМЯ СУТОК + СВЕТЛЯЧКИ
// ============================================
let currentTime = 'day';

const FIREFLY_COUNT = 40;
const fireflies = [];

function createFirefly(worldW, worldH) {
    return {
        x: Math.random() * worldW,
        y: Math.random() * worldH,
        angle: Math.random() * Math.PI * 2,
        speed: 20 + Math.random() * 30,
        turnSpeed: (Math.random() - 0.5) * 0.8,
        glowPhase: Math.random() * Math.PI * 2,
        glowSpeed: 1.5 + Math.random() * 1.5,
        size: 2 + Math.random() * 2
    };
}

function spawnFirefliesForWorld() {
    const loc = LOCATIONS[currentLocation];
    if (!loc) return;

    fireflies.length = 0;
    for (let i = 0; i < FIREFLY_COUNT; i++) {
        fireflies.push(createFirefly(loc.width, loc.height));
    }
}

function updateFireflies(delta) {
    if (currentTime !== 'night') return;

    const loc = LOCATIONS[currentLocation];
    if (!loc) return;

    for (const f of fireflies) {
        f.angle += f.turnSpeed * delta;

        f.x += Math.cos(f.angle) * f.speed * delta;
        f.y += Math.sin(f.angle) * f.speed * delta;

        if (f.x < 50) { f.x = 50; f.angle = Math.PI - f.angle; }
        if (f.x > loc.width - 50) { f.x = loc.width - 50; f.angle = Math.PI - f.angle; }
        if (f.y < 50) { f.y = 50; f.angle = -f.angle; }
        if (f.y > loc.height - 50) { f.y = loc.height - 50; f.angle = -f.angle; }

        f.glowPhase += f.glowSpeed * delta;
    }
}

function drawFireflies() {
    if (currentTime !== 'night') return;

    for (const f of fireflies) {
        const glow = 0.5 + 0.5 * Math.sin(f.glowPhase);
        const alpha = 0.4 + glow * 0.6;

        const radius = f.size * 4;
        const grad = smellFgCtx.createRadialGradient(f.x, f.y, 0, f.x, f.y, radius);
        grad.addColorStop(0, `rgba(255, 255, 150, ${alpha})`);
        grad.addColorStop(0.4, `rgba(255, 240, 100, ${alpha * 0.6})`);
        grad.addColorStop(1, `rgba(200, 180, 50, 0)`);

        smellFgCtx.fillStyle = grad;
        smellFgCtx.beginPath();
        smellFgCtx.arc(f.x, f.y, radius, 0, Math.PI * 2);
        smellFgCtx.fill();

        smellFgCtx.fillStyle = `rgba(255, 255, 200, ${alpha})`;
        smellFgCtx.beginPath();
        smellFgCtx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
        smellFgCtx.fill();
    }
}

function setTime(timeKey) {
    if (timeKey !== 'day' && timeKey !== 'night') return;

    currentTime = timeKey;

    document.querySelectorAll('.time-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.time === timeKey);
    });

    nightOverlay.className = '';
    if (timeKey === 'night') {
        nightOverlay.classList.add('night');
        if (fireflies.length === 0) {
            spawnFirefliesForWorld();
        }
    } else {
        fireflies.length = 0;
    }
}

if (timePanel) {
    timePanel.querySelectorAll('.time-btn').forEach(btn => {
        btn.addEventListener('click', () => setTime(btn.dataset.time));
    });
}

// ============================================
// ДАННЫЕ КОТА
// ============================================
const defaultCat = {
    bodyColor: '#b8825a',
    pattern: 'none',
    patternColor: '#2a2a2a',
    patternOpacity: 100
};

let catData = { ...defaultCat };

try {
    const saved = localStorage.getItem('starClan_cat');
    if (saved) catData = { ...defaultCat, ...JSON.parse(saved) };
} catch (e) {
    console.warn('Не удалось прочитать кота:', e);
}

// ============================================
// ЗАГРУЗКА КАРТИНОК КОТА
// ============================================
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Не загрузилось: ' + src));
        img.src = src;
    });
}

async function loadAllCatImages() {
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
        drawCatShape();
    } catch (e) {
        console.error('Ошибка загрузки картинок кота:', e);
        catCtx.fillStyle = '#b8825a';
        catCtx.beginPath();
        catCtx.arc(100, 100, 60, 0, Math.PI * 2);
        catCtx.fill();
    }
}

// ============================================
// ОКРАСКА СЛОЯ
// ============================================
function drawColoredLayer(image, color) {
    const tmp = document.createElement('canvas');
    tmp.width = catCanvas.width;
    tmp.height = catCanvas.height;
    const tmpCtx = tmp.getContext('2d');

    tmpCtx.drawImage(image, 0, 0, tmp.width, tmp.height);
    tmpCtx.globalCompositeOperation = 'source-in';
    tmpCtx.fillStyle = color;
    tmpCtx.fillRect(0, 0, tmp.width, tmp.height);

    return tmp;
}

function drawCatShape() {
    if (!images.base) return;

    catCtx.clearRect(0, 0, catCanvas.width, catCanvas.height);

    const coloredBase = drawColoredLayer(images.base, catData.bodyColor);
    catCtx.drawImage(coloredBase, 0, 0);

    if (catData.pattern !== 'none') {
        const patternImg = catData.pattern === 'spots' ? images.spots : images.stripes;
        if (patternImg) {
            const coloredPattern = drawColoredLayer(patternImg, catData.patternColor);
            catCtx.save();
            catCtx.globalAlpha = (catData.patternOpacity || 100) / 100;
            catCtx.drawImage(coloredPattern, 0, 0);
            catCtx.restore();
        }
    }

    if (images.line) {
        catCtx.drawImage(images.line, 0, 0, catCanvas.width, catCanvas.height);
    }
}

// ============================================
// ПРИМЕНИТЬ ЛОКАЦИЮ
// ============================================
function applyLocation(key) {
    const loc = LOCATIONS[key];
    if (!loc) return;

    currentLocation = key;
    WORLD.width = loc.width;
    WORLD.height = loc.height;

    worldEl.style.width = WORLD.width + 'px';
    worldEl.style.height = WORLD.height + 'px';

    bgLayer.style.width = WORLD.width + 'px';
    bgLayer.style.height = WORLD.height + 'px';
    bgLayer.style.backgroundImage = `url('${loc.bg}')`;

    fgLayer.style.width = WORLD.width + 'px';
    fgLayer.style.height = WORLD.height + 'px';
    if (loc.fg) {
        fgLayer.style.backgroundImage = `url('${loc.fg}')`;
        fgLayer.style.display = 'block';
    } else {
        fgLayer.style.backgroundImage = 'none';
        fgLayer.style.display = 'none';
    }

    smellLayer.width = WORLD.width;
    smellLayer.height = WORLD.height;
    smellLayer.style.width = WORLD.width + 'px';
    smellLayer.style.height = WORLD.height + 'px';
    smellLayer.style.position = 'absolute';
    smellLayer.style.top = '0';
    smellLayer.style.left = '0';

    smellFgLayer.width = WORLD.width;
    smellFgLayer.height = WORLD.height;
    smellFgLayer.style.width = WORLD.width + 'px';
    smellFgLayer.style.height = WORLD.height + 'px';
    smellFgLayer.style.position = 'absolute';
    smellFgLayer.style.top = '0';
    smellFgLayer.style.left = '0';

    if (loc.mouse) {
        mouseEl.style.display = 'block';
        mouseEl.style.left = (loc.mouse.x - 60) + 'px';
        mouseEl.style.top  = (loc.mouse.y - 60) + 'px';
        mouseEl.dataset.x = loc.mouse.x;
        mouseEl.dataset.y = loc.mouse.y;

        currentSmellSource = {
            label: loc.mouse.label || 'источник',
            x: loc.mouse.x,
            y: loc.mouse.y
        };
    } else {
        mouseEl.style.display = 'none';
        currentSmellSource = null;
    }

    hideSmellLabel();
}

// ============================================
// ПОЗИЦИЯ И КАМЕРА
// ============================================
const catPos = { x: 0, y: 0 };
let catDirection = 1;
const CAT_SIZE = 200;
const BASE_SPEED = 350;
const FAST_MULTIPLIER = 1.8;

const WORLD = { width: 4000, height: 4000 };
const camera = { x: 0, y: 0 };

function updateCatPosition() {
    catCanvas.style.left = (catPos.x - CAT_SIZE / 2) + 'px';
    catCanvas.style.top  = (catPos.y - CAT_SIZE / 2) + 'px';
}

function applyDirection() {
    catCanvas.style.transform = catDirection === 1 ? 'scaleX(1)' : 'scaleX(-1)';
}

function updateCamera() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let camX = catPos.x - vw / 2;
    let camY = catPos.y - vh / 2;

    camX = Math.max(0, Math.min(WORLD.width - vw, camX));
    camY = Math.max(0, Math.min(WORLD.height - vh, camY));

    if (WORLD.width < vw) camX = (WORLD.width - vw) / 2;
    if (WORLD.height < vh) camY = (WORLD.height - vh) / 2;

    camera.x = camX;
    camera.y = camY;

    worldEl.style.transform = `translate(${-camX}px, ${-camY}px)`;
    worldFgWrapper.style.transform = `translate(${-camX}px, ${-camY}px)`;
}

// ============================================
// РЕЖИМ «ПРИНЮХАТЬСЯ»
// ============================================
let sniffing = false;

const SMELL_SPAWN_INTERVAL = 1.0;
const SMELL_LIFE = 30;

const CAT_TRAIL_INTERVAL = 0.6;
const CAT_TRAIL_LIFE = 8;
const CAT_TRAIL_FADE_START = 5;

const PAW_INTERVAL = 0.4;
const PAW_LIFE = 600;
const PAW_MAX = 400;

function toggleSniff() {
    sniffing = !sniffing;

    bgLayer.classList.toggle('sniffing', sniffing);
    catCanvas.classList.toggle('sniffing', sniffing);
    fgLayer.classList.toggle('sniffing', sniffing);
    mouseEl.classList.toggle('sniffing', sniffing);
    sniffIndicator.classList.toggle('visible', sniffing);

    if (!sniffing) {
        hideSmellLabel();
    }
}

function spawnSmellParticle() {
    if (!currentSmellSource) return;

    const settings = WEATHER_SETTINGS[currentWeather];

    const mx = currentSmellSource.x;
    const my = currentSmellSource.y;

    const w = getWindVector();

    const randomAngle = Math.random() * Math.PI * 2;
    const randomSpeed = 150 + Math.random() * 150;

    let vx = Math.cos(randomAngle) * randomSpeed;
    let vy = Math.sin(randomAngle) * randomSpeed;

    const gustMultiplier = 1.2;
    vx += w.vx * gustMultiplier;
    vy += w.vy * gustMultiplier;

    const baseRadius = 8 + Math.random() * 10;
    const baseLife = SMELL_LIFE;
    const life = baseLife * settings.smellLifeMul;

    smellParticles.push({
        x: mx, y: my, vx, vy,
        life, maxLife: life, baseLife,
        radius: baseRadius,
        label: currentSmellSource.label,
        alphaMul: settings.smellAlphaMul
    });
}

function spawnCatTrailParticle() {
    const offsetX = (Math.random() - 0.5) * 40;
    const offsetY = (Math.random() - 0.5) * 40;

    const w = getWindVector();
    const windFactor = 0.15;

    const vx = w.vx * windFactor + (Math.random() - 0.5) * 20;
    const vy = w.vy * windFactor + (Math.random() - 0.5) * 20;

    catTrailParticles.push({
        x: catPos.x + offsetX,
        y: catPos.y + offsetY,
        vx, vy,
        life: CAT_TRAIL_LIFE,
        maxLife: CAT_TRAIL_LIFE,
        radius: 15 + Math.random() * 10
    });
}

function spawnPawParticle() {
    const settings = WEATHER_SETTINGS[currentWeather];
    if (!settings.spawnPaw) return;

    if (pawParticles.length >= PAW_MAX) {
        pawParticles.shift();
    }

    const state = WORLD_STATE[currentLocation];
    const dx = catPos.x - state.lastCatX;
    const dy = catPos.y - state.lastCatY;
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len < 0.1) return;

    const dirX = dx / len;
    const dirY = dy / len;
    const angle = Math.atan2(dirY, dirX);

    const offsetX = -dirX * 30;
    const offsetY = -dirY * 30;

    const baseLife = PAW_LIFE;
    const life = baseLife * settings.pawLifeMul;

    pawParticles.push({
        x: catPos.x + offsetX,
        y: catPos.y + offsetY,
        angle,
        life, maxLife: life, baseLife,
        size: 14 + Math.random() * 6,
        wobble: (Math.random() - 0.5) * 0.3,
        alphaMul: settings.pawAlphaMul
    });
}

function updateLocationParticles(locKey, delta, isActive) {
    const state = WORLD_STATE[locKey];
    if (!state) return;

    const w = getWindVector();

    if (isActive) {
        state.smellTimer += delta;
        while (state.smellTimer >= SMELL_SPAWN_INTERVAL) {
            state.smellTimer -= SMELL_SPAWN_INTERVAL;
            const saved = smellParticles;
            smellParticles = state.smell;
            spawnSmellParticle();
            smellParticles = saved;
        }
    }

    for (let i = state.smell.length - 1; i >= 0; i--) {
        const p = state.smell[i];
        const blend = 0.02;
        p.vx += (w.vx - p.vx) * blend;
        p.vy += (w.vy - p.vy) * blend;
        p.x += p.vx * delta;
        p.y += p.vy * delta;
        p.vx *= 0.995;
        p.vy *= 0.995;
        p.life -= delta;

        if (p.life <= 0 || p.x < -200 || p.x > LOCATIONS[locKey].width + 200 ||
            p.y < -200 || p.y > LOCATIONS[locKey].height + 200) {
            state.smell.splice(i, 1);
        }
    }

    if (isActive) {
        const movedX = catPos.x - state.lastCatX;
        const movedY = catPos.y - state.lastCatY;
        const moved = Math.sqrt(movedX * movedX + movedY * movedY);

        if (moved > 2) {
            state.catTrailTimer += delta;
            while (state.catTrailTimer >= CAT_TRAIL_INTERVAL) {
                state.catTrailTimer -= CAT_TRAIL_INTERVAL;
                const saved = catTrailParticles;
                catTrailParticles = state.trail;
                spawnCatTrailParticle();
                catTrailParticles = saved;
            }
        } else {
            state.catTrailTimer = 0;
        }
    }

    for (let i = state.trail.length - 1; i >= 0; i--) {
        const p = state.trail[i];
        const blend = 0.03;
        p.vx += (w.vx - p.vx) * blend;
        p.vy += (w.vy - p.vy) * blend;
        p.x += p.vx * delta;
        p.y += p.vy * delta;
        p.vx *= 0.99;
        p.vy *= 0.99;
        p.life -= delta;

        if (p.life <= 0 || p.x < -200 || p.x > LOCATIONS[locKey].width + 200 ||
            p.y < -200 || p.y > LOCATIONS[locKey].height + 200) {
            state.trail.splice(i, 1);
        }
    }

    if (isActive) {
        const movedX = catPos.x - state.lastCatX;
        const movedY = catPos.y - state.lastCatY;
        const moved = Math.sqrt(movedX * movedX + movedY * movedY);

        if (moved > 2) {
            state.pawTimer += delta;
            while (state.pawTimer >= PAW_INTERVAL) {
                state.pawTimer -= PAW_INTERVAL;
                const saved = pawParticles;
                pawParticles = state.paw;
                spawnPawParticle();
                pawParticles = saved;
            }
        } else {
            state.pawTimer = 0;
        }
    }

    for (let i = state.paw.length - 1; i >= 0; i--) {
        const p = state.paw[i];
        p.life -= delta;
        if (p.life <= 0) state.paw.splice(i, 1);
    }

    if (isActive) {
        state.lastCatX = catPos.x;
        state.lastCatY = catPos.y;
    }
}

function drawSmellParticles() {
    smellCtx.clearRect(0, 0, smellLayer.width, smellLayer.height);
    smellFgCtx.clearRect(0, 0, smellFgLayer.width, smellFgLayer.height);

    if (!sniffing) return;

    if (mouseEl && mouseEl.style.display !== 'none' && currentSmellSource) {
        const mx = currentSmellSource.x;
        const my = currentSmellSource.y;

        const pulse = 0.85 + 0.15 * Math.sin(wind.time * Math.PI * 1.5);

        const bigRadius = 260 * pulse;
        const bigGrad = smellCtx.createRadialGradient(mx, my, 0, mx, my, bigRadius);
        bigGrad.addColorStop(0, `rgba(255, 80, 80, ${0.45 * pulse})`);
        bigGrad.addColorStop(0.3, `rgba(255, 40, 40, ${0.28 * pulse})`);
        bigGrad.addColorStop(0.7, `rgba(220, 20, 20, ${0.12 * pulse})`);
        bigGrad.addColorStop(1, `rgba(180, 10, 10, 0)`);
        smellCtx.fillStyle = bigGrad;
        smellCtx.beginPath();
        smellCtx.arc(mx, my, bigRadius, 0, Math.PI * 2);
        smellCtx.fill();

        const midRadius = 130 * pulse;
        const midGrad = smellCtx.createRadialGradient(mx, my, 0, mx, my, midRadius);
        midGrad.addColorStop(0, `rgba(255, 120, 120, ${0.8 * pulse})`);
        midGrad.addColorStop(0.4, `rgba(255, 50, 50, ${0.5 * pulse})`);
        midGrad.addColorStop(1, `rgba(200, 20, 20, 0)`);
        smellCtx.fillStyle = midGrad;
        smellCtx.beginPath();
        smellCtx.arc(mx, my, midRadius, 0, Math.PI * 2);
        smellCtx.fill();

        const coreRadius = 60 * pulse;
        const coreGrad = smellCtx.createRadialGradient(mx, my, 0, mx, my, coreRadius);
        coreGrad.addColorStop(0, `rgba(255, 200, 200, ${0.95 * pulse})`);
        coreGrad.addColorStop(0.5, `rgba(255, 60, 60, ${0.7 * pulse})`);
        coreGrad.addColorStop(1, `rgba(255, 30, 30, 0)`);
        smellCtx.fillStyle = coreGrad;
        smellCtx.beginPath();
        smellCtx.arc(mx, my, coreRadius, 0, Math.PI * 2);
        smellCtx.fill();
    }

    for (const p of smellParticles) {
        const fadeStart = p.maxLife * 0.75;
        let alpha;
        if (p.life >= fadeStart) {
            alpha = 1;
        } else {
            alpha = p.life / fadeStart;
        }

        const weatherMul = p.alphaMul !== undefined ? p.alphaMul : 1;
        const finalAlpha = alpha * weatherMul;

        const r = p.radius * (0.5 + alpha * 0.5);

        const gradient = smellFgCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        gradient.addColorStop(0, `rgba(255, 60, 60, ${finalAlpha})`);
        gradient.addColorStop(0.7, `rgba(220, 30, 30, ${finalAlpha * 0.6})`);
        gradient.addColorStop(1, `rgba(180, 20, 20, 0)`);

        smellFgCtx.fillStyle = gradient;
        smellFgCtx.beginPath();
        smellFgCtx.arc(p.x, p.y, r, 0, Math.PI * 2);
        smellFgCtx.fill();
    }
}

function drawCatTrail() {
    if (!sniffing) return;

    for (const p of catTrailParticles) {
        let alpha;
        if (p.life >= CAT_TRAIL_FADE_START) {
            alpha = 1;
        } else {
            alpha = p.life / CAT_TRAIL_FADE_START;
        }

        const drawAlpha = alpha * 0.35;
        const r = p.radius * (0.7 + alpha * 0.3);

        const gradient = smellCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        gradient.addColorStop(0, `rgba(120, 180, 255, ${drawAlpha})`);
        gradient.addColorStop(0.5, `rgba(80, 140, 220, ${drawAlpha * 0.6})`);
        gradient.addColorStop(1, `rgba(50, 100, 180, 0)`);

        smellCtx.fillStyle = gradient;
        smellCtx.beginPath();
        smellCtx.arc(p.x, p.y, r, 0, Math.PI * 2);
        smellCtx.fill();
    }
}

function drawPaws() {
    if (!sniffing) return;

    for (const p of pawParticles) {
        const fadeStart = p.maxLife * 0.9;
        let alpha;
        if (p.life >= fadeStart) {
            alpha = 1;
        } else {
            alpha = p.life / fadeStart;
        }

        const ageFactor = p.maxLife > 0 ? p.life / p.maxLife : 0;
        const ageAlpha = 0.4 + ageFactor * 0.6;

        const weatherMul = p.alphaMul !== undefined ? p.alphaMul : 1;
        const drawAlpha = alpha * ageAlpha * 0.85 * weatherMul;

        if (drawAlpha < 0.01) continue;

        const size = p.size;

        smellCtx.save();
        smellCtx.translate(p.x, p.y);
        smellCtx.rotate(p.angle + p.wobble);

        smellCtx.beginPath();
        smellCtx.moveTo(-size * 0.5, -size * 0.55);
        smellCtx.lineTo(size * 0.5, 0);
        smellCtx.lineTo(-size * 0.5, size * 0.55);

        smellCtx.strokeStyle = `rgba(140, 200, 255, ${drawAlpha})`;
        smellCtx.lineWidth = 4;
        smellCtx.lineCap = 'round';
        smellCtx.lineJoin = 'round';

        smellCtx.shadowColor = `rgba(80, 160, 255, ${drawAlpha * 0.7})`;
        smellCtx.shadowBlur = 8;

        smellCtx.stroke();

        smellCtx.restore();
    }
}

const NOSE_OFFSET_X = 60;
const NOSE_OFFSET_Y = -10;
const NOSE_TOUCH_RADIUS = 30;

function getNosePosition() {
    return {
        x: catPos.x + catDirection * NOSE_OFFSET_X,
        y: catPos.y + NOSE_OFFSET_Y
    };
}

let currentLabelText = '';
let currentLabelParticle = null;

function checkNoseTouch() {
    if (!sniffing) {
        hideSmellLabel();
        return;
    }

    const nose = getNosePosition();

    let closest = null;
    let closestDist = Infinity;

    for (const p of smellParticles) {
        const dx = p.x - nose.x;
        const dy = p.y - nose.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < NOSE_TOUCH_RADIUS && dist < closestDist) {
            closest = p;
            closestDist = dist;
        }
    }

    if (closest) {
        const p = closest;
        const fadeStart = p.maxLife * 0.75;
        let lifeAlpha;
        if (p.life >= fadeStart) {
            lifeAlpha = 1;
        } else {
            lifeAlpha = p.life / fadeStart;
        }
        const weatherMul = p.alphaMul !== undefined ? p.alphaMul : 1;
        const finalAlpha = lifeAlpha * weatherMul;

        if (finalAlpha < 0.3) {
            currentLabelParticle = null;
            hideSmellLabel();
            return;
        }

        currentLabelParticle = closest;
        showSmellLabel(closest);
    } else {
        currentLabelParticle = null;
        hideSmellLabel();
    }
}

function showSmellLabel(particle) {
    if (!smellLabel) return;

    const text = '👃 ' + (particle.label || 'запах');
    if (currentLabelText !== text) {
        smellLabel.textContent = text;
        currentLabelText = text;
    }

    smellLabel.style.left = particle.x + 'px';
    smellLabel.style.top = (particle.y - 20) + 'px';
    smellLabel.classList.add('visible');
}

function hideSmellLabel() {
    if (!smellLabel) return;
    smellLabel.classList.remove('visible');
    currentLabelText = '';
    currentLabelParticle = null;
}

const wind = { angle: 0, strength: 0.5, time: 0 };

const windPhase = {
    a1: Math.random() * Math.PI * 2,
    a2: Math.random() * Math.PI * 2,
    a3: Math.random() * Math.PI * 2,
    s1: Math.random() * Math.PI * 2,
    s2: Math.random() * Math.PI * 2,
    s3: Math.random() * Math.PI * 2
};

const WIND_MAX_PIXELS = 200;

function updateWind(delta) {
    wind.time += delta;
    const t = wind.time;

    const a1 = Math.sin(t / 1800 * Math.PI * 2 + windPhase.a1) * 1.0;
    const a2 = Math.sin(t / 900  * Math.PI * 2 + windPhase.a2) * 0.15;
    const a3 = Math.sin(t / 300  * Math.PI * 2 + windPhase.a3) * 0.05;

    const rawAngle = (a1 + a2 + a3) * Math.PI;
    wind.angle = ((rawAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

    const s1 = Math.sin(t / 2400 * Math.PI * 2 + windPhase.s1) * 0.5;
    const s2 = Math.sin(t / 1200 * Math.PI * 2 + windPhase.s2) * 0.3;
    const s3 = Math.sin(t / 400  * Math.PI * 2 + windPhase.s3) * 0.2;

    const rawStrength = (s1 + s2 + s3) * 0.5 + 0.5;
    wind.strength = Math.max(0.15, Math.min(1, rawStrength));

    updateWindIndicator();
}

function updateWindIndicator() {
    if (!windArrow || !windSpeedEl) return;

    const deg = (wind.angle * 180 / Math.PI) + 90;
    windArrow.style.transform = `rotate(${deg}deg)`;
    windArrow.style.opacity = 0.4 + wind.strength * 0.6;
    windSpeedEl.textContent = (wind.strength * WIND_MAX_PIXELS).toFixed(0) + ' px/s';
}

function getWindVector() {
    return {
        vx: Math.cos(wind.angle) * wind.strength * WIND_MAX_PIXELS,
        vy: Math.sin(wind.angle) * wind.strength * WIND_MAX_PIXELS
    };
}

const keys = {
    KeyW: false, KeyA: false, KeyS: false, KeyD: false,
    ShiftLeft: false, ShiftRight: false
};

function handleKeyDown(e) {
    if (e.repeat) return;
    const code = e.code;

    if (code in keys) {
        keys[code] = true;
        if (code.startsWith('Key')) e.preventDefault();
    }

    if (code === 'KeyQ') {
        e.preventDefault();
        toggleSniff();
    }
}

function handleKeyUp(e) {
    const code = e.code;
    if (code in keys) keys[code] = false;
}

document.addEventListener('keydown', handleKeyDown);
document.addEventListener('keyup', handleKeyUp);

window.addEventListener('blur', () => {
    Object.keys(keys).forEach(k => keys[k] = false);
});

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        Object.keys(keys).forEach(k => keys[k] = false);
    }
});

window.addEventListener('resize', updateCamera);

let transitionCooldown = 0;

function switchLocation() {
    WORLD_STATE[currentLocation].catX = catPos.x;
    WORLD_STATE[currentLocation].catY = catPos.y;

    let newLocation;
    if (currentLocation === 'forest') {
        newLocation = 'cave';
    } else {
        newLocation = 'forest';
    }

    catPos.x = WORLD_STATE[newLocation].catX;
    catPos.y = WORLD_STATE[newLocation].catY;

    applyLocation(newLocation);

    smellParticles    = WORLD_STATE[newLocation].smell;
    catTrailParticles = WORLD_STATE[newLocation].trail;
    pawParticles      = WORLD_STATE[newLocation].paw;

    WORLD_STATE[newLocation].lastCatX = catPos.x;
    WORLD_STATE[newLocation].lastCatY = catPos.y;

    if (currentTime === 'night') {
        spawnFirefliesForWorld();
    }

    transitionCooldown = 1.0;
}

let lastTime = performance.now();

function gameLoop(now) {
    const delta = (now - lastTime) / 1000;
    lastTime = now;

    updateWind(delta);

    if (transitionCooldown > 0) transitionCooldown -= delta;

    let moveX = 0;
    let moveY = 0;

    if (keys.KeyA) moveX -= 1;
    if (keys.KeyD) moveX += 1;
    if (keys.KeyW) moveY -= 1;
    if (keys.KeyS) moveY += 1;

    if (moveX !== 0 && moveY !== 0) {
        const len = Math.sqrt(moveX * moveX + moveY * moveY);
        moveX /= len;
        moveY /= len;
    }

    const isShift = keys.ShiftLeft || keys.ShiftRight;
    const currentSpeed = BASE_SPEED * (isShift ? FAST_MULTIPLIER : 1);

    if (moveX !== 0 || moveY !== 0) {
        catPos.x += moveX * currentSpeed * delta;
        catPos.y += moveY * currentSpeed * delta;

        catPos.x = Math.max(CAT_SIZE / 2, Math.min(WORLD.width - CAT_SIZE / 2, catPos.x));
        catPos.y = Math.max(CAT_SIZE / 2, Math.min(WORLD.height - CAT_SIZE / 2, catPos.y));

        if (moveX > 0 && catDirection !== -1) {
            catDirection = -1;
            applyDirection();
        } else if (moveX < 0 && catDirection !== 1) {
            catDirection = 1;
            applyDirection();
        }
    }

    if (transitionCooldown <= 0) {
        const EDGE = 20;

        if (currentLocation === 'forest') {
            const atLeftTop =
                catPos.x <= CAT_SIZE / 2 + EDGE &&
                catPos.y <= CAT_SIZE / 2 + EDGE &&
                keys.KeyA && keys.KeyW;
            if (atLeftTop) switchLocation();
        } else {
            const atRightBottom =
                catPos.x >= WORLD.width - CAT_SIZE / 2 - EDGE &&
                catPos.y >= WORLD.height - CAT_SIZE / 2 - EDGE &&
                keys.KeyD && keys.KeyS;
            if (atRightBottom) switchLocation();
        }
    }

    for (const locKey in WORLD_STATE) {
        updateLocationParticles(locKey, delta, locKey === currentLocation);
    }

    updateFireflies(delta);

    drawSmellParticles();
    drawCatTrail();
    drawPaws();
    drawFireflies();

    if (sniffing) {
        checkNoseTouch();
    }

    updateCatPosition();
    updateCamera();

    requestAnimationFrame(gameLoop);
}

console.log('Игра запущена');

catPos.x = WORLD_STATE.forest.catX;
catPos.y = WORLD_STATE.forest.catY;

WORLD_STATE.forest.lastCatX = catPos.x;
WORLD_STATE.forest.lastCatY = catPos.y;

applyLocation('forest');

smellParticles    = WORLD_STATE.forest.smell;
catTrailParticles = WORLD_STATE.forest.trail;
pawParticles      = WORLD_STATE.forest.paw;

updateCatPosition();
updateCamera();
applyDirection();
loadAllCatImages();
updateWindIndicator();
setWeather('clear');
setTime('day');
requestAnimationFrame(gameLoop);
