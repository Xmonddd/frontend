import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  loading = false;
  info = '';
  redirectTo = '/dashboard';

  constructor(
    private auth: AuthService,
    private route: ActivatedRoute
  ) {
    const qp = this.route.snapshot.queryParamMap;
    this.redirectTo = qp.get('redirect') || '/dashboard';
    const reason = qp.get('reason');
    if (reason === 'protected') this.info = 'Please log in to continue.';
  }

  async google() {
    this.loading = true;
    try {
      await this.auth.signInWithGoogle(this.redirectTo);
    } finally {
      this.loading = false;
    }
  }
}