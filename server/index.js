// ============================================
// Главный файл сервера Be Wild с мультиплеером
// ============================================

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// --- Создаём Express-приложение ---
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// --- Middleware ---
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'client')));

// --- Главная страница ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
});

// --- Тестовый эндпоинт ---
app.get('/api/ping', (req, res) => {
    res.json({ ok: true, message: 'Сервер работает!' });
});

// ============================================
// ИГРОВОЕ СОСТОЯНИЕ (в памяти)
// ============================================
// Структура: Map<socketId, playerData>
const players = new Map();

// ============================================
// SOCKET.IO — ОБРАБОТКА ПОДКЛЮЧЕНИЙ
// ============================================
io.on('connection', (socket) => {
    console.log('🔌 Подключение:', socket.id);

    // ============================================
    // Игрок заходит в игру (после входа/регистрации)
    // ============================================
    socket.on('player:join', (data) => {
        // data = { name, bodyColor, pattern, patternColor, location, x, y }
        const player = {
            id: socket.id,
            name: data.name || 'Безымянный',
            bodyColor: data.bodyColor || '#b8825a',
            pattern: data.pattern || 'none',
            patternColor: data.patternColor || '#2a2a2a',
            patternOpacity: data.patternOpacity || 100,
            location: data.location || 'forest',
            x: data.x || 2000,
            y: data.y || 2000,
            direction: 1,
            // Позиция для интерполяции на клиенте
            lastUpdate: Date.now()
        };

        players.set(socket.id, player);

        // Отправляем новому игроку список ВСЕХ существующих игроков
        const others = [];
        for (const [id, p] of players) {
            if (id !== socket.id) {
                others.push(p);
            }
        }
        socket.emit('world:state', { players: others });

        // Сообщаем всем ОСТАЛЬНЫМ, что пришёл новый
        socket.broadcast.emit('player:joined', player);

        console.log(`👤 ${player.name} зашёл (${players.size} онлайн)`);
    });

    // ============================================
    // Игрок двигается
    // ============================================
    socket.on('player:move', (data) => {
        const player = players.get(socket.id);
        if (!player) return;

        // Обновляем позицию
        player.x = data.x;
        player.y = data.y;
        player.direction = data.direction;
        player.location = data.location;
        player.lastUpdate = Date.now();

        // Рассылаем всем ОСТАЛЬНЫМ
        socket.broadcast.emit('player:moved', {
            id: socket.id,
            x: player.x,
            y: player.y,
            direction: player.direction,
            location: player.location
        });
    });

    // ============================================
    // Игрок отключается
    // ============================================
    socket.on('disconnect', () => {
        const player = players.get(socket.id);
        if (player) {
            console.log(`❌ ${player.name} вышел (${players.size - 1} онлайн)`);
            players.delete(socket.id);

            // Сообщаем всем, что игрок ушёл
            socket.broadcast.emit('player:left', { id: socket.id });
        } else {
            console.log('❌ Отключение:', socket.id);
        }
    });
});

// --- Запуск ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`✅ Сервер запущен: http://localhost:${PORT}`);
});
