import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  registerForm: FormGroup;
  isLoginMode = true;
  isLoading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    this.registerForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    // Only redirect if user is authenticated and not coming from guest mode
    // This allows the "Continue as Guest" button to work properly
    // if (this.authService.isAuthenticated) {
    //   this.router.navigate(['/home']);
    // }
  }

  toggleMode(): void {
    this.isLoginMode = !this.isLoginMode;
    this.errorMessage = '';
  }

  async onSubmit(): Promise<void> {
    if (this.isLoginMode) {
      await this.handleLogin();
    } else {
      await this.handleRegister();
    }
  }

  private async handleLogin(): Promise<void> {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      try {
        const { username, password } = this.loginForm.value;
        const success = await this.authService.login(username, password);
        
        if (success) {
          this.router.navigate(['/home']);
        } else {
          this.errorMessage = 'Invalid username or password';
        }
      } catch (error) {
        this.errorMessage = 'An error occurred during login';
      } finally {
        this.isLoading = false;
      }
    }
  }

  private async handleRegister(): Promise<void> {
    if (this.registerForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      try {
        const { username, email, password, firstName, lastName } = this.registerForm.value;
        const success = await this.authService.register(username, email, password, firstName, lastName);
        
        if (success) {
          this.router.navigate(['/home']);
        } else {
          this.errorMessage = 'Registration failed';
        }
      } catch (error) {
        this.errorMessage = 'An error occurred during registration';
      } finally {
        this.isLoading = false;
      }
    }
  }

  private passwordMatchValidator(form: FormGroup): { [key: string]: boolean } | null {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      return { passwordMismatch: true };
    }
    
    return null;
  }

  continueAsGuest(): void {
    console.log('Continue as Guest clicked - navigating to home');
    // Use window.location for a more direct approach
    window.location.href = '/home';
  }
}
