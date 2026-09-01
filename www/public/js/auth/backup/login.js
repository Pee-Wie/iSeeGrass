function toggleForm() {
    const wrapper = document.getElementById('wrapper');
    const login = document.getElementById('loginForm');
    const forgetForm = document.getElementById('forgetForm');
    const infoTitle = document.getElementById('infoTitle');
    const infoText = document.getElementById('infoText');
    const showForgot = !wrapper.classList.contains('active');

    wrapper.classList.toggle('active', showForgot);

    if (showForgot) {
      login.style.display = "none";
      forgetForm.style.display = "block";
      if (infoTitle) {
        infoTitle.innerHTML = "Reset Access";
      }
      if (infoText) {
        infoText.textContent = "We can help you get back in.";
      }
    } else {
      login.style.display = "block";
      forgetForm.style.display = "none";
      if (infoTitle) {
        infoTitle.innerHTML = '“See It."<br>"Identify It."<br>"Understand It.”';
      }
      if (infoText) {
        infoText.textContent = "Welcome back to iSeeGrass.";
      }
    }
  }

  function getSignupFormHtml() {
    return `
      <div class="form-container">
        <form id="signupFormElem" method="POST" autocomplete="off">
          <div class="input-box">
            <label for="signup-fullname">Full Name:</label>
            <input type="text" name="fullname" id="signup-fullname" placeholder="e.g. Jan Mark Reyes" required />
            <small>Enter your full name</small>
          </div>
          <div class="input-box">
            <label for="signup-username">Username:</label>
            <input type="text" name="username" id="signup-username" placeholder="e.g. JM Reyes" required />
            <small>Choose a unique username</small>
          </div>
          <div class="input-box">
            <label for="signup-email">Email:</label>
            <input type="email" name="email" id="signup-email" placeholder="e.g. jmreyes@example.com" required />
            <small>Enter a valid email address</small>
          </div>
          <div class="input-box">
            <label for="signup-password">Password:</label>
            <input type="password" name="password" id="signup-password" placeholder="Create a strong password" required />
            <small>Minimum 8 characters recommended</small>
          </div>
          <div class="input-box">
            <label for="signup-confirm-password">Confirm Password:</label>
            <input type="password" name="confirm-password" id="signup-confirm-password" placeholder="Confirm your password" required />
            <small>Passwords must match</small>
          </div>
          <button class="btn btn-primary" type="submit" name="signup_submit">Create Account</button>
        </form>
        <div class="text">
          <p>"Start Exploring the Seagrass Beneath the Surface."</p><br>
          <p>Create your iSeeGrass account and turn observations into insights.</p><br>
          <p>Already have an account? <a href="#" onclick="closeSignupModal(); return false;">Sign In</a></p>
        </div>
      </div>
    `;
  }

  function openSignupModal() {
    const modal = document.getElementById('signupModal');
    const formContainer = document.getElementById('signupFormContainer');

    if (!modal || !formContainer) return;

    formContainer.innerHTML = getSignupFormHtml();
    modal.classList.add('active');
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