// Хранилище пользователей в localStorage.
// Пока это "игрушечный" вариант, потом переделаем на сервер.

const STORAGE_KEY = 'starClan_users';

function loadUsers() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    try {
        return JSON.parse(raw);
    } catch (e) {
        console.warn('Ошибка чтения пользователей:', e);
        return {};
    }
}

function saveUsers(users) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

function registerUser(email, password, name, gender, clan) {
    const users = loadUsers();
    if (users[email]) {
        return { ok: false, error: 'Такой email уже зарегистрирован' };
    }

    // Расшифровка племени (для отображения)
    const clanLabels = {
        river:   'Речное племя',
        thunder: 'Грозовое племя',
        shadow:  'Племя Теней',
        wind:    'Племя Ветра'
    };

    users[email] = {
        password: password,
        player: {
            name: name,
            gender: gender,
            clan: clan,
            clanLabel: clanLabels[clan] || 'Речное племя'
        }
    };
    saveUsers(users);
    return { ok: true };
}

function loginUser(email, password) {
    const users = loadUsers();
    const user = users[email];
    if (!user) return { ok: false, error: 'Пользователь не найден' };
    if (user.password !== password) return { ok: false, error: 'Неверный пароль' };
    return { ok: true, player: user.player };
}