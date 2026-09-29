// ============================================
// Логика экранов регистрации (2 шага) и входа
// ============================================

let step1Data = null;

// --- Сброс регистрации в исходное состояние ---
// ВАЖНО: трогаем ТОЛЬКО формы внутри #screen-register
function resetRegisterForm() {
    const regScreen = document.getElementById('screen-register');
    if (!regScreen) return;

    // Скрыть оба шага регистрации
    regScreen.querySelectorAll('.step-form').forEach(f => f.classList.add('hidden'));
    // Показать шаг 1
    const step1Form = regScreen.querySelector('.step-form[data-step="1"]');
    if (step1Form) step1Form.classList.remove('hidden');

    // Индикатор шага 1
    regScreen.querySelectorAll('.step').forEach(s => {
        s.classList.toggle('active', s.dataset.step === '1');
    });

    // Очистить ошибки ТОЛЬКО внутри регистрации
    regScreen.querySelectorAll('.error').forEach(e => e.textContent = '');

    step1Data = null;
}

// --- Сброс входа ---
// ВАЖНО: трогаем ТОЛЬКО формы внутри #screen-login
function resetLoginForm() {
    const loginScreen = document.getElementById('screen-login');
    if (!loginScreen) return;

    // Показать форму входа (на случай, если её кто-то скрыл)
    loginScreen.querySelectorAll('.step-form').forEach(f => f.classList.remove('hidden'));

    // Очистить поля
    const loginEmail = document.getElementById('login-email');
    const loginPassword = document.getElementById('login-password');
    if (loginEmail) loginEmail.value = '';
    if (loginPassword) loginPassword.value = '';

    // Очистить ошибки
    loginScreen.querySelectorAll('.error').forEach(e => e.textContent = '');
}

// --- Переключение между шагами регистрации ---
function goToStep(step) {
    const regScreen = document.getElementById('screen-register');
    if (!regScreen) return;

    regScreen.querySelectorAll('.step-form').forEach(f => f.classList.add('hidden'));
    const activeForm = regScreen.querySelector(`.step-form[data-step="${step}"]`);
    if (activeForm) activeForm.classList.remove('hidden');

    regScreen.querySelectorAll('.step').forEach(s => {
        s.classList.toggle('active', s.dataset.step === String(step));
    });

    regScreen.querySelectorAll('.error').forEach(e => e.textContent = '');
}

// --- Переключение между экранами ---
function showScreen(name) {
    const regScreen = document.getElementById('screen-register');
    const loginScreen = document.getElementById('screen-login');

    if (name === 'register') {
        resetRegisterForm();
        regScreen.classList.remove('hidden');
        loginScreen.classList.add('hidden');
    } else {
        resetLoginForm();
        loginScreen.classList.remove('hidden');
        regScreen.classList.add('hidden');
    }
}

// --- Кнопки-переключатели ---
const goToLoginBtn = document.getElementById('go-to-login');
const goToRegisterBtn = document.getElementById('go-to-register');

if (goToLoginBtn) {
    goToLoginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showScreen('login');
    });
}

if (goToRegisterBtn) {
    goToRegisterBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showScreen('register');
    });
}

// ============================================
// ШАГ 1: email + пароль
// ============================================
document.getElementById('form-step1').addEventListener('submit', (e) => {
    e.preventDefault();

    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const password2 = document.getElementById('reg-password2').value;
    const errorEl = document.getElementById('step1-error');

    if (!email || !email.includes('@')) {
        errorEl.textContent = '⚠️ Введите корректный email';
        return;
    }
    if (password.length < 6) {
        errorEl.textContent = '⚠️ Пароль должен быть минимум 6 символов';
        return;
    }
    if (password !== password2) {
        errorEl.textContent = '⚠️ Пароли не совпадают';
        return;
    }

    const users = loadUsers();
    if (users[email]) {
        errorEl.textContent = '⚠️ Такой email уже зарегистрирован';
        return;
    }

    step1Data = { email, password };
    goToStep(2);
});

// ============================================
// ШАГ 2: имя + пол + племя
// ============================================
document.getElementById('form-step2').addEventListener('submit', (e) => {
    e.preventDefault();

    if (!step1Data) {
        goToStep(1);
        return;
    }

    const name = document.getElementById('reg-name').value.trim();
    const genderInput = document.querySelector('input[name="reg-gender"]:checked');
    const clan = document.getElementById('reg-clan').value;
    const errorEl = document.getElementById('step2-error');

    if (name.length < 2) {
        errorEl.textContent = '⚠️ Имя должно быть минимум 2 символа';
        return;
    }
    if (!genderInput) {
        errorEl.textContent = '⚠️ Выберите пол';
        return;
    }
    if (!clan) {
        errorEl.textContent = '⚠️ Выберите племя';
        return;
    }

    const result = registerUser(
        step1Data.email,
        step1Data.password,
        name,
        genderInput.value,
        clan
    );

    if (!result.ok) {
        errorEl.textContent = '⚠️ ' + result.error;
        return;
    }

    localStorage.setItem('starClan_currentEmail', step1Data.email);

    const catData = localStorage.getItem('starClan_cat');
    if (!catData) {
        window.location.href = 'constructor.html';
    } else {
        window.location.href = 'game.html';
    }
});

// --- Кнопка "Назад" ---
document.getElementById('back-to-step1').addEventListener('click', () => goToStep(1));

// ============================================
// ВХОД
// ============================================
document.getElementById('form-login').addEventListener('submit', (e) => {
    e.preventDefault();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');

    if (!email || !password) {
        errorEl.textContent = '⚠️ Заполните email и пароль';
        return;
    }

    const result = loginUser(email, password);
    if (!result.ok) {
        errorEl.textContent = '⚠️ ' + result.error;
        return;
    }

    localStorage.setItem('starClan_currentEmail', email);

    const catData = localStorage.getItem('starClan_cat');
    if (!catData) {
        window.location.href = 'constructor.html';
    } else {
        window.location.href = 'game.html';
    }
});