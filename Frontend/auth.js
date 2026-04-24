document.addEventListener('DOMContentLoaded', () => {
    const authForm = document.getElementById('authForm');
    const authTitle = document.getElementById('authTitle');
    const authSubtitle = document.getElementById('authSubtitle');
    const togglePrompt = document.getElementById('toggleText');
    const submitBtn = document.getElementById('submitBtn');
    const nameGroup = document.getElementById('nameGroup');
    const rememberMeLabel = document.getElementById('rememberMeLabel');

    let isLoginMode = true;

    function updateUI() {
        if (isLoginMode) {
            authTitle.textContent = 'Welcome Back';
            authSubtitle.textContent = 'Sign in to continue your session';
            submitBtn.textContent = 'Sign In';
            nameGroup.style.display = 'none';
            rememberMeLabel.style.display = 'block';
            togglePrompt.innerHTML = 'Don\'t have an account? <a href="#" id="toggleAuth">Create an account</a>';
        } else {
            authTitle.textContent = 'Create Account';
            authSubtitle.textContent = 'Join LyricistAI today';
            submitBtn.textContent = 'Sign Up';
            nameGroup.style.display = 'block';
            rememberMeLabel.style.display = 'none';
            togglePrompt.innerHTML = 'Already have an account? <a href="#" id="toggleAuth">Sign In</a>';
        }
        
        // Re-attach listener as innerHTML replaces the element
        document.getElementById('toggleAuth').addEventListener('click', (e) => {
            e.preventDefault();
            isLoginMode = !isLoginMode;
            updateUI();
        });
    }

    // Initial listener attachment
    document.getElementById('toggleAuth').addEventListener('click', (e) => {
        e.preventDefault();
        isLoginMode = !isLoginMode;
        updateUI();
    });

    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userEmail', email);
        
        window.location.href = 'index.html';
    });
});