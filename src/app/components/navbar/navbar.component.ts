import { Component } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, AsyncPipe],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class NavbarComponent {
  loggingOut = false;

  constructor(public auth: AuthService, private router: Router) {}

  async logout() {
    if (this.loggingOut) return;
    this.loggingOut = true;
    console.debug('[Navbar] Logout clicked');
    try {
      await this.auth.logout();
    } catch (e: any) {
      alert('Logout failed: ' + (e?.message || e));
    } finally {
      this.loggingOut = false;
      // ensure we leave protected pages
      this.router.navigateByUrl('/home');
    }
  }
}