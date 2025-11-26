import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

function matchPasswords(ctrl: AbstractControl): ValidationErrors | null {
  const pw = ctrl.get('password')?.value;
  const cpw = ctrl.get('confirm')?.value;
  return pw && cpw && pw !== cpw ? { mismatch: true } : null;
}

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss'],
})
export class SignupComponent {
  loading = false;
  error = '';

  form = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirm: ['', [Validators.required]],
  }, { validators: matchPasswords });

  magicForm = this.fb.group({
    magicEmail: ['', [Validators.required, Validators.email]],
  });
  sendingMagic = false;
  magicMsg = '';

  redirectTo = '/dashboard';

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.redirectTo = this.route.snapshot.queryParamMap.get('redirect') || '/dashboard';
  }

  async submit() {
    this.error = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    try {
      const { username, email, password } = this.form.value;
      await this.auth.signup(email!, password!, username!);
      this.router.navigateByUrl(this.redirectTo);
    } catch (e: any) {
      this.error = e?.message || 'Signup failed.';
    } finally {
      this.loading = false;
    }
  }

  async sendMagic() {
    this.magicMsg = '';
    if (this.magicForm.invalid) {
      this.magicForm.markAllAsTouched();
      return;
    }
    this.sendingMagic = true;
    try {
      await this.auth.sendMagicLink(this.magicForm.value.magicEmail!);
      this.magicMsg = 'Check your email for the login link.';
    } catch (e: any) {
      this.magicMsg = e?.message || 'Failed to send magic link.';
    } finally {
      this.sendingMagic = false;
    }
  }

  async google() {
    await this.auth.signInWithGoogle(this.redirectTo);
  }

  get mismatch() {
    return this.form.hasError('mismatch') && (this.form.get('confirm')?.touched || this.form.get('password')?.touched);
  }
}