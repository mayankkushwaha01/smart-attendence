class LoginSystem {
    constructor() {
        this.users = {
            student: { username: 'john123', password: 'pass123', name: 'John Smith', id: 'ST001', course: 'BCA' },
            teacher: { username: 'admin', password: 'admin123', name: 'Dr. Johnson' }
        };
        this.registeredUsers = JSON.parse(localStorage.getItem('registeredUsers')) || [];
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('registerForm').addEventListener('submit', (e) => this.handleRegister(e));
        document.getElementById('loginToggle').addEventListener('click', () => this.showForm('login'));
        document.getElementById('registerToggle').addEventListener('click', () => this.showForm('register'));

    }

    showForm(type) {
        // Update toggle buttons
        document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(type + 'Toggle').classList.add('active');
        
        // Update forms
        document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
        document.getElementById(type + 'Form').classList.add('active');
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const role = document.querySelector('input[name="role"]:checked').value;

        // Teacher login
        if (role === 'teacher' && username === 'admin' && password === 'admin123') {
            sessionStorage.setItem('currentUser', JSON.stringify({
                role: 'teacher',
                username: 'admin',
                name: 'Dr. Johnson'
            }));
            window.location.href = 'index.html';
            return;
        }

        // Student login
        if (role === 'student') {
            let user = null;
            
            // Try Firebase first
            try {
                if (window.firebaseDB && window.firebaseRef && window.firebaseGet) {
                    const usersRef = window.firebaseRef(window.firebaseDB, 'users');
                    const snapshot = await window.firebaseGet(usersRef);
                    const users = snapshot.val() || {};
                    user = Object.values(users).find(u => u.username === username && u.password === password);
                }
            } catch (error) {
                console.log('Firebase login failed, trying localStorage:', error);
            }
            
            // Fallback to localStorage
            if (!user) {
                user = this.registeredUsers.find(u => u.username === username && u.password === password);
            }
            
            if (user) {
                sessionStorage.setItem('currentUser', JSON.stringify({
                    role: 'student',
                    ...user
                }));
                window.location.href = 'student-dashboard.html';
                return;
            }
            
            // Check default student
            if (username === 'john123' && password === 'pass123') {
                sessionStorage.setItem('currentUser', JSON.stringify({
                    role: 'student',
                    username: 'john123',
                    name: 'John Smith',
                    id: 'ST001',
                    course: 'BCA'
                }));
                window.location.href = 'student-dashboard.html';
                return;
            }
        }
        
        this.showError('Invalid username or password!', 'login');
    }

    async handleRegister(e) {
        e.preventDefault();
        
        const username = document.getElementById('regUsername').value;
        const name = document.getElementById('regName').value;
        const email = document.getElementById('regEmail').value;
        const course = document.getElementById('regCourse').value;
        const password = document.getElementById('regPassword').value;
        const confirmPassword = document.getElementById('regConfirmPassword').value;

        // Validation
        if (password !== confirmPassword) {
            this.showError('Passwords do not match!', 'register');
            return;
        }

        if (password.length < 6) {
            this.showError('Password must be at least 6 characters!', 'register');
            return;
        }

        // Check if username exists locally first
        if (this.registeredUsers.some(u => u.username === username) || username === 'john123') {
            this.showError('Username already exists!', 'register');
            return;
        }

        // Generate student ID
        const studentId = 'ST' + String(Date.now()).slice(-6);

        // Create new user
        const newUser = {
            username,
            name,
            email,
            course,
            password,
            id: studentId,
            role: 'student',
            registeredAt: new Date().toISOString()
        };

        try {
            // Try to save to Firebase if available
            if (window.firebaseDB && window.firebaseRef && window.firebasePush) {
                const usersRef = window.firebaseRef(window.firebaseDB, 'users');
                await window.firebasePush(usersRef, newUser);
            }
        } catch (error) {
            console.log('Firebase save failed, using localStorage:', error);
        }

        // Always save to localStorage as backup
        this.registeredUsers.push(newUser);
        localStorage.setItem('registeredUsers', JSON.stringify(this.registeredUsers));

        this.showSuccess('Registration successful! You can now login.', 'register');
        
        // Clear form
        document.getElementById('registerForm').reset();
        
        // Switch to login form after 2 seconds
        setTimeout(() => {
            this.showForm('login');
        }, 2000);
    }

    showError(message, formType = 'login') {
        const existingMessage = document.querySelector('.error-message, .success-message');
        if (existingMessage) existingMessage.remove();

        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        
        const form = document.getElementById(formType + 'Form');
        form.appendChild(errorDiv);
        
        setTimeout(() => errorDiv.remove(), 3000);
    }

    showSuccess(message, formType = 'login') {
        const existingMessage = document.querySelector('.error-message, .success-message');
        if (existingMessage) existingMessage.remove();

        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.textContent = message;
        
        const form = document.getElementById(formType + 'Form');
        form.appendChild(successDiv);
        
        setTimeout(() => successDiv.remove(), 3000);
    }


}

document.addEventListener('DOMContentLoaded', () => {
    new LoginSystem();
});