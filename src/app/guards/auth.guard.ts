import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Route, UrlSegment, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs/operators';

// Prevents entering the route at URL match time
export const authCanMatch: CanMatchFn = (_route: Route, segments: UrlSegment[]) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const url = '/' + segments.map(s => s.path).join('/');
  return auth.isAuthenticated$.pipe(
    take(1),
    map(ok => (ok ? true : router.createUrlTree(['/login'], { queryParams: { redirect: url, reason: 'protected' } } as any)))
  );
};

// Blocks activation if somehow matched already
export const authCanActivate: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAuthenticated$.pipe(
    take(1),
    map(ok => (ok ? true : (router.createUrlTree(['/login'], { queryParams: { redirect: state.url, reason: 'protected' } }) as UrlTree)))
  );
};