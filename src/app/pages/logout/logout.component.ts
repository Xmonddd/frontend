import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  standalone: true,
  selector: 'app-logout',
  imports: [CommonModule],
  template: `
    <section style="padding:24px">
      <h2>Signing you out…</h2>
      <p>Please wait.</p>
    </section>
  `,
})
export class LogoutComponent implements OnInit {
  constructor(private auth: AuthService, private router: Router) {}

  async ngOnInit() {
    console.debug('[LogoutComponent] start');
    try {
      await this.auth.logout();
      console.debug('[LogoutComponent] signOut done');
    } catch (e) {
      console.error('[LogoutComponent] signOut error', e);
    } finally {
      this.router.navigateByUrl('/home');
    }
  }
}