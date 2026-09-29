// ============================================
// Главный файл сервера Be Wild
// ============================================

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// --- Создаём Express-приложение ---
const app = express();

// --- Оборачиваем в HTTP-сервер (для Socket.IO) ---
const server = http.createServer(app);

// --- Прикрепляем Socket.IO ---
const io = new Server(server);

// --- Разрешаем серверу читать JSON из тела запросов ---
app.use(express.json());

// --- Отдаём файлы из папки client ---
app.use(express.static(path.join(__dirname, '..', 'client')));

// --- Главная страница ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
});

// --- Тестовый эндпоинт ---
app.get('/api/ping', (req, res) => {
    res.json({ ok: true, message: 'Сервер работает!' });
});

// --- Socket.IO: обработка подключений ---
io.on('connection', (socket) => {
    console.log('🔌 Новый игрок подключился:', socket.id);

    socket.on('disconnect', () => {
        console.log('❌ Игрок отключился:', socket.id);
    });
});

// --- Запускаем сервер ---
// ВАЖНО: process.env.PORT нужен для деплоя в облако (Render)
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`✅ Сервер запущен: http://localhost:${PORT}`);
});