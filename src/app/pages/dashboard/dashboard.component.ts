import { Component, OnInit } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AnalysisService, SymptomHistory } from '../../services/analysis.service';

interface HistoryItem {
  id: string;
  user_id: string;
  symptoms: string[];
  result: {
    severity: string;
    insights: string[];
    advice: string;
    topCondition?: string;
    conditionDetails?: string;
    treatment?: string;
    remedy?: string;
    accuracyLevel: string;
  } | null;
  created_at: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, AsyncPipe],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  items: HistoryItem[] = [];
  loading = true;
  error = '';
  deletingId: string | null = null;

  constructor(
    public auth: AuthService,
    private router: Router,
    private analysis: AnalysisService
  ) {}

  ngOnInit() {
    this.auth.isAuthenticated$.subscribe(isAuthed => {
      if (!isAuthed) this.router.navigateByUrl('/home');
    });
    this.refresh();
  }

  async refresh() {
    this.loading = true;
    this.error = '';
    try {
      this.items = await this.analysis.listHistory(50);
    } catch (e: any) {
      this.error = e?.message || 'Failed to load history.';
    } finally {
      this.loading = false;
    }
  }

  async remove(id: string) {
    if (!confirm('Delete this record?')) return;
    this.deletingId = id;
    try {
      await this.analysis.deleteHistory(id);
      this.items = this.items.filter(i => i.id !== id);
    } catch (e: any) {
      this.error = e?.message || 'Failed to delete item.';
    } finally {
      this.deletingId = null;
    }
  }

  displaySymptoms(sym: any): string {
    if (Array.isArray(sym)) {
      const names = sym.map((s: any) => (typeof s === 'string' ? s : (s.name ?? s.code ?? 'symptom')));
      return names.join(', ');
    }
    if (sym && typeof sym === 'object') return Object.values(sym).join(', ');
    return String(sym ?? '');
  }

  chipLabel(s: any): string {
    return typeof s === 'string' ? s : (s?.name || s?.code || 'symptom');
  }
  asSymArray(sym: any): any[] {
    if (!sym) return [];
    return Array.isArray(sym) ? sym : [sym];
  }

  // Result helpers
  resultCondition(res: any): string {
    if (!res) return '';
    if (typeof res === 'string') return res;
    return res.condition || res.topCondition || res.conditions?.[0]?.name || res.conditions?.[0] || 'Analysis';
  }
  resultDetails(res: any): string {
    if (!res || typeof res === 'string') return '';
    return res.details || res.description || res.conditionDetails || '';
  }
  resultTreatment(res: any): string {
    if (!res || typeof res === 'string') return '';
    return res.treatment || res.treatmentOption || res.recommendation || '';
  }
  resultAdvice(res: any): string {
    if (!res || typeof res === 'string') return '';
    return res.advice || res.generalAdvice || res.nextSteps || '';
  }

  // Stats
  get totalChecks(): number { return this.items.length; }
  get lastItem(): HistoryItem | undefined { return this.items[0]; }
  get lastCondition(): string { return this.lastItem ? this.resultCondition(this.lastItem.result) : '—'; }
  get lastWhen(): string {
    return this.lastItem ? new Date(this.lastItem.created_at).toLocaleString() : '—';
  }
    //remedy suggestions
  private readonly symptomRemedies: Record<string, string> = {
    'headache': 'Rest in a quiet, dark room, stay hydrated, and consider OTC pain relievers if appropriate.',
    'chest pain': 'Sit upright, practice slow breathing, and seek urgent care if pain is severe or with shortness of breath.',
    'cough': 'Sip warm fluids, use throat lozenges, and add humidity to the air; see a doctor for persistent cough.',
    'fever': 'Hydrate frequently, rest, and use fever reducers as advised by a healthcare provider.',
    'sore throat': 'Gargle warm salt water, drink warm teas with honey, and avoid irritants like smoke.',
    'fatigue': 'Prioritize sleep, eat balanced meals, and pace activities with gentle movement breaks.',
    'nausea': 'Take small sips of clear liquids, eat bland foods, and avoid strong odors.',
    'dizziness': 'Sit or lie down, hydrate, and stand slowly; seek care if dizziness persists or worsens.',
    'runny nose': 'Use saline nasal rinses, stay hydrated, and consider decongestants for temporary relief.',
    'sneezing': 'Avoid allergens, use antihistamines if allergic, and keep environment clean and dust-free.',
    'shortness of breath': 'Sit upright, practice controlled breathing, and seek immediate care if severe or worsening.',
    'sweating': 'Stay cool, wear breathable clothing, hydrate well, and monitor for accompanying symptoms.',
    'vomiting': 'Sip clear liquids slowly, avoid solid foods initially, rest, and seek care if persistent or with blood.',
    'diarrhea': 'Stay hydrated with oral rehydration solutions, eat bland foods (BRAT diet), and avoid dairy temporarily.',
    'abdominal cramps': 'Apply warm compress to abdomen, avoid trigger foods, stay hydrated, and rest.',
    'thirst': 'Drink water frequently, consume electrolyte solutions, and avoid caffeinated or alcoholic beverages.',
    'dry mouth': 'Sip water regularly, chew sugar-free gum to stimulate saliva, and use oral moisturizers.',
    'burning urination': 'Increase water intake, avoid irritants (caffeine, spicy foods), and seek medical evaluation for antibiotics.',
    'frequent urination': 'Monitor fluid intake, avoid bladder irritants, and consult healthcare provider if persistent.',
    'lower abdominal pain': 'Rest, apply gentle heat, avoid heavy meals, and seek urgent care if severe or with fever.',
    'facial pain': 'Apply warm compresses, use saline nasal irrigation, and take pain relievers as appropriate.',
    'nasal congestion': 'Use steam inhalation, saline sprays, keep head elevated while sleeping, and stay hydrated.',
    'thick nasal discharge': 'Increase fluid intake, use saline rinses, apply warm compresses, and monitor for worsening symptoms.',
    'itchy eyes': 'Avoid rubbing eyes, use cold compresses, apply artificial tears, and avoid allergens.',
    'ear pain': 'Apply warm compress to ear, take pain relievers, avoid inserting objects, and seek evaluation if severe.',
    'reduced hearing': 'Avoid loud noises, don\'t insert objects in ear, and consult healthcare provider for assessment.',
    'sharp lower right abdominal pain': 'URGENT: Seek immediate medical attention. Avoid eating/drinking. This may indicate appendicitis.',
    'pink eye': 'Avoid touching eyes, use warm compresses, practice hand hygiene, and consult doctor for appropriate drops.',
    'eye discharge': 'Gently clean with warm water, avoid sharing towels, don\'t wear contacts, and see doctor if worsening.',
    'back pain': 'Apply ice/heat alternately, gentle stretching, maintain good posture, and avoid heavy lifting.',
    'pain radiating down leg': 'Rest, avoid aggravating positions, gentle walking when able, and seek evaluation if weakness develops.',
    'numbness': 'Change positions frequently, gentle movement, and seek immediate care if sudden or with weakness.',
    'muscle aches': 'Rest affected muscles, apply heat, stay hydrated, gentle stretching, and take OTC pain relievers.',
    'weakness': 'Rest, ensure adequate nutrition and hydration, and seek medical evaluation if persistent or worsening.',
    'trouble swallowing': 'Eat slowly, take small bites, drink liquids with meals, and seek care if severe or with weight loss.',
    'swollen lymph glands': 'Apply warm compress, get adequate rest, stay hydrated, and monitor for fever or worsening.',
    'chills': 'Stay warm, rest, monitor temperature, hydrate well, and seek care if accompanied by high fever.',
    'stomach ache': 'Eat bland foods, avoid spicy/fatty foods, apply warm compress, and rest.',
    'rash': 'Avoid scratching, keep area clean and dry, use cool compresses, and seek care if spreading or with fever.',
    'loss of balance': 'Move slowly and carefully, use support when walking, avoid sudden movements, and seek evaluation.',
    'wheezing': 'Sit upright, practice slow breathing, use prescribed inhaler if available, and seek urgent care if severe.',
    'chest tightness': 'Loosen tight clothing, practice deep breathing, rest, and seek immediate care if severe or with pain.',
    'confusion': 'Ensure safety, have someone stay with you, avoid driving, and seek immediate medical attention.',

    'anxiety': 'Practice deep breathing exercises, find quiet space, use relaxation techniques, and seek support if overwhelming.',
    'difficulty breathing': 'Sit upright, loosen clothing, practice controlled breathing, and call emergency services if severe.',
    'blue lips': 'EMERGENCY: Call 911 immediately. This indicates oxygen deprivation requiring urgent medical intervention.',
    'difficulty speaking': 'Rest your voice, stay calm, write if needed, and seek immediate evaluation if sudden onset.',
    'constipation': 'Increase fiber intake, drink more water, gentle exercise, and use stool softeners if needed.',
    'inability to pass gas': 'Gentle abdominal massage, warm compress, light walking, and seek care if with severe pain.',
    'abdominal swelling': 'Avoid tight clothing, elevate legs, reduce sodium intake, and consult doctor if persistent.',
    'palpitations': 'Sit down, practice slow breathing, stay hydrated, avoid caffeine, and seek care if frequent or with chest pain.',
    'trouble sleeping': 'Maintain sleep schedule, create dark quiet environment, avoid screens before bed, and practice relaxation.',
    'low-grade fever': 'Rest, stay hydrated, use fever reducers as appropriate, monitor temperature, and watch for worsening.',
    'weight gain': 'Monitor food intake, increase physical activity, stay hydrated, and consult healthcare provider.',
    'slowed thinking': 'Get adequate rest, reduce stress, stay mentally active, and seek medical evaluation if worsening.',
    'sensitivity to cold': 'Dress in layers, keep environment warm, stay active, and discuss with healthcare provider.',
    'depression': 'Seek support from loved ones, maintain routine, consider professional help, and practice self-care.',
    'paranoia': 'Seek immediate professional mental health support and avoid isolation.',
    'hearing loss': 'Avoid loud noises, don\'t insert objects in ear, and schedule hearing evaluation.',
    'dry skin': 'Moisturize regularly, use gentle cleansers, avoid hot water, and stay hydrated.',
    'coarse hair': 'Use gentle hair products, avoid excessive heat styling, and maintain balanced diet.',
    'hair loss': 'Be gentle with hair, avoid harsh treatments, maintain good nutrition, and consult healthcare provider.',
    'upper abdominal pain': 'Eat smaller meals, avoid trigger foods, take antacids if appropriate, and seek care if severe.',
    'black tarry stools': 'URGENT: Seek immediate medical attention. This may indicate internal bleeding.',
    'loss of appetite': 'Eat small frequent meals, choose favorite foods, stay hydrated, and monitor weight.',
    'tiredness': 'Prioritize rest, maintain regular sleep schedule, eat balanced meals, and stay hydrated.',
    'plugged up feeling in ears': 'Try yawning or swallowing, chew gum, use decongestants, and avoid inserting objects.',
    'temporary loss of taste': 'Stay hydrated, practice good oral hygiene, and it should resolve as illness improves.',
    'temporary loss of smell': 'Steam inhalation may help, stay hydrated, and consult doctor if prolonged.',
    'throat pain': 'Gargle warm salt water, drink warm fluids, use throat lozenges, and rest voice.',
    'throat sensitivity': 'Avoid irritants, drink cool fluids, use throat sprays, and limit talking.',
    'stuffy nose': 'Use saline rinses, steam inhalation, keep head elevated, and use dehumidifier.',
    'muscle spasms': 'Gentle stretching, apply heat, massage area, stay hydrated, and rest affected muscle.',
    'stiffness': 'Gentle movement and stretching, apply heat, stay active, and avoid prolonged sitting.',
    'difficulty sitting': 'Take frequent breaks, use supportive cushion, maintain good posture, and gentle stretching.',
    'pain when touching area': 'Avoid direct pressure, apply ice initially, rest area, and seek evaluation if severe.',
    'white patches on throat': 'Stay hydrated, gargle salt water, and seek medical evaluation for possible strep throat.',
    'swollen lymph nodes': 'Apply warm compress, rest, stay hydrated, and monitor for fever or increase in size.',
    'ringing in ears': 'Avoid loud noises, reduce caffeine and salt, try white noise, and consult doctor if persistent.',
    'difficulty concentrating': 'Take breaks, reduce distractions, get adequate sleep, and practice mindfulness.',
    'sensation of spinning': 'Lie still with eyes closed, avoid sudden movements, and seek evaluation if persistent.',
    'blood in stool': 'URGENT: Seek immediate medical attention. Note color and amount for healthcare provider.',
    'blood in urine': 'URGENT: Seek prompt medical evaluation. Increase fluid intake and avoid strenuous activity.',
    'severe pain': 'URGENT: Seek immediate medical attention. Note location, intensity, and any associated symptoms.'
  };

  remedySuggestions(sym: any): { label: string; remedy: string }[] {
    return this.asSymArray(sym)
      .slice(0, 3)
      .map(s => {
        const label = this.chipLabel(s);
        const key = label.toLowerCase();
        const remedy =
          this.symptomRemedies[key] ||
          'Rest, hydrate, and monitor symptoms. Consult a clinician if they worsen.';
        return { label, remedy };
      });
  }

  // Derive a simple prediction based on previous assessment
  private severityRank(sev: string): number {
    const order = ['low','mild','moderate','high','severe','critical'];
    const i = order.indexOf(sev?.toLowerCase());
    return i === -1 ? 2 : i;
  }

  // Prevention tips by condition or symptom (lowercase keys)
  private readonly preventionMap: Record<string, string> = {
    'fever': 'Stay hydrated, ensure adequate sleep, manage stress, practice regular handwashing, and keep vaccinations up to date.',
    'tension headache': 'Maintain regular sleep schedule, limit screen glare, manage caffeine, stay hydrated, and avoid skipping meals.',
    'cough': 'Avoid smoke exposure, wash hands often, use a humidifier, and support immunity with balanced nutrition.',
    'sore throat': 'Hydrate, avoid irritants (smoke/pollution), practice hand hygiene, and do saline gargles.',
    'fatigue': 'Establish consistent sleep routine, balanced diet with protein and iron sources, light daily exercise, and stress reduction.',
    'nausea': 'Eat smaller frequent meals, avoid greasy foods, stay hydrated, and identify personal food triggers.',
    'dizziness': 'Rise slowly from sitting, stay hydrated, eat regular meals, and avoid sudden head movements.',
    'chest pain': 'Manage stress, avoid heavy meals before lying down, reduce smoking exposure, and seek evaluation for recurrent episodes.'
  };

  // Enhanced prevention tips by condition with escalating detail
  private readonly detailedPreventionMap: Record<string, {
    first: string;
    second: string;
    third: string;
  }> = {
    'fever': {
      first: 'Stay hydrated, ensure adequate sleep, manage stress, practice regular handwashing, and keep vaccinations up to date.',
      second: 'Boost immunity: Take vitamin C (500-1000mg daily), vitamin D (2000 IU), zinc supplements. Sleep 7-9 hours nightly. Avoid crowded places during flu season. Sanitize frequently-touched surfaces daily. Eat immune-boosting foods (citrus, garlic, ginger, yogurt). Stay hydrated with 8-10 glasses of water.',
      third: 'Comprehensive prevention required: Get complete blood count (CBC) test to check immune function. Maintain detailed health diary tracking exposure, diet, sleep, stress levels. Consider allergy testing. Eliminate processed foods, sugar, alcohol. Add probiotics daily. Practice stress reduction (meditation, yoga). Ensure all vaccinations current. Consult immunologist if fevers persist.'
    },
    'influenza': {
      first: 'Get annual flu vaccine, wash hands frequently, avoid close contact with sick individuals, and maintain strong immunity through proper nutrition and sleep.',
      second: 'Enhanced flu prevention: Get flu vaccine every fall. Avoid touching face (eyes, nose, mouth). Disinfect high-touch surfaces daily. Take vitamin D (2000-4000 IU daily) especially in winter. Eat antiviral foods (garlic, ginger, honey, green tea). Sleep 8+ hours nightly. Exercise moderately 30 minutes daily. Stay hydrated. Avoid crowded indoor spaces during flu season.',
      third: 'Intensive flu protection: Annual flu vaccine mandatory. Consider pneumonia vaccine if high-risk. Take immune-boosting supplements: vitamin C (1000mg), zinc (30mg), elderberry, echinacea. Maintain strict hand hygiene with alcohol-based sanitizers. Wear mask in crowded areas during peak season. Boost gut health with probiotics and fermented foods. Get blood work to check immune markers. Consider antiviral prophylaxis if immunocompromised. Consult infectious disease specialist for recurrent cases.'
    },
    'common cold': {
      first: 'Wash hands regularly, avoid sharing utensils, get adequate rest, stay hydrated, and maintain balanced nutrition.',
      second: 'Cold prevention strategy: Wash hands with soap for 20+ seconds frequently. Don\'t share drinks/utensils. Sleep 7-8 hours consistently. Take vitamin C (500-1000mg) and zinc (15-30mg) daily. Eat citrus fruits, berries, leafy greens. Exercise regularly to boost immunity. Manage stress levels. Avoid touching face. Use hand sanitizer when soap unavailable. Stay warm in cold weather.',
      third: 'Comprehensive cold prevention: Strengthen immunity with supplements: vitamin C (1000mg), vitamin D (2000 IU), zinc (30mg), probiotics. Practice rigorous hand hygiene. Disinfect phones, keyboards, doorknobs daily. Use saline nasal rinses. Humidify indoor air (40-50%). Avoid cigarette smoke completely. Get adequate sleep with consistent schedule. Exercise 30 minutes daily. Manage chronic stress through meditation/therapy. Consider allergy testing if frequent colds. Get immune system evaluation (CBC, vitamin levels). Avoid close contact with sick individuals.'
    },
    'motion sickness': {
      first: 'Sit in stable areas (front seat, middle of boat), focus on horizon, avoid reading while moving, and eat light meals before travel.',
      second: 'Motion sickness management: Take ginger supplements (500-1000mg) or ginger tea before travel. Use acupressure wristbands. Sit in front seat or over wing in planes. Fix gaze on distant stable point. Get fresh air when possible. Avoid heavy, greasy, or spicy foods before travel. Stay well-hydrated. Don\'t read or use screens while moving. Take breaks during long trips. Consider antihistamines (meclizine) 1 hour before travel.',
      third: 'Advanced motion sickness prevention: Consult ENT specialist for vestibular testing. Consider prescription scopolamine patches for severe cases. Vestibular rehabilitation therapy to improve balance system. Take daily ginger supplements (1000mg). Practice habituation exercises - gradual exposure to motion. Avoid alcohol 24 hours before travel. Sleep adequately before trips. Eat protein-rich, low-fat meal 2-3 hours before. Use electronic relief devices (Relief Band). Consider cognitive behavioral therapy for anxiety-related motion sickness. Stay hydrated with electrolyte drinks. Sit in well-ventilated areas. Avoid strong odors.'
    },
    'cardiac issue': {
      first: 'Maintain healthy diet, exercise regularly, manage stress, monitor blood pressure, avoid smoking, and limit alcohol consumption.',
      second: 'Heart health optimization: Follow Mediterranean or DASH diet (low sodium, high fiber). Exercise 150 minutes weekly (walking, swimming). Monitor blood pressure daily. Take prescribed medications consistently. Limit sodium to 1500-2000mg daily. Manage cholesterol through diet and statins if needed. Reduce stress with meditation, yoga. Sleep 7-8 hours nightly. Maintain healthy weight (BMI 18.5-24.9). Limit alcohol to 1 drink daily or less. Check blood sugar regularly. Take omega-3 supplements (1000mg).',
      third: 'Intensive cardiac prevention: Complete cardiac workup (echocardiogram, stress test, coronary calcium score, advanced lipid panel). Strict medication compliance (beta-blockers, ACE inhibitors, statins). Cardiac rehabilitation program with supervised exercise. Very low sodium diet (<1500mg). Daily blood pressure and weight monitoring. Take aspirin if prescribed. Manage diabetes aggressively (HbA1c <7%). Regular cardiology visits every 3-6 months. Implantable devices if indicated (pacemaker, ICD). Stress management therapy mandatory. Emergency action plan with family. Keep nitroglycerin accessible. Learn CPR for family members. Avoid all tobacco and secondhand smoke.'
    },
    'asthma': {
      first: 'Identify and avoid triggers, use prescribed inhalers correctly, monitor symptoms, and keep rescue inhaler accessible.',
      second: 'Asthma control plan: Use controller inhaler daily as prescribed (even when feeling well). Keep rescue inhaler always accessible. Use peak flow meter daily to monitor lung function. Avoid triggers: smoke, dust, pollen, pet dander, cold air, exercise without warm-up. Get annual flu vaccine. Use air purifier with HEPA filter. Cover nose/mouth in cold weather. Take allergy medications if allergic asthma. Maintain healthy weight. Exercise regularly with proper warm-up. Keep home humidity 30-50%.',
      third: 'Comprehensive asthma management: See pulmonologist regularly. Get pulmonary function tests (spirometry) every 6-12 months. Use prescribed controller medications daily (inhaled corticosteroids, long-acting beta-agonists). Develop written asthma action plan with doctor. Use spacer device with inhalers. Consider biologic medications for severe asthma. Get allergy testing and immunotherapy if indicated. Remove carpets, use allergen-proof bedding covers. Install whole-home air filtration. Monitor peak flow twice daily. Consider vitamin D supplementation. Practice breathing exercises. Avoid NSAIDs if aspirin-sensitive. Keep emergency medications always available. Educate family on emergency response.'
    },
    'food poisoning': {
      first: 'Practice proper food handling, cook meats thoroughly, refrigerate promptly, wash hands before food preparation, and avoid cross-contamination.',
      second: 'Food safety protocol: Wash hands with soap for 20 seconds before cooking and eating. Cook meats to safe temperatures (165°F poultry, 160°F ground meat, 145°F whole cuts). Refrigerate within 2 hours (1 hour if temp >90°F). Use separate cutting boards for raw meat and produce. Wash fruits/vegetables thoroughly. Avoid raw/undercooked eggs, meat, seafood. Check expiration dates. Don\'t consume bulging cans or foul-smelling food. Reheat leftovers to 165°F. Thaw frozen foods in refrigerator, not counter.',
      third: 'Intensive food safety measures: Take food handler safety course. Use food thermometer for all cooking. Sanitize kitchen surfaces with bleach solution daily. Replace sponges weekly. Wash dish towels in hot water after each use. Avoid high-risk foods if immunocompromised (raw sprouts, unpasteurized dairy, deli meats, raw shellfish). Store raw meat on bottom shelf to prevent drips. Use refrigerator thermometer (keep at 40°F or below). Label and date all leftovers - discard after 3-4 days. Avoid buffets and salad bars. Don\'t consume food from damaged or unlabeled containers. If recurrent, see gastroenterologist for evaluation of underlying GI issues.'
    },
    'dehydration': {
      first: 'Drink adequate water throughout the day, increase fluids during exercise or hot weather, and monitor urine color (should be pale yellow).',
      second: 'Hydration optimization: Drink 8-10 glasses (64-80 oz) water daily. Increase intake during exercise, heat, illness. Drink before feeling thirsty. Consume electrolyte drinks during prolonged exercise (>1 hour). Eat water-rich foods (watermelon, cucumbers, oranges). Limit caffeine and alcohol (both dehydrating). Monitor urine color - aim for pale yellow. Weigh before/after exercise - replace each pound lost with 16-20 oz fluid. Sip fluids throughout day, not large amounts at once. Carry reusable water bottle.',
      third: 'Comprehensive hydration management: Calculate individual fluid needs (body weight in kg × 30-40ml). Set timed reminders to drink every hour. Use hydration tracking apps. Drink electrolyte solutions, not just water, if exercising heavily or in heat. Get blood work to check electrolytes (sodium, potassium). Rule out underlying causes: diabetes, kidney disease, medications. If chronic dehydration, see nephrologist. Consider IV hydration therapy if severe recurrent dehydration. Avoid diuretic medications if possible. Increase salt intake if low blood pressure. Monitor daily weight - sudden loss suggests dehydration. Keep oral rehydration solution at home.'
    },
    'uti': {
      first: 'Stay well-hydrated, urinate after intercourse, wipe front to back, wear breathable cotton underwear, and don\'t hold urine for long periods.',
      second: 'UTI prevention plan: Drink 8-10 glasses water daily to flush bacteria. Urinate every 2-3 hours - don\'t hold it. Empty bladder completely each time. Urinate before and after sexual activity. Wipe front to back after bowel movements. Avoid irritating feminine products (douches, sprays, powders). Wear cotton underwear, avoid tight pants. Take showers instead of baths. Consider cranberry supplements or D-mannose (2000mg daily). Avoid spermicides and diaphragms if prone to UTIs. Change out of wet swimsuits promptly.',
      third: 'Intensive UTI prevention: See urologist for evaluation of recurrent UTIs (>2 per year). Get imaging (ultrasound, CT) to rule out structural abnormalities. Consider low-dose antibiotic prophylaxis after intercourse or daily if frequent infections. Take D-mannose (2000mg twice daily) and cranberry extract (500mg daily). Increase water intake to 10-12 glasses daily. Use vaginal estrogen if postmenopausal. Consider probiotic supplements for vaginal health (Lactobacillus). Get urine culture with each infection to guide treatment. Rule out diabetes. Practice pelvic floor exercises. Avoid constipation. Consider methenamine hippurate supplement. If anatomical issues, may need surgical correction.'
    },
    'sinusitis': {
      first: 'Use saline nasal rinses, stay hydrated, use humidifier, avoid irritants (smoke, strong odors), and manage allergies.',
      second: 'Sinus health maintenance: Use saline nasal irrigation (neti pot or squeeze bottle) 1-2 times daily. Drink plenty of fluids to thin mucus. Use humidifier (40-50% humidity). Apply warm compresses to face. Sleep with head elevated. Avoid cigarette smoke and air pollution. Take decongestants for short-term relief (<3 days). Use nasal corticosteroid spray if chronic. Treat allergies with antihistamines. Avoid chlorinated pools. Take vitamin C and zinc for immunity. Steam inhalation 2-3 times daily.',
      third: 'Comprehensive sinusitis prevention: See ENT specialist for evaluation. Get CT scan to assess sinus anatomy. Consider allergy testing and immunotherapy. Use daily nasal corticosteroid spray (fluticasone). Saline irrigation twice daily with sterile or distilled water. Install HEPA air filters in home. Treat underlying conditions: allergies, asthma, nasal polyps, deviated septum. Consider functional endoscopic sinus surgery (FESS) if chronic/recurrent. Avoid known allergens completely. Take probiotics to support immune system. Manage GERD if present. Use prescription antibiotics appropriately. Consider antifungal treatment if indicated. Maintain optimal humidity in home.'
    },
    'allergic rhinitis': {
      first: 'Identify and avoid allergen triggers, keep windows closed during high pollen days, use air conditioning, and shower after outdoor activities.',
      second: 'Allergy management: Take daily non-sedating antihistamine (cetirizine, loratadine). Use nasal corticosteroid spray daily during allergy season. Check daily pollen counts, stay indoors when high. Keep windows closed, use AC with HEPA filter. Shower and change clothes after being outdoors. Wash bedding weekly in hot water. Use allergen-proof pillow and mattress covers. Remove carpeting if possible. Vacuum with HEPA filter weekly. Keep pets out of bedroom. Avoid outdoor activities early morning when pollen highest. Wear sunglasses to protect eyes.',
      third: 'Intensive allergic rhinitis control: Get comprehensive allergy testing (skin or blood). See allergist for immunotherapy (allergy shots or sublingual tablets) - most effective long-term treatment. Use combination therapy: daily antihistamine + nasal corticosteroid + leukotriene modifier. Consider biologic medications (omalizumab) for severe cases. Install whole-home HEPA filtration. Remove carpets, heavy drapes, upholstered furniture. Use dehumidifier to prevent mold (<50% humidity). Wash hands and face after outdoor exposure. Use saline nasal rinses twice daily. Consider moving to low-allergen climate if severe. Avoid yard work or wear N95 mask. Keep car windows closed, use recirculation mode. Monitor and treat associated conditions (asthma, sinusitis).'
    },
    'otitis media': {
      first: 'Avoid secondhand smoke, practice good hand hygiene, keep vaccinations current, and avoid bottle-feeding while lying flat.',
      second: 'Ear infection prevention: Keep up with all vaccinations (pneumococcal, flu). Avoid cigarette smoke exposure completely. Wash hands frequently. Don\'t share cups or utensils. Treat colds/allergies promptly to prevent fluid buildup. Avoid pacifier use after 6 months (children). Feed infants upright, not lying down. Breastfeed if possible (protective). Avoid daycare centers with many children if prone to infections. Use humidifier in bedroom. Manage allergies with antihistamines.',
      third: 'Comprehensive ear infection prevention: See ENT specialist for evaluation. Consider tympanostomy tubes (ear tubes) if recurrent (>3 in 6 months or >4 in 1 year). Get hearing test to check for damage. Treat chronic allergies aggressively with nasal steroids. Consider adenoidectomy if enlarged adenoids blocking Eustachian tubes. Take vitamin D (2000 IU daily) and probiotics for immune support. Use xylitol gum or nasal spray (reduces bacterial adherence). Avoid known allergens. Keep sinuses clear with saline rinses. Rule out immune deficiency if very frequent. Consider low-dose antibiotic prophylaxis during cold season if severe recurrent cases. Maintain good nasal hygiene.'
    },
    'appendicitis': {
      first: 'Eat high-fiber diet with fruits, vegetables, and whole grains to prevent obstruction. Stay well-hydrated and maintain regular bowel movements.',
      second: 'Digestive health for appendix protection: Eat 25-30g fiber daily (whole grains, beans, fruits, vegetables). Drink 8-10 glasses water daily. Avoid processed foods and excessive red meat. Eat probiotics (yogurt, kefir) daily. Maintain regular bowel movements - don\'t ignore urge. Avoid seeds/nuts if prone to appendix issues (controversial). Treat constipation promptly with fiber/fluids. Exercise regularly to promote healthy digestion. Avoid excessive abdominal trauma.',
      third: 'Post-appendicitis or recurrent abdominal pain management: If previous appendicitis, maintain high-fiber diet permanently. Take probiotics daily for gut health. Stay well-hydrated (10+ glasses daily). Avoid heavy meals, eat smaller frequent portions. Manage stress which affects digestion. See gastroenterologist for chronic abdominal pain evaluation. Rule out IBD, celiac disease, other GI conditions. Get imaging (ultrasound, CT) if recurrent right lower quadrant pain. Avoid NSAIDs which can cause GI inflammation. Know warning signs of appendicitis (seek immediate care for severe right lower pain, fever, vomiting). Keep emergency contacts readily available.'
    },
    'hay fever': {
      first: 'Monitor pollen forecasts, keep windows closed during high pollen days, shower after outdoor exposure, and use air conditioning with filters.',
      second: 'Seasonal allergy control: Take daily antihistamine before season starts. Use nasal corticosteroid spray daily. Check pollen counts on weather apps. Stay indoors 5am-10am when pollen highest. Wear wraparound sunglasses outdoors. Shower and wash hair before bed to remove pollen. Change clothes after outdoor activities. Dry laundry indoors, not outside. Use HEPA air purifier in bedroom. Vacuum with HEPA filter 2-3 times weekly. Keep car windows closed. Avoid mowing lawn or gardening during peak season.',
      third: 'Comprehensive hay fever management: Get allergy testing to identify specific triggers. Start immunotherapy (allergy shots or sublingual tablets) - only cure for allergies. Begin medications 2 weeks before season starts. Use triple therapy: antihistamine + nasal steroid + leukotriene inhibitor. Consider prescription antihistamine (desloratadine) for better control. Install HEPA filtration throughout home. Remove carpet, replace with hard floors. Wash bedding in 130°F+ water weekly. Use allergen-proof covers on pillows/mattress. Keep humidity low to prevent mold. Consider moving to low-pollen area if severe. Avoid outdoor exercise during high pollen. Rinse sinuses with saline twice daily. Take vitamin C and quercetin as natural antihistamines.'
    },
    'conjunctivitis': {
      first: 'Wash hands frequently, avoid touching eyes, don\'t share towels or pillowcases, and replace eye makeup regularly.',
      second: 'Eye infection prevention: Wash hands thoroughly before touching face or eyes. Avoid rubbing eyes. Don\'t share towels, washcloths, eye makeup, or contact lenses. Remove eye makeup every night. Replace mascara every 3 months. Clean contact lenses properly with fresh solution daily. Don\'t sleep in contact lenses. Avoid swimming in contaminated water. Use protective eyewear when needed. Disinfect surfaces if someone has conjunctivitis. Wash pillowcases and towels in hot water if infected.',
      third: 'Intensive conjunctivitis prevention: See ophthalmologist for recurrent cases. Test for underlying causes: allergies, dry eye, blepharitis, blocked tear ducts. If allergic, use daily antihistamine eye drops. If dry eye, use preservative-free artificial tears 4-6 times daily. Practice strict hand hygiene - don\'t touch eyes. Replace all eye makeup after infection. Consider daily disposable contact lenses instead of monthly. Use proper lens hygiene - never use tap water, replace case monthly. Get lid scrubs for blepharitis. Take omega-3 supplements for dry eye (1000mg daily). Use warm compresses daily. Avoid eye irritants (smoke, chlorine, wind). Install humidifier if dry environment. If bacterial recurrent, may need prophylactic antibiotic ointment.'
    },
    'sciatica': {
      first: 'Practice good posture, avoid prolonged sitting, maintain healthy weight, use proper lifting techniques, and stretch regularly.',
      second: 'Sciatica prevention: Strengthen core muscles with daily exercises (planks, bridges). Stretch hamstrings and hip flexors daily. Practice proper posture - sit with back supported, feet flat. Take breaks from sitting every 30 minutes - walk around. Use ergonomic chair with lumbar support. Maintain healthy weight (reduces spinal stress). Lift with legs, not back - bend knees, keep back straight. Sleep on side with pillow between knees. Exercise regularly (swimming, walking, yoga). Avoid high heels. Stretch before physical activity.',
      third: 'Comprehensive sciatica management: See spine specialist or physical therapist. Get MRI to assess disc herniation or stenosis. Physical therapy program with supervised exercises. Daily core strengthening and flexibility routine. Consider epidural steroid injections for severe cases. Practice McKenzie exercises to centralize pain. Use standing desk or alternating sit-stand. Get ergonomic assessment of workstation. Maintain ideal weight - lose weight if overweight. Take anti-inflammatory supplements (turmeric, omega-3). Apply ice/heat alternately. Consider acupuncture or chiropractic care. Avoid activities that worsen symptoms. If severe/progressive weakness, may need surgery consultation. Practice stress reduction - muscle tension worsens pain.'
    },
    'tension headache': {
      first: 'Maintain regular sleep schedule, limit screen glare, manage caffeine, stay hydrated, and avoid skipping meals.',
      second: 'Strict migraine prevention: Sleep/wake at same time daily (even weekends). Limit screen time to 2-hour blocks with 20-minute breaks. Stay hydrated (2-3 liters water daily). Avoid trigger foods (aged cheese, processed meats, MSG, artificial sweeteners). Reduce caffeine to max 200mg/day. Practice daily neck/shoulder stretches. Keep headache diary noting triggers, duration, severity.',
      third: 'Intensive prevention protocol: Get eye exam and update prescription if needed. Check for TMJ (jaw) disorders. Consider physical therapy for neck/posture issues. Eliminate all known triggers completely. Take magnesium (400-500mg daily). Practice biofeedback or cognitive behavioral therapy. Maintain consistent meal times. Consider preventive medication consultation with neurologist. Track barometric pressure, sleep quality, hormone cycles.'
    },
    'strep throat': {
      first: 'Practice good hand hygiene, avoid sharing utensils or drinks, stay away from infected individuals, and don\'t touch face unnecessarily.',
      second: 'Strep prevention: Wash hands with soap for 20+ seconds frequently. Don\'t share cups, utensils, toothbrushes. Avoid close contact with people who have strep. Disinfect frequently-touched surfaces. Replace toothbrush after strep infection. Boost immunity with vitamin C (1000mg), vitamin D (2000 IU), zinc (30mg). Get adequate sleep (7-8 hours). Manage stress. Gargle with warm salt water if exposed. Avoid crowded spaces during outbreaks.',
      third: 'Intensive strep prevention: See ENT if recurrent (>6 episodes/year). Consider tonsillectomy if chronic recurrent strep. Get throat culture for family members if carrier suspected. Take probiotics daily for oral/gut health. Use antimicrobial mouthwash if prone to infections. Boost immune system: adequate sleep, balanced diet, stress management, regular exercise. Replace toothbrush monthly. Disinfect phones, keyboards regularly. Avoid sharing food/drinks completely. If recurrent, may need prophylactic antibiotics during high-risk periods. Rule out immune deficiency with blood work. Consider allergy testing if chronic throat issues.'
    },
    'labyrinthitis': {
      first: 'Treat ear and respiratory infections promptly, avoid head trauma, stay hydrated, and manage stress which can trigger episodes.',
      second: 'Inner ear protection: Treat upper respiratory infections and ear infections promptly. Avoid sudden head movements. Stay well-hydrated (8-10 glasses daily). Get adequate sleep. Manage stress with relaxation techniques. Avoid alcohol and caffeine which affect inner ear. Don\'t smoke. Use ear protection in loud environments. Treat allergies to prevent Eustachian tube blockage. Take ginger supplements for vestibular support. Practice balance exercises when well.',
      third: 'Comprehensive vestibular health: See ENT/neurotologist for recurrent episodes. Get vestibular function testing (VNG, VEMP). Consider MRI to rule out acoustic neuroma or MS. Vestibular rehabilitation therapy with specialized physical therapist. Avoid triggers: loud noise, head trauma, rapid position changes. Take supplements: vitamin D (2000 IU), magnesium (400mg), ginkgo biloba. Manage cardiovascular health (affects inner ear blood flow). Treat migraines if present (often associated). Consider antiviral prophylaxis if viral cause suspected. Keep medication for acute episodes (antihistamines, antiemetics). Avoid driving during active symptoms. Fall-proof home environment.'
    },
    'pericarditis': {
      first: 'Treat viral infections promptly, avoid excessive physical exertion during illness, and maintain heart-healthy lifestyle.',
      second: 'Heart protection after pericarditis: Rest adequately during and after illness. Avoid strenuous exercise for 3 months after episode. Take anti-inflammatory medications as prescribed (colchicine, NSAIDs). Follow up with cardiologist regularly. Treat infections promptly. Manage autoimmune conditions if present. Get adequate sleep. Eat anti-inflammatory diet (Mediterranean). Avoid alcohol and smoking. Monitor for recurrence symptoms (chest pain, friction rub). Stay hydrated.',
      third: 'Intensive pericarditis prevention: See cardiologist regularly (every 3-6 months). Get echocardiogram to monitor for complications. Take colchicine prophylaxis if recurrent (0.6mg daily or twice daily). Consider corticosteroids if refractory. Treat underlying causes: autoimmune disease, infections, uremia. Avoid NSAIDs if kidney disease present. Maintain anti-inflammatory lifestyle: Mediterranean diet, regular gentle exercise (after clearance), stress management. Monitor cardiac enzymes and inflammatory markers (CRP, ESR). Get pericardiocentesis if large effusion. Consider pericardiectomy if constrictive pericarditis develops. Avoid triggering factors: chest trauma, intense exercise during illness. Keep emergency contact information readily available.'
    },
    'gastritis': {
      first: 'Avoid NSAIDs and aspirin, limit alcohol, reduce stress, eat regular meals, and avoid spicy or acidic foods.',
      second: 'Stomach protection: Avoid NSAIDs (ibuprofen, aspirin) - use acetaminophen for pain. Limit or eliminate alcohol. Quit smoking. Avoid trigger foods: spicy, acidic (citrus, tomatoes), fried, fatty foods. Eat smaller frequent meals (5-6 per day). Don\'t eat 3 hours before bed. Manage stress with relaxation techniques. Take probiotics for gut health. Avoid caffeine and carbonated drinks. Stay well-hydrated. Eat slowly and chew thoroughly.',
      third: 'Comprehensive gastritis management: Get upper endoscopy to assess severity and rule out H. pylori. If H. pylori positive, complete antibiotic eradication therapy. Take PPI (proton pump inhibitor) as prescribed for healing. Avoid all NSAIDs - discuss alternatives with doctor. Eliminate alcohol completely. Follow bland diet initially: bananas, rice, applesauce, toast, oatmeal. Add probiotics and foods rich in flavonoids (berries, apples, celery). Take zinc carnosine for stomach lining healing. Avoid smoking and secondhand smoke. Manage stress through therapy, meditation, yoga. Eat probiotic-rich foods (yogurt, kefir, sauerkraut). Consider vitamin B12 supplementation if chronic. Monitor for anemia. Follow up with gastroenterologist regularly.'
    },
    'lumbar strain': {
      first: 'Practice proper lifting techniques, strengthen core muscles, maintain good posture, avoid prolonged sitting, and stretch regularly.',
      second: 'Back injury prevention: Strengthen core with daily exercises (planks, bird dogs, bridges). Stretch hamstrings and hip flexors daily. Use proper lifting technique: bend knees, keep load close, don\'t twist. Maintain good posture: shoulders back, neutral spine. Take breaks from sitting every 30 minutes. Use ergonomic chair with lumbar support. Sleep on supportive mattress, side sleeping with pillow between knees. Maintain healthy weight. Exercise regularly (walking, swimming). Warm up before physical activity.',
      third: 'Intensive lumbar protection: See physical therapist for personalized exercise program. Get ergonomic assessment of workstation. Strengthen core muscles 4-5 days per week. Practice proper body mechanics consistently. Use standing desk or alternating sit-stand workstation. Get supportive mattress (medium-firm). Consider physical therapy for chronic issues. Take anti-inflammatory supplements (turmeric, omega-3). Apply ice after activity, heat for stiffness. Avoid repetitive bending/twisting. Maintain ideal weight - lose weight if overweight. Practice yoga or Pilates for core strength and flexibility. Avoid heavy lifting or use proper equipment. Consider back brace for heavy work. If recurrent, get MRI to rule out disc issues.'
    },
    'lumbar sprain': {
      first: 'Practice proper lifting techniques, strengthen core muscles, maintain good posture, avoid prolonged sitting, and stretch regularly.',
      second: 'Back injury prevention: Strengthen core with daily exercises (planks, bird dogs, bridges). Stretch hamstrings and hip flexors daily. Use proper lifting technique: bend knees, keep load close, don\'t twist. Maintain good posture: shoulders back, neutral spine. Take breaks from sitting every 30 minutes. Use ergonomic chair with lumbar support. Sleep on supportive mattress, side sleeping with pillow between knees. Maintain healthy weight. Exercise regularly (walking, swimming). Warm up before physical activity.',
      third: 'Intensive lumbar protection: See physical therapist for personalized exercise program. Get ergonomic assessment of workstation. Strengthen core muscles 4-5 days per week. Practice proper body mechanics consistently. Use standing desk or alternating sit-stand workstation. Get supportive mattress (medium-firm). Consider physical therapy for chronic issues. Take anti-inflammatory supplements (turmeric, omega-3). Apply ice after activity, heat for stiffness. Avoid repetitive bending/twisting. Maintain ideal weight - lose weight if overweight. Practice yoga or Pilates for core strength and flexibility. Avoid heavy lifting or use proper equipment. Consider back brace for heavy work. If recurrent, get MRI to rule out disc issues.'
    },
    'hypothyroidism': {
      first: 'Take thyroid medication consistently, maintain balanced diet with adequate iodine and selenium, and monitor thyroid levels regularly.',
      second: 'Thyroid health maintenance: Take levothyroxine on empty stomach, same time daily (30-60 minutes before food). Don\'t take with calcium, iron, or antacids (separate by 4 hours). Eat iodine-rich foods (seafood, dairy, iodized salt) but don\'t over-supplement. Get selenium from Brazil nuts, fish, eggs. Avoid excessive raw cruciferous vegetables (can interfere with thyroid). Get adequate vitamin D, B12, iron. Manage stress - affects thyroid function. Exercise regularly. Get thyroid levels checked every 6-12 months or when changing dose.',
      third: 'Comprehensive hypothyroidism management: See endocrinologist regularly. Get complete thyroid panel (TSH, Free T4, Free T3, antibodies) every 3-6 months initially. Take medication exactly as prescribed - never skip doses. Consider T3/T4 combination if not responding to T4 alone. Check for nutrient deficiencies: iron, vitamin D, B12, selenium. Treat if deficient. Eat thyroid-supporting diet: iodine, selenium, zinc, vitamin D. Avoid goitrogens if thyroid not well-controlled. Manage autoimmune condition if Hashimoto\'s (gluten-free diet may help). Maintain healthy weight through proper medication dosing. Address associated symptoms: depression, high cholesterol. Monitor bone density if long-term thyroid medication. Adjust dose with weight changes, pregnancy, medications.'
    },
    'cough': {
      first: 'Avoid smoke exposure, wash hands often, use a humidifier, and support immunity with balanced nutrition.',
      second: 'Enhanced respiratory protection: Use air purifier with HEPA filter in bedroom. Avoid cold air exposure - wear scarf over mouth outdoors. Eliminate dairy products temporarily (increases mucus). Drink warm fluids (herbal teas with honey, ginger) 4-5 times daily. Steam inhalation twice daily. Elevate head while sleeping. Avoid allergens (dust, pet dander, pollen). Take vitamin C and elderberry supplements.',
      third: 'Aggressive respiratory health plan: Get chest X-ray and pulmonary function test. Test for allergies, asthma, acid reflux (GERD). Use prescribed inhaler preventatively if asthmatic. Install whole-home air filtration. Remove carpets/curtains that trap allergens. Practice breathing exercises (pursed-lip breathing). Avoid all irritants (perfumes, cleaning chemicals, smoke). Consider immunotherapy for allergies. Maintain humidity 40-50%. See pulmonologist for chronic cough evaluation.'
    },
    'sore throat': {
      first: 'Hydrate, avoid irritants (smoke/pollution), practice hand hygiene, and do saline gargles.',
      second: 'Throat protection strategy: Gargle with warm salt water 3 times daily. Use throat lozenges with zinc. Drink warm liquids (herbal tea with honey and lemon) throughout day. Avoid shouting/straining voice. Use humidifier at night. Boost immunity with vitamin C, echinacea. Avoid acidic foods (citrus, tomatoes) and spicy foods. Change toothbrush monthly. Avoid sharing utensils/drinks.',
      third: 'Comprehensive throat health: Get throat culture to rule out strep. Check for acid reflux (GERD) - avoid late meals, sleep elevated. Test for food allergies. Eliminate sugar and dairy temporarily. Take probiotics for gut/immune health. Use air purifier. Practice vocal rest. Consider tonsil examination by ENT specialist. Strengthen immunity: elderberry, vitamin D, selenium. Avoid mouth breathing - may need sleep study if chronic. Maintain oral hygiene rigorously.'
    },
    'fatigue': {
      first: 'Prioritize sleep, eat balanced meals, and pace activities with gentle movement breaks.',
      second: 'Energy restoration plan: Sleep 8-9 hours in completely dark room. Wake at same time daily. Eat protein-rich breakfast within 1 hour of waking. Take iron supplement if deficient (get blood test). Eat small meals every 3-4 hours. Light exercise 20-30 minutes daily (walking, yoga). Limit caffeine after 2 PM. Eliminate sugar crashes - eat complex carbs. Take B-complex vitamins. Reduce stress - practice relaxation techniques daily.',
      third: 'Comprehensive fatigue management: Get full blood panel (thyroid TSH, iron/ferritin, vitamin D, B12, complete metabolic panel). Screen for sleep apnea. Rule out chronic fatigue syndrome, fibromyalgia, depression. Strict sleep hygiene: no screens 1 hour before bed, cool dark room (65-68°F), white noise. Eliminate processed foods completely. Mediterranean diet with lean proteins, whole grains, vegetables. Consider food sensitivity testing. Daily light therapy if seasonal. Structured exercise program with rest days. Cognitive behavioral therapy for energy management. Check for chronic infections.'
    },
    'nausea': {
      first: 'Eat smaller frequent meals, avoid greasy foods, stay hydrated, and identify personal food triggers.',
      second: 'Digestive protection: Eat 6 small bland meals daily (crackers, rice, bananas, toast, applesauce). Avoid fatty, fried, spicy foods completely. Ginger tea or ginger supplements 3x daily. Stay upright 1 hour after eating. Sip clear fluids between meals (not with food). Avoid strong odors (cooking, perfumes). Take B6 vitamin. Practice deep breathing when nauseated. Identify and eliminate trigger foods (keep food diary). Eat slowly, chew thoroughly.',
      third: 'Advanced nausea prevention: Get upper GI evaluation (endoscopy if needed). Test for H. pylori infection, food allergies, celiac disease. Check for GERD, gastroparesis, gallbladder issues. Eliminate common triggers: caffeine, alcohol, chocolate, mint, tomatoes. Try elimination diet. Consider acupressure wristbands. Take probiotics for gut health. Avoid NSAIDs (ibuprofen) if stomach-related. Stress management critical - therapy/meditation. Stay hydrated with electrolyte solutions. Small amounts of protein with each meal. Consider gastroenterologist consultation for medication options.'
    },
    'dizziness': {
      first: 'Rise slowly from sitting, stay hydrated, eat regular meals, and avoid sudden head movements.',
      second: 'Balance and stability focus: Stand up in stages (sit-stand-walk). Stay well-hydrated (3 liters daily). Eat regular meals with adequate salt (unless contraindicated). Avoid sudden head turns. Do balance exercises daily (stand on one foot, walk heel-to-toe). Check blood pressure regularly. Avoid alcohol. Limit caffeine. Get adequate sleep. Take ginger for motion-related dizziness. Avoid heights and driving if dizzy. Keep blood sugar stable - eat protein/complex carbs every 3-4 hours.',
      third: 'Comprehensive dizziness management: See ENT specialist for vestibular testing (BPPV evaluation, videonystagmography). Get cardiac workup (ECG, Holter monitor) - rule out arrhythmias. Check for anemia, thyroid issues, vitamin B12 deficiency. Blood pressure monitoring - orthostatic hypotension test. Consider MRI to rule out neurological causes. Vestibular rehabilitation therapy with physical therapist. Eliminate medications causing dizziness (review with doctor). Strict hydration protocol. Check for inner ear issues (Meniere\'s disease). Fall-proof home - remove trip hazards, install grab bars. Consider neurologist if symptoms persist.'
    },
    'chest pain': {
      first: 'Manage stress, avoid heavy meals before lying down, reduce smoking exposure, and seek evaluation for recurrent episodes.',
      second: 'Cardiac and respiratory protection: Get EKG and stress test if not done. Avoid heavy meals - eat smaller portions 5-6 times daily. Don\'t eat 3 hours before bed. Elevate head of bed 6 inches if reflux-related. Eliminate trigger foods (caffeine, alcohol, spicy, fatty foods). Practice stress reduction daily (deep breathing, meditation). Monitor blood pressure. Light cardio exercise approved by doctor. Avoid heavy lifting. Stop smoking completely. Limit alcohol. Take antacids if GERD-related. Keep rescue medication nearby.',
      third: 'Intensive chest pain prevention: Complete cardiac evaluation (echocardiogram, coronary calcium score, advanced lipid panel). Rule out costochondritis, anxiety disorders, esophageal issues. If cardiac: strict medication compliance, cardiac rehabilitation program. Low-sodium DASH or Mediterranean diet. Daily gentle exercise (walking). Stress management therapy essential. Monitor cholesterol, blood pressure, blood sugar. Take prescribed medications (statins, beta-blockers) as directed. Eliminate all smoking/secondhand smoke. Limit alcohol to 1 drink or less daily. Maintain healthy weight. Learn warning signs of heart attack. Keep nitroglycerin if prescribed. Regular cardiology follow-up. Emergency action plan discussed with family.'
    }
  };

  private previousOf(item: HistoryItem): HistoryItem | undefined {
    const idx = this.items.findIndex(i => i.id === item.id);
    return idx === -1 ? undefined : this.items[idx + 1];
  }

  // Simple trend prediction (existing)
  predictionFor(item: HistoryItem): string {
    const prev = this.previousOf(item);
    if (!prev) return 'Initial assessment; no prior data.';
    const currRes = item.result;
    const prevRes = prev.result;
    if (!currRes || !prevRes) return 'Insufficient data from prior assessment.';
    const currSev = this.severityRank(currRes.severity);
    const prevSev = this.severityRank(prevRes.severity);
    const trend = currSev === prevSev
      ? 'severity appears stable'
      : currSev > prevSev
        ? 'severity trending up'
        : 'severity trending down';
    const currCond = this.resultCondition(currRes);
    const prevCond = this.resultCondition(prevRes);
    const condNote = currCond === prevCond
      ? `condition persists (${currCond})`
      : `shift from ${prevCond} to ${currCond}`;
    return `${condNote}; ${trend}.`;
  }

  // Prevention guidance using recurrence with detailed strategies
  preventionFor(item: HistoryItem): string {
    if (!item.result) return '';
    const condition = this.resultCondition(item.result).toLowerCase();
    const idx = this.items.findIndex(i => i.id === item.id);
    if (idx === -1) return '';
    
    const priorOccurrences = this.items.slice(idx + 1)
      .filter(i => this.resultCondition(i.result)?.toLowerCase() === condition).length;

    const detailedTips = this.detailedPreventionMap[condition];
    const fallbackTip = 'Maintain healthy sleep, nutrition, hydration, hygiene, and early management of new symptoms to reduce recurrence.';

    if (priorOccurrences === 0) {
      const tip = detailedTips?.first || this.preventionMap[condition] || fallbackTip;
      return `First recorded ${condition}; focus on prevention: ${tip}`;
    }

    if (priorOccurrences === 1) {
      const tip = detailedTips?.second || fallbackTip;
      return `⚠️ 2nd occurrence of ${condition}. Escalated Prevention Plan:\n\n${tip}`;
    }

    if (priorOccurrences === 2) {
      const tip = detailedTips?.third || fallbackTip;
      return `🚨 3rd occurrence of ${condition}. Intensive Prevention Required:\n\n${tip}\n\n⚕️ IMPORTANT: Schedule medical consultation immediately to identify and address underlying causes. This pattern requires professional evaluation and personalized treatment plan.`;
    }

    if (priorOccurrences >= 3) {
      const tip = detailedTips?.third || fallbackTip;
      return `🆘 Frequent ${condition} (occurrence ${priorOccurrences + 1}). URGENT MEDICAL ATTENTION NEEDED:\n\n${tip}\n\n⚕️ CRITICAL: This recurring pattern indicates a chronic condition requiring immediate professional diagnosis and comprehensive treatment. Do not delay medical consultation.`;
    }

    return fallbackTip;
  }
}