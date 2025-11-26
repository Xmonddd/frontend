import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AnalysisService } from '../../services/analysis.service';
import { filter, take, firstValueFrom } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-auth-callback',
  imports: [CommonModule],
  template: `
    <section style="padding:24px">
      <h2>Signing you in…</h2>
      <p>Please wait.</p>
      <p *ngIf="error" style="color:#c62828">{{ error }}</p>
    </section>
  `
})
export class AuthCallbackComponent implements OnInit {
  error = '';
  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private analysis: AnalysisService
  ) {}

  async ngOnInit() {
    const redirect = this.route.snapshot.queryParamMap.get('redirect') || '/dashboard';

    await firstValueFrom(this.auth.isAuthenticated$.pipe(filter(Boolean), take(1)));

    const saved = await this.analysis.processPendingAndClear();
    this.router.navigateByUrl(saved ? '/dashboard' : redirect);

    const err = this.route.snapshot.queryParamMap.get('error_description') || this.route.snapshot.queryParamMap.get('error');
    if (err) this.error = err;
  }
}