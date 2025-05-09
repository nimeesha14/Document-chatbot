import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors} from '@angular/forms';
import {HttpClient, HttpHeaders, HttpErrorResponse} from '@angular/common/http';
import {Router} from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule]
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  loading = false;
  error = '';
  submitted = false;
  showPassword = false;

  constructor(
    private formBuilder: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) {
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  // Custom password validator
  passwordValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.value;
    
    if (!password) {
      return null;
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const hasMinLength = password.length >= 8;

    const errors: ValidationErrors = {};
    
    if (!hasMinLength) {
      errors['minLength'] = true;
    }
    if (!hasUpperCase) {
      errors['uppercase'] = true;
    }
    if (!hasLowerCase) {
      errors['lowercase'] = true;
    }
    if (!hasSpecialChar) {
      errors['specialChar'] = true;
    }

    return Object.keys(errors).length ? errors : null;
  }

  ngOnInit(): void {
    this.registerForm = this.formBuilder.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, this.passwordValidator]]
    });

    // Show validation messages on input changes
    this.registerForm.valueChanges.subscribe(() => {
      if (this.submitted) {
        this.showValidationErrors();
      }
    });
  }

  showValidationErrors(): void {
    const errors = [];
    const nameControl = this.registerForm.get('name');
    const emailControl = this.registerForm.get('email');
    const passwordControl = this.registerForm.get('password');

    if (nameControl?.errors?.['required']) {
      errors.push('Name is required');
    }

    if (emailControl?.errors) {
      if (emailControl.errors['required']) {
        errors.push('Email is required');
      } else if (emailControl.errors['email']) {
        errors.push('Invalid email format');
      }
    }

    if (passwordControl?.errors) {
      if (passwordControl.errors['required']) {
        errors.push('Password is required');
      } else {
        const passwordErrors = [];
        if (passwordControl.errors['minLength']) {
          passwordErrors.push('at least 8 characters');
        }
        if (passwordControl.errors['uppercase']) {
          passwordErrors.push('one uppercase letter');
        }
        if (passwordControl.errors['lowercase']) {
          passwordErrors.push('one lowercase letter');
        }
        if (passwordControl.errors['specialChar']) {
          passwordErrors.push('one special character');
        }
        if (passwordErrors.length) {
          errors.push(`Password must contain ${passwordErrors.join(', ')}`);
        }
      }
    }

    this.error = errors.join(', ');
  }

  submit(): void {
    this.submitted = true;
    
    if (this.registerForm.invalid) {
      this.showValidationErrors();
      return;
    }

    this.loading = true;
    this.error = '';

    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    const userData = this.registerForm.getRawValue();
    
    console.log('Sending registration data:', userData);

    this.http.post('http://localhost:8000/api/register/', userData, {headers})
      .subscribe({
        next: (response) => {
          console.log('Registration successful:', response);
          this.router.navigate(['/login']);
        },
        error: (error: HttpErrorResponse) => {
          this.loading = false;
          console.error('Registration error:', error);
          if (error.error?.message) {
            this.error = error.error.message;
          } else {
            this.error = 'Registration failed. Please try again.';
          }
        }
      });
  }
}