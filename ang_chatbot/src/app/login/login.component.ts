import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  loading = false;
  error = '';
  submitted = false;
  showPassword = false;
  
  constructor(
    private formBuilder: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  submit(): void {
    this.submitted = true;
    
    if (this.loginForm.invalid) {
      if (this.loginForm.get('email')?.errors?.['required']) {
        this.error = 'Email is required';
        return;
      }
      if (this.loginForm.get('email')?.errors?.['email']) {
        this.error = 'Please enter a valid email address';
        return;
      }
      if (this.loginForm.get('password')?.errors?.['required']) {
        this.error = 'Password is required';
        return;
      }
      return;
    }

    this.loading = true;
    this.error = '';

    this.http.post('http://localhost:8000/api/login/', this.loginForm.getRawValue(), {
      withCredentials: true
    }).subscribe({
      next: (response: any) => {
        console.log('Login successful:', response);
        
        if (response.user && response.user.id) {
          localStorage.setItem('user_id', response.user.id);
          console.log('User ID stored in localStorage:', response.user.id);
        } else {
          console.warn('user_id not found in login response.');
        }
      


        this.loading = false;
        this.router.navigate(['/home']);
      },
      error: (error: HttpErrorResponse) => {
        this.loading = false;
        console.error('Login error:', error);

        // Handle specific error cases
        if (error.status === 404 || error.error?.message === 'User not Found!') {
          this.error = 'User not found. Please check your email or register a new account.';
        } else if (error.status === 401 || error.error?.message === 'Incorrect Password!') {
          this.error = 'Incorrect email or password. Please try again.';
        } else {
          this.error = 'Login failed. Please try again.';
        }
      }
    });
  }
}
