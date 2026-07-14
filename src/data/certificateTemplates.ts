// Content presets (document types) and visual themes for the Certificates
// designer. Combining N document types × M themes gives every printable
// design without hand-authoring a component per combination.

export interface DocumentType {
  id: string;
  kind: 'certificate' | 'attestation';
  label: { en: string; fr: string };
  /** Seed paragraph for the rich-text body, shown below the recipient's name. {class} {school} {year} get substituted at render time. */
  body: { en: string; fr: string };
}

export const DOCUMENT_TYPES: DocumentType[] = [
  {
    id: 'completion',
    kind: 'certificate',
    label: { en: 'Certificate of Completion', fr: 'Certificat de Réussite' },
    body: {
      en: 'This is to certify that the above student has successfully completed the {year} academic year at {school} as a member of {class}.',
      fr: "Il est certifié que l'élève susmentionné(e) a achevé avec succès l'année scolaire {year} à {school} en tant que membre de {class}.",
    },
  },
  {
    id: 'achievement',
    kind: 'certificate',
    label: { en: 'Certificate of Achievement', fr: 'Certificat de Mérite' },
    body: {
      en: 'Presented in recognition of outstanding achievement and dedication demonstrated during the {year} academic year.',
      fr: "Décerné en reconnaissance d'un mérite exceptionnel et d'un engagement remarquable durant l'année scolaire {year}.",
    },
  },
  {
    id: 'excellence',
    kind: 'certificate',
    label: { en: 'Certificate of Academic Excellence', fr: "Certificat d'Excellence Académique" },
    body: {
      en: 'Awarded for exceptional academic performance, ranking among the top students of {class} during the {year} academic year.',
      fr: "Décerné pour une performance académique exceptionnelle, classant l'élève parmi les meilleurs de {class} durant l'année scolaire {year}.",
    },
  },
  {
    id: 'attendance_cert',
    kind: 'certificate',
    label: { en: 'Certificate of Perfect Attendance', fr: "Certificat d'Assiduité Parfaite" },
    body: {
      en: 'This is to certify that the above student maintained perfect attendance throughout the {year} academic year at {school}.',
      fr: "Il est certifié que l'élève susmentionné(e) a maintenu une assiduité parfaite tout au long de l'année scolaire {year} à {school}.",
    },
  },
  {
    id: 'good_conduct',
    kind: 'certificate',
    label: { en: 'Certificate of Good Conduct', fr: 'Certificat de Bonne Conduite' },
    body: {
      en: 'This is to certify that the above student, a member of {class}, has consistently demonstrated excellent conduct and discipline at {school}.',
      fr: "Il est certifié que l'élève susmentionné(e), membre de {class}, a constamment fait preuve d'une excellente conduite et discipline à {school}.",
    },
  },
  {
    id: 'excursion',
    kind: 'certificate',
    label: { en: 'Certificate of Participation', fr: 'Certificat de Participation' },
    body: {
      en: 'Presented for active and commendable participation in school activities during the {year} academic year, as a member of {class}.',
      fr: "Décerné pour une participation active et remarquable aux activités scolaires durant l'année {year}, en tant que membre de {class}.",
    },
  },
  {
    id: 'enrollment_attestation',
    kind: 'attestation',
    label: { en: 'Attestation of Enrollment', fr: "Attestation d'Inscription" },
    body: {
      en: 'This is to attest that the above-named individual is a duly enrolled and registered student of {class} at {school} for the {year} academic year.',
      fr: "Il est attesté que la personne susmentionnée est régulièrement inscrite en tant qu'élève de {class} à {school} pour l'année scolaire {year}.",
    },
  },
  {
    id: 'attendance_attestation',
    kind: 'attestation',
    label: { en: 'Attestation of Attendance', fr: 'Attestation de Fréquentation' },
    body: {
      en: 'This is to attest that the above-named individual is currently attending {school} as a student of {class} and is in good academic standing.',
      fr: "Il est attesté que la personne susmentionnée fréquente actuellement {school} en tant qu'élève de {class} et est en règle sur le plan académique.",
    },
  },
  {
    id: 'transfer',
    kind: 'attestation',
    label: { en: 'Transfer Certificate', fr: 'Certificat de Transfert' },
    body: {
      en: 'This is to certify that the above student, a member of {class}, has been a bona fide student of {school} and is hereby released in good standing to transfer to another institution.',
      fr: "Il est certifié que l'élève susmentionné(e), membre de {class}, a été un(e) élève de bonne foi de {school} et est libéré(e), en règle, pour un transfert vers un autre établissement.",
    },
  },
];

export interface DesignTheme {
  id: string;
  label: { en: string; fr: string };
  /** [background, accent] swatch colors used for the picker thumbnail. */
  swatch: [string, string];
}

export const DESIGN_THEMES: DesignTheme[] = [
  { id: 'classic-gold',    label: { en: 'Classic Gold',     fr: 'Or Classique' },       swatch: ['#fdf8ec', '#b8860b'] },
  { id: 'modern-indigo',   label: { en: 'Modern Indigo',    fr: 'Indigo Moderne' },     swatch: ['#ffffff', '#4f46e5'] },
  { id: 'elegant-emerald', label: { en: 'Elegant Emerald',  fr: 'Émeraude Élégant' },   swatch: ['#f7fbf8', '#0f7a52'] },
  { id: 'formal-navy',     label: { en: 'Formal Navy Seal', fr: 'Sceau Marine' },       swatch: ['#ffffff', '#1e3a5f'] },
  { id: 'warm-copper',     label: { en: 'Warm Copper',      fr: 'Cuivre Chaleureux' },  swatch: ['#fff8f0', '#b45309'] },
  { id: 'minimalist-mono', label: { en: 'Minimalist Mono',  fr: 'Minimaliste Mono' },   swatch: ['#ffffff', '#18181b'] },
];

export function fillTemplate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? '');
}
