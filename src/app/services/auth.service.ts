import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private supabase: SupabaseClient;
  user$ = new BehaviorSubject<User | null>(null);
  isAuthenticated$ = new BehaviorSubject<boolean>(false);

  constructor() {
    this.supabase = createClient(environment.supabaseUrl.trim(), environment.supabaseKey.trim());
    this.bootstrap();
    this.supabase.auth.onAuthStateChange((event, session) => {
      console.debug('[AuthService] onAuthStateChange:', event, !!session?.user);
      this.user$.next(session?.user ?? null);
      this.isAuthenticated$.next(!!session?.user);
    });
  }

  private async bootstrap() {
    const { data } = await this.supabase.auth.getSession();
    const user = data.session?.user ?? null;
    this.user$.next(user);
    this.isAuthenticated$.next(!!user);
    if (user) await this.ensureProfile();
  }

  private buildRedirect(redirectPath: string) {
    let base = (environment.supabaseRedirectTo || '').trim();
    if (!base) base = window.location.origin + '/auth/callback';
    // ensure absolute URL
    if (!/^https?:\/\//i.test(base)) {
      base = window.location.origin + (base.startsWith('/') ? '' : '/') + base;
    }
    const r = redirectPath?.startsWith('/') ? redirectPath : '/' + (redirectPath || 'dashboard');
    const finalUrl = `${base}?redirect=${encodeURIComponent(r)}`;
    console.log('Supabase redirectTo:', JSON.stringify(finalUrl)); // debug; shows spaces if any
    return finalUrl;
  }

  async login(email: string, password: string) {
    const { error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  }

  async signup(email: string, password: string, username: string) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    if (error) throw new Error(error.message);
    if (data.session) await this.ensureProfile(username);
  }

  async signInWithGoogle(redirectPath: string = '/dashboard') {
    const redirectTo = this.buildRedirect(redirectPath);
    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true }, // keep while debugging
    });
    if (error) throw new Error(error.message);
    if (data?.url) window.location.assign(data.url);
  }

  async sendMagicLink(email: string, redirectPath: string = '/dashboard') {
    const redirectTo = this.buildRedirect(redirectPath);
    const { error } = await this.supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) throw new Error(error.message);
  }

  async logout() {
    console.debug('[AuthService] logout() begin');
    const { error } = await this.supabase.auth.signOut();
    if (error) console.error('[AuthService] signOut error:', error.message);
    this.user$.next(null);
    this.isAuthenticated$.next(false);
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
        .forEach(k => localStorage.removeItem(k));
    } catch {}
    console.debug('[AuthService] logout() done');
  }

  private async ensureProfile(passedUsername?: string) {
    const { data: userRes } = await this.supabase.auth.getUser();
    const user = userRes.user;
    if (!user) return;

    const { data: existing } = await this.supabase
      .from('profiles')
      .select('id, username')
      .eq('id', user.id)
      .maybeSingle();

    if (existing?.username) return;

    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    let username =
      passedUsername ||
      (typeof meta['username'] === 'string' ? (meta['username'] as string) : undefined) ||
      (user.email ? this.sanitize(user.email.split('@')[0]) : undefined);

    if (!username) username = `user_${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`;
    username = await this.makeUniqueUsername(username);

    const { error: upsertErr } = await this.supabase
      .from('profiles')
      .upsert({ id: user.id, username }, { onConflict: 'id' });

    if (upsertErr) console.error('ensureProfile failed:', upsertErr.message);
  }

  private sanitize(s: string) {
    return s.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 24);
  }

  private async makeUniqueUsername(base: string): Promise<string> {
    let candidate = base;
    for (let i = 0; i < 10; i++) {
      const { data } = await this.supabase
        .from('profiles')
        .select('id')
        .eq('username', candidate)
        .maybeSingle();
      if (!data) return candidate;
      candidate = `${base}_${Math.floor(Math.random() * 9999)}`;
    }
    return `${base}_${Date.now().toString(36)}`;
  }

  async getUserOnce(): Promise<User | null> {
    const { data } = await this.supabase.auth.getUser();
    return data.user ?? null;
  }

  async isLoggedInOnce(): Promise<boolean> {
    return (await this.getUserOnce()) !== null;
  }
}