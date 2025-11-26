import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

export interface SymptomHistory {
  id: string;
  user_id: string;
  symptoms: any;   // array or object; keep flexible
  result: any;     // checker output json
  notes?: string;
  created_at: string;
}

export const PENDING_RESULT_KEY = 'sym_pending_result';
const PENDING_LOCK_KEY = 'sym_pending_lock';

@Injectable({ providedIn: 'root' })
export class AnalysisService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(environment.supabaseUrl.trim(), environment.supabaseKey.trim());
  }

  private async getUserId(): Promise<string | null> {
    const { data } = await this.supabase.auth.getUser();
    return data.user?.id ?? null;
  }

  private makeFingerprint(payload: { symptoms: any; result: any }): string {
    const key = JSON.stringify({ s: payload.symptoms, r: payload.result });
    // compact base64; trim to keep index small
    return btoa(unescape(encodeURIComponent(key))).slice(0, 200);
  }

  // Call this after a successful symptoms check (only saves if logged-in)
  async addHistory(payload: { symptoms: any; result?: any; notes?: string }): Promise<string | null> {
    const uid = await this.getUserId();
    if (!uid) return null; // user not logged-in, skip saving

    const { data, error } = await this.supabase
      .from('symptom_history')
      .insert({
        user_id: uid,
        symptoms: payload.symptoms,
        result: payload.result ?? null,
        notes: payload.notes ?? null,
        // If your schema requires fingerprint NOT NULL/UNIQUE, you can generate a unique one:
        // fingerprint: `${Date.now()}-${crypto.getRandomValues(new Uint32Array(1))[0]}`
      })
      .select('id')
      .single();

    if (error) throw new Error(error.message);
    return data.id as string;
  }

  // Make this synchronous (do NOT mark as async)
  stashPending(payload: { symptoms: any; result: any; notes?: string }): void {
    try { localStorage.setItem(PENDING_RESULT_KEY, JSON.stringify(payload)); } catch {}
  }

  // Ensure this returns a Promise<boolean>
  async processPendingAndClear(): Promise<boolean> {
    // prevent multi-trigger during redirects/subscriptions
    try {
      if (localStorage.getItem(PENDING_LOCK_KEY) === '1') return false;
      localStorage.setItem(PENDING_LOCK_KEY, '1');
    } catch {}

    let raw: string | null = null;
    try { raw = localStorage.getItem(PENDING_RESULT_KEY); } catch {}
    if (!raw) { try { localStorage.removeItem(PENDING_LOCK_KEY); } catch {} return false; }

    const uid = await this.getUserId();
    if (!uid) { try { localStorage.removeItem(PENDING_LOCK_KEY); } catch {} return false; }

    try {
      const payload = JSON.parse(raw);
      await this.addHistory(payload);
      try { localStorage.removeItem(PENDING_RESULT_KEY); } catch {}
      return true;
    } catch {
      return false;
    } finally {
      try { localStorage.removeItem(PENDING_LOCK_KEY); } catch {}
    }
  }

  async listHistory(limit = 20): Promise<SymptomHistory[]> {
    const uid = await this.getUserId();
    if (!uid) return [];
    const { data, error } = await this.supabase
      .from('symptom_history')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return (data as SymptomHistory[]) ?? [];
  }

  async deleteHistory(id: string): Promise<void> {
    const { error } = await this.supabase.from('symptom_history').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }
}