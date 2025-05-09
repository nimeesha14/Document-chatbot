import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Emitters } from '../emitters/emitters';
import { Router } from '@angular/router';

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.css']
})
export class NavComponent implements OnInit {
  authenticated = false;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Subscribe to authentication state changes
    Emitters.authEmitter.subscribe(
      (auth: boolean) => {
        console.log('Auth state changed:', auth);
        this.authenticated = auth;
      }
    );

    // Check initial authentication state
    this.http.get('http://localhost:8000/api/user/', {
      withCredentials: true
    }).subscribe({
      next: () => {
        this.authenticated = true;
        Emitters.authEmitter.emit(true);
      },
      error: () => {
        this.authenticated = false;
        Emitters.authEmitter.emit(false);
      }
    });
  }

  logout(): void {
    this.http.post('http://localhost:8000/api/logout/', {}, {withCredentials: true})
      .subscribe({
        next: () => {
          console.log('Logout successful');
          this.authenticated = false;
          Emitters.authEmitter.emit(false);
          this.router.navigate(['/login']);
        },
        error: () => {
          console.log('Logout failed but clearing frontend state');
          this.authenticated = false;
          Emitters.authEmitter.emit(false);
          this.router.navigate(['/login']);
        }
      });
  }

}
