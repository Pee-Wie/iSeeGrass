function toggleForm() {
    const wrapper = document.getElementById('wrapper');
    const login = document.getElementById('loginForm');
    const register = document.getElementById('registerForm');
    wrapper.classList.toggle('active');

    if (wrapper.classList.contains('active')) {
      login.style.display = "none";
      register.style.display = "block";
    } else {
      login.style.display = "block";
      register.style.display = "none";
    }
  }

  function openSignupModal() {
    const modal = document.getElementById('signupModal');
    const formContainer = document.getElementById('signupFormContainer');
    
    // Fetch signup form from signup.html
    fetch('./signup.html')
      .then(response => response.text())
      .then(html => {
        // Extract form content from the fetched HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const formContent = doc.querySelector('.form-container').innerHTML;
        formContainer.innerHTML = formContent;
        modal.classList.add('active');
      })
      .catch(error => {
        console.error('Error loading signup form:', error);
        formContainer.innerHTML = '<p style="color: red;">Error loading form. Please try again.</p>';
        modal.classList.add('active');
      });
  }

  function closeSignupModal() {
    const modal = document.getElementById('signupModal');
    modal.classList.remove('active');
  }

  function requestForm() {
    openSignupModal();
  }

  function toggleLoginAuthFields() {
  var authOtp = document.getElementById('authOtp');
  var isOtp = authOtp ? authOtp.checked : false;
  var loginPasswordBox = document.getElementById('loginPasswordBox');
  var loginOtpBox = document.getElementById('loginOtpBox');
  if (loginPasswordBox) loginPasswordBox.style.display = isOtp ? 'none' : 'block';
  if (loginOtpBox) loginOtpBox.style.display = isOtp ? 'block' : 'none';
  var passwordInput = document.querySelector('#loginPasswordBox input[name="password"]');
  var otpInput = document.querySelector('#loginOtpBox input[name="otp"]');
  if (passwordInput) passwordInput.required = !isOtp;
  if (otpInput) otpInput.required = isOtp;
}

window.addEventListener('DOMContentLoaded', function() {
  var authOtp = document.getElementById('authOtp');
  if (authOtp) {
    authOtp.checked = false;
  }
  toggleLoginAuthFields();

  // Close modal when clicking on overlay
  const modal = document.getElementById('signupModal');
  if (modal) {
    modal.addEventListener('click', function(event) {
      if (event.target === modal) {
        closeSignupModal();
      }
    });
  }
});