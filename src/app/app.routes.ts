import { Routes } from '@angular/router';
import { authCanActivate, authCanMatch } from './guards/auth.guard';
import { TermsComponent } from './pages/legal/terms.component';
import { PrivacyComponent } from './pages/legal/privacy.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  { path: 'home', loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent) },
  { path: 'symptoms', loadComponent: () => import('./pages/symptoms/symptoms.component').then(m => m.SymptomsComponent) },
  { path: 'about', loadComponent: () => import('./pages/about/about.component').then(m => m.AboutComponent) },
  { path: 'login', loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent) },
  { path: 'signup', loadComponent: () => import('./pages/signup/signup.component').then(m => m.SignupComponent) },
  { path: 'auth/callback', loadComponent: () => import('./pages/auth-callback/auth-callback.component').then(m => m.AuthCallbackComponent) },
  { path: 'logout', loadComponent: () => import('./pages/logout/logout.component').then(m => m.LogoutComponent) },
  {
    path: 'dashboard',
    canMatch: [authCanMatch],
    canActivate: [authCanActivate],
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
  },
  { path: 'terms', component: TermsComponent },
  { path: 'privacy', component: PrivacyComponent },
  { path: '**', redirectTo: 'home' },
];