class FilmoSfera {
    constructor() {
        this.apiBase = '../Backend/api.php';
        this.currentUser = null;
        this.currentPage = 'filmy';
        this.init();
    }

    init() {
        this.checkAuth();
        this.setupNavigation();
        this.loadPage();
        this.setupEventListeners();
    }

    async checkAuth() {
        try {
            const userData = localStorage.getItem('currentUser');
            if (userData) {
                this.currentUser = JSON.parse(userData);
                this.updateUI();
            }
        } catch (error) {
            console.error('Błąd autoryzacji:', error);
        }
    }

    setupNavigation() {
        // Obsługa linków nawigacyjnych
        document.addEventListener('click', (e) => {
            if (e.target.matches('a[data-page]')) {
                e.preventDefault();
                this.navigateTo(e.target.getAttribute('data-page'));
            }
        });

        // Obsługa przycisków akcji
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-action]')) {
                const action = e.target.getAttribute('data-action');
                this.handleAction(action, e.target);
            }
        });

        // Obsługa formularzy
        document.addEventListener('submit', (e) => {
            e.preventDefault();
            if (e.target.matches('form')) {
                const formType = e.target.getAttribute('data-form');
                this.handleFormSubmit(formType, e.target);
            }
        });
    }

    navigateTo(page) {
        this.currentPage = page;
        this.loadPage();
    }

    async loadPage() {
        this.hideAllPages();
        
        switch(this.currentPage) {
            case 'filmy':
                await this.loadMoviesPage();
                break;
            case 'film':
                await this.loadMovieDetailPage();
                break;
            case 'panel-logowania':
                this.loadLoginPage();
                break;
            case 'profil-uzytkownika':
                await this.loadProfilePage();
                break;
            case 'dodawanie-nowego-filmu':
                this.loadAddMoviePage();
                break;
            default:
                await this.loadMoviesPage();
        }
    }

    hideAllPages() {
        const pages = document.querySelectorAll('.page-section');
        pages.forEach(page => page.classList.add('hidden'));
    }

    async loadMoviesPage() {
        const section = document.getElementById('movies-page');
        section.classList.remove('hidden');
        
        try {
            const response = await this.apiCall('/api/movies', 'GET');
            if (response.success) {
                this.renderMovies(response.movies, section.querySelector('#movies-container'));
            }
        } catch (error) {
            this.showAlert('Błąd ładowania filmów', 'error');
        }
    }

    async loadMovieDetailPage() {
        const section = document.getElementById('movie-detail-page');
        section.classList.remove('hidden');
        
        const urlParams = new URLSearchParams(window.location.search);
        const movieId = urlParams.get('id');
        
        if (movieId) {
            try {
                const response = await this.apiCall(`/api/movie?id=${movieId}`, 'GET');
                if (response.success) {
                    this.renderMovieDetail(response.movie, section);
                }
            } catch (error) {
                this.showAlert('Błąd ładowania filmu', 'error');
            }
        }
    }

    loadLoginPage() {
        const section = document.getElementById('login-page');
        section.classList.remove('hidden');
        
        const loginForm = section.querySelector('#login-form');
        const registerForm = section.querySelector('#register-form');
        
        // Pokazujemy formularz logowania, rejestrację chowamy
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
    }

    async loadProfilePage() {
        if (!this.currentUser) {
            this.navigateTo('panel-logowania');
            return;
        }
        
        const section = document.getElementById('profile-page');
        section.classList.remove('hidden');
        
        section.querySelector('#user-login').textContent = this.currentUser.login;
        
        try {
            const response = await this.apiCall('/api/user-movies', 'GET');
            if (response.success) {
                this.renderUserMovies(response.movies, section.querySelector('#user-movies-container'));
            }
        } catch (error) {
            this.showAlert('Błąd ładowania filmów użytkownika', 'error');
        }
    }

    loadAddMoviePage() {
        if (!this.currentUser) {
            this.navigateTo('panel-logowania');
            return;
        }
        
        const section = document.getElementById('add-movie-page');
        section.classList.remove('hidden');
    }

    renderMovies(movies, container) {
        container.innerHTML = movies.map(movie => `
            <div class="movie-card">
                ${movie.image_path ? `<img src="${movie.image_path}" alt="${movie.title}" class="movie-image">` : 
                  '<div class="movie-image" style="background: #f0f0f0; display: flex; align-items: center; justify-content: center; color: #999;">Brak obrazu</div>'}
                <div class="movie-info">
                    <h3 class="movie-title">${this.escapeHtml(movie.title)}</h3>
                    <p class="movie-description">${this.escapeHtml(movie.description.substring(0, 150))}...</p>
                    <p class="movie-author">Dodane przez: ${this.escapeHtml(movie.author)}</p>
                    <a href="film.html?id=${movie.id}" class="btn btn-primary">Zobacz więcej</a>
                </div>
            </div>
        `).join('');
    }

    renderMovieDetail(movie, container) {
        container.innerHTML = `
            <div class="movie-detail">
                ${movie.image_path ? `<img src="${movie.image_path}" alt="${movie.title}">` : 
                  '<div style="background: #f0f0f0; height: 400px; display: flex; align-items: center; justify-content: center; color: #999; border-radius: 20px;">Brak obrazu</div>'}
                <h1>${this.escapeHtml(movie.title)}</h1>
                <p><strong>Opis:</strong> ${this.escapeHtml(movie.description)}</p>
                <p><strong>Autor:</strong> ${this.escapeHtml(movie.author)}</p>
                <p><strong>Data dodania:</strong> ${new Date(movie.created_at).toLocaleDateString('pl-PL')}</p>
                <a href="filmy.html" class="btn btn-primary" data-page="filmy">Powrót do listy filmów</a>
            </div>
        `;
    }

    renderUserMovies(movies, container) {
        if (movies.length === 0) {
            container.innerHTML = '<p>Nie dodałeś jeszcze żadnych filmów.</p>';
            return;
        }
        
        container.innerHTML = movies.map(movie => `
            <div class="movie-card">
                ${movie.image_path ? `<img src="${movie.image_path}" alt="${movie.title}" class="movie-image">` : 
                  '<div class="movie-image" style="background: #f0f0f0; display: flex; align-items: center; justify-content: center; color: #999;">Brak obrazu</div>'}
                <div class="movie-info">
                    <h3 class="movie-title">${this.escapeHtml(movie.title)}</h3>
                    <p class="movie-description">${this.escapeHtml(movie.description.substring(0, 150))}...</p>
                    <a href="film.html?id=${movie.id}" class="btn btn-primary">Zobacz więcej</a>
                </div>
            </div>
        `).join('');
    }

    async handleAction(action, element) {
        switch(action) {
            case 'logout':
                await this.logout();
                break;
            case 'show-register':
                this.showRegisterForm();
                break;
            case 'show-login':
                this.showLoginForm();
                break;
        }
    }

    async handleFormSubmit(formType, form) {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        switch(formType) {
            case 'login':
                await this.login(data);
                break;
            case 'register':
                await this.register(data);
                break;
            case 'add-movie':
                await this.addMovie(data);
                break;
        }
    }

    async login(data) {
        try {
            const response = await this.apiCall('/api/login', 'POST', data);
            if (response.success) {
                this.currentUser = response.user;
                localStorage.setItem('currentUser', JSON.stringify(response.user));
                this.updateUI();
                this.showAlert('Zalogowano pomyślnie!', 'success');
                this.navigateTo('filmy');
            } else {
                this.showAlert('Błąd logowania! Sprawdź dane.', 'error');
            }
        } catch (error) {
            this.showAlert('Błąd logowania!', 'error');
        }
    }

    async register(data) {
        if (data.password !== data.password_confirm) {
            this.showAlert('Hasła nie są identyczne!', 'error');
            return;
        }

        try {
            const response = await this.apiCall('/api/register', 'POST', data);
            if (response.success) {
                this.showAlert('Rejestracja udana! Możesz się zalogować.', 'success');
                this.showLoginForm();
            } else {
                this.showAlert('Błąd rejestracji! Login lub email już istnieje.', 'error');
            }
        } catch (error) {
            this.showAlert('Błąd rejestracji!', 'error');
        }
    }

    async addMovie(data) {
        try {
            const response = await this.apiCall('/api/movies', 'POST', data);
            if (response.success) {
                this.showAlert('Film dodany pomyślnie!', 'success');
                form.reset();
                this.navigateTo('profil-uzytkownika');
            }
        } catch (error) {
            this.showAlert('Błąd dodawania filmu!', 'error');
        }
    }

    async logout() {
        try {
            await this.apiCall('/api/logout', 'POST');
            this.currentUser = null;
            localStorage.removeItem('currentUser');
            this.updateUI();
            this.showAlert('Wylogowano pomyślnie!', 'success');
            this.navigateTo('filmy');
        } catch (error) {
            console.error('Błąd wylogowania:', error);
        }
    }

    showRegisterForm() {
        document.getElementById('login-form').classList.add('hidden');
        document.getElementById('register-form').classList.remove('hidden');
    }

    showLoginForm() {
        document.getElementById('register-form').classList.add('hidden');
        document.getElementById('login-form').classList.remove('hidden');
    }

    updateUI() {
        const authElements = document.querySelectorAll('[data-auth]');
        const userElements = document.querySelectorAll('[data-user]');

        authElements.forEach(el => {
            el.classList.toggle('hidden', this.currentUser !== null);
        });

        userElements.forEach(el => {
            el.classList.toggle('hidden', this.currentUser === null);
        });

        if (this.currentUser) {
            document.querySelectorAll('[data-user-login]').forEach(el => {
                el.textContent = this.currentUser.login;
            });
        }
    }

    showAlert(message, type) {
        // Usuń istniejące alerty
        const existingAlerts = document.querySelectorAll('.alert');
        existingAlerts.forEach(alert => alert.remove());

        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.textContent = message;
        
        document.querySelector('.container').prepend(alert);
        
        setTimeout(() => {
            alert.remove();
        }, 5000);
    }

    async apiCall(endpoint, method = 'GET', data = null) {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(this.apiBase + endpoint, options);
        return await response.json();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    setupEventListeners() {
        // Globalny event listener dla nawigacji
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (link && link.href && link.href.includes('.html')) {
                e.preventDefault();
                const page = link.getAttribute('href').replace('.html', '');
                this.navigateTo(page);
            }
        });

        // Obsługa przycisku wstecz w przeglądarce
        window.addEventListener('popstate', () => {
            this.loadPage();
        });
    }
}

// Inicjalizacja aplikacji gdy DOM jest gotowy
document.addEventListener('DOMContentLoaded', () => {
    window.filmoSfera = new FilmoSfera();
});