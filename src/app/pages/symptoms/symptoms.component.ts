import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';
import { AnalysisService } from '../../services/analysis.service';
import { AuthService } from '../../services/auth.service';

type Gender = '' | 'male' | 'female' | 'other';
type Step = 1 | 2 | 3 | 4;

interface CheckResponse {
  severity: string;
  insights: string[];
  advice: string;
  topCondition?: string;
  conditionDetails?: string;
  treatment?: string;
  remedy?: string;
  accuracyLevel: 'Low' | 'Moderate' | 'High';
  probabilities?: Record<string, number>;
  redFlags?: string[];
}

interface ProgressStep {
  step: Step;
  label: string;
  description: string;
}

@Component({
  selector: 'app-symptoms',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './symptoms.component.html',
  styleUrls: ['./symptoms.component.scss'],
})
export class SymptomsComponent implements OnInit {
  step: Step = 1;

  inputText = '';
  selectedSymptoms: string[] = [];

  filteredSuggestions: string[] = [];
  showSuggestions = false;
  activeIndex = -1;
  noResults = false;
  availableSymptoms: string[] = [];

  age: number | null = null;
  gender: Gender = '';

  result: CheckResponse | null = null;

  loading = false;
  error = '';

  readonly SUGGESTION_LIMIT = 8;

  readonly PROGRESS: ProgressStep[] = [
    { step: 1, label: 'Symptoms', description: 'Select what you feel' },
    { step: 2, label: 'Health details', description: 'Provide optional context' },
    { step: 3, label: 'Review', description: 'Verify information' },
    { step: 4, label: 'Results', description: 'View analysis' },
  ];

  readonly ALL_SYMPTOMS: string[] = [
    'headache',
    'fever',
    'cough',
    'sore throat',
    'runny nose',
    'nausea',
    'vomiting',
    'diarrhea',
    'fatigue',
    'dizziness',
    'shortness of breath',
    'abdominal pain',
    'back pain',
    'chest pain',
    'muscle pain',
    'rash',
    'itchy eyes',
  ];

  readonly POPULAR_SYMPTOMS: string[] = [
    'fever',
    'cough',
    'headache',
    'sore throat',
    'runny nose',
    'fatigue',
    'shortness of breath',
    'chest pain',
    

    
  ];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private auth: AuthService,
    private analysis: AnalysisService,
  ) {}

  ngOnInit(): void {
    void this.loadSymptoms();
    void this.handleReturnAfterLogin();
  }

  progressClass(progress: ProgressStep): string {
    if (this.step === progress.step) return 'active';
    if (this.step > progress.step) return 'completed';
    return '';
  }

  onInputFocus(): void {
    this.updateSuggestions(this.inputText);
    this.showSuggestions = this.filteredSuggestions.length > 0;
  }

  onInputChange(value: string): void {
    this.inputText = value;
    this.error = '';
    this.noResults = false;
    this.updateSuggestions(value);
  }

  onInputKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
        if (!this.showSuggestions) this.showSuggestions = true;
        if (this.filteredSuggestions.length) {
          event.preventDefault();
          this.activeIndex = (this.activeIndex + 1) % this.filteredSuggestions.length;
        }
        break;
      case 'ArrowUp':
        if (this.filteredSuggestions.length) {
          event.preventDefault();
          this.activeIndex =
            (this.activeIndex - 1 + this.filteredSuggestions.length) %
            this.filteredSuggestions.length;
        }
        break;
      case 'Enter':
      case 'Tab':
        if (this.commitInput()) {
          event.preventDefault();
        }
        break;
      case 'Escape':
        this.closeSuggestions();
        break;
      case 'Backspace':
        if (!this.inputText.trim() && this.selectedSymptoms.length) {
          event.preventDefault();
          this.removeLastSymptom();
        }
        break;
      default:
        break;
    }
  }

  onInputBlur(): void {
    setTimeout(() => this.closeSuggestions(), 150);
  }

  selectSuggestion(symptom: string): void {
    this.addSymptom(symptom);
    this.resetInput();
  }

  toggleSymptom(symptom: string): void {
    if (this.isSelected(symptom)) {
      this.selectedSymptoms = this.selectedSymptoms.filter((s) => s !== symptom);
    } else {
      this.addSymptom(symptom);
    }
    this.closeSuggestions();
  }

  isSelected(symptom: string): boolean {
    return this.selectedSymptoms.includes(symptom);
  }

  clearSelected(): void {
    this.selectedSymptoms = [];
    this.error = '';
  }

  removeSymptom(index: number): void {
    this.selectedSymptoms.splice(index, 1);
  }

  private removeLastSymptom(): void {
    this.selectedSymptoms.pop();
  }

  private commitInput(): boolean {
    const typed = this.normalizeSymptom(this.inputText);
    let candidate = '';

    if (this.filteredSuggestions.length) {
      const index = this.activeIndex >= 0 ? this.activeIndex : 0;
      candidate = this.filteredSuggestions[index] ?? '';
    } else {
      candidate = typed;
    }

    if (!candidate) {
      this.error = 'Select from the list or use the quick options.';
      return false;
    }

    this.addSymptom(candidate);
    this.resetInput();
    return true;
  }

  private async loadSymptoms(): Promise<void> {
    try {
      const res = await fetch('http://localhost:8000/symptoms');
      if (!res.ok) {
        this.availableSymptoms = [...this.ALL_SYMPTOMS];
        return;
      }
      const payload = await res.json();
      const list: string[] = Array.isArray(payload?.symptoms) ? payload.symptoms : [];
      if (list.length) {
        // Force all to lowercase
        this.availableSymptoms = [...new Set(list.map(s => String(s).toLowerCase()))].sort();
      } else {
        this.availableSymptoms = [...this.ALL_SYMPTOMS];
      }
    } catch {
      this.availableSymptoms = [...this.ALL_SYMPTOMS];
    }
  }

  private addSymptom(raw: string): void {
    const normalized = this.normalizeSymptom(raw);
    if (!normalized) return;

    const match = this.availableSymptoms.find(
      (symptom) => symptom.toLowerCase() === normalized
    );
    
    if (!match) {
      this.error = 'No matching symptom found.';
      this.noResults = true;
      return;
    }

    if (!this.selectedSymptoms.includes(match)) {
      this.selectedSymptoms = [...this.selectedSymptoms, match];
    }
  }

  private normalizeSymptom(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private updateSuggestions(query: string): void {
    const normalized = this.normalizeSymptom(query);
    const available = this.availableSymptoms.filter(
      (symptom: string) => !this.selectedSymptoms.includes(symptom),
    );

    if (!normalized) {
      this.filteredSuggestions = [];
      this.showSuggestions = false;
      this.noResults = false;
      return;
    }

    const scored = available
      .map((symptom: string) => {
        const lower = symptom.toLowerCase();
        const startsWith = lower.startsWith(normalized) ? 0 : 1;
        const index = lower.indexOf(normalized);
        const distance = index >= 0 ? index : 99;
        return { symptom, sortKey: startsWith * 10 + distance };
      })
      .filter((item: { symptom: string; sortKey: number }) => item.symptom.toLowerCase().includes(normalized))
      .sort((a: { sortKey: number }, b: { sortKey: number }) => a.sortKey - b.sortKey)
      .slice(0, this.SUGGESTION_LIMIT)
      .map((item: { symptom: string }) => item.symptom);

    this.filteredSuggestions = scored;
    this.showSuggestions = true;
    this.noResults = this.filteredSuggestions.length === 0;
    this.activeIndex = this.filteredSuggestions.length > 0 ? 0 : -1;
  }

  private resetInput(): void {
    this.inputText = '';
    this.filteredSuggestions = [];
    this.showSuggestions = false;
    this.activeIndex = -1;
    this.error = '';
  }

  private closeSuggestions(): void {
    this.showSuggestions = false;
    this.activeIndex = -1;
  }

  nextStep(): void {
    this.error = '';
    if (this.inputText.trim()) {
      if (!this.commitInput()) return;
    }
    if (this.selectedSymptoms.length === 0) {
      this.error = 'Add at least one symptom to continue.';
      return;
    }
    this.step = 2;
  }

  backToStep1(): void {
    this.step = 1;
  }

  onAgeInput(value: string): void {
    this.age = value ? Number(value) : null;
  }

  onGenderChange(value: string): void {
    this.gender = value as Gender;
  }

  nextFromStep2(): void {
    this.step = 3;
  }

  backToStep2(): void {
    this.step = 2;
  }

  genderLabel(): string {
    switch (this.gender) {
      case 'male':
        return 'Male';
      case 'female':
        return 'Female';
      case 'other':
        return 'Other';
      default:
        return 'Prefer not to say';
    }
  }

  async analyze(): Promise<void> {
    this.loading = true;
    this.error = '';

    try {
      const payload = {
        symptoms: this.selectedSymptoms,
        age: this.age ?? undefined,
        gender: this.gender || undefined,
      };

      const response = await fetch('http://localhost:8000/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const data: CheckResponse = await response.json();
      this.result = data;
      this.step = 4;
      this.scrollToTop();
    } catch (err: any) {
      console.error(err);
      this.error = err?.message ?? 'Failed to analyze. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  confidenceMessage(): string {
    const level = this.result?.accuracyLevel;
    if (!level) return '';
    if (level === 'High') {
      return 'Strong match found in our training set.';
    }
    if (level === 'Moderate') {
      return 'Symptoms align with the condition, but consider medical confirmation.';
    }
    return 'Symptoms are broad; treat this result as a starting point.';
  }

  hasRedFlags(): boolean {
    return Boolean(this.result?.redFlags?.length);
  }

  careTips(): string {
    const severity = (this.result?.severity ?? '').toLowerCase();
    if (severity === 'high') {
      return 'If symptoms are severe or worsening, call emergency services immediately.';
    }
    if (severity === 'medium') {
      return 'Rest, hydrate, consider OTC relief, and consult a clinician if symptoms persist.';
    }
    return 'Maintain hydration, rest, and reassess if new symptoms appear.';
  }

  startNew(): void {
    this.step = 1;
    this.inputText = '';
    this.selectedSymptoms = [];
    this.filteredSuggestions = [];
    this.showSuggestions = false;
    this.activeIndex = -1;
    this.age = null;
    this.gender = '';
    this.result = null;
    this.loading = false;
    this.error = '';
    this.scrollToTop();
  }

  private buildPayload(): { symptoms: string[]; result: CheckResponse | null } {
    return {
      symptoms: this.selectedSymptoms,
      result: this.result,
    };
  }

  async onGetResult(): Promise<void> {
    const payload = this.buildPayload();

    const user = await this.auth.getUserOnce();
    if (user) {
      await this.analysis.addHistory(payload);
      this.router.navigateByUrl('/dashboard');
      return;
    }

    this.analysis.stashPending(payload);
    this.router.navigate(['/login'], { queryParams: { redirect: '/dashboard' } });
  }

  private async handleReturnAfterLogin(): Promise<void> {
    const saveFlag = this.route.snapshot.queryParamMap.get('save');
    if (saveFlag !== '1') return;

    const isAuthed = await firstValueFrom(this.auth.isAuthenticated$.pipe(take(1)));
    if (!isAuthed) return;

    const saved = await this.analysis.processPendingAndClear();
    if (saved) {
      this.router.navigateByUrl('/dashboard');
    }
  }

  private scrollToTop(): void {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}