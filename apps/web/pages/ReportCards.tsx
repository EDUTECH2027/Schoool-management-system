import { useState, useEffect, useCallback } from 'react';
import { Printer, Eye, Award, X, RefreshCw, BookOpen, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useBranding } from '../context/BrandingContext';
import { api, type ClassRecord, type Student } from '../api/client';
import { useLanguage } from '../i18n/LanguageContext';
import { StatusBadge } from '../composants/ui/Badge';
import { clsx } from 'clsx';

// Raw DB response types (snake_case)
type RcEntry = {
  id: string; subject_id: string; subject_name: string;
  ca_score: number; exam_score: number; total_score: number;
  grade: string; remark: string; position: number | null; teacher_comment: string | null;
};

type RcRecord = {
  id: string; student_id: string; student_name: string; student_number: string;
  class_name: string; grade_level_name: string;
  term_id: string; term_name: string; academic_year: string;
  total_marks_obtained: number; total_marks_possible: number; percentage: number;
  class_position: number | null; out_of: number | null;
  days_present: number; days_absent: number; total_school_days: number;
  conduct: string | null; class_teacher_comment: string | null; head_teacher_comment: string | null;
  status: string; entries: RcEntry[];
};

type TermRaw = { id: string; name: string; is_current: number; academic_year_id: string; start_date: string; end_date: string };

const gradeColor: Record<string, string> = {
  'A+': 'text-emerald-700', 'A': 'text-green-700', 'B': 'text-blue-700',
  'C':  'text-yellow-700',  'D': 'text-orange-700', 'F': 'text-red-700',
};

// ── Printable report card ─────────────────────────────────────────────────────
function PrintCard({ rc }: { rc: RcRecord }) {
  const { lang } = useLanguage();
  const { schoolInfo, logoUrl } = useBranding();

  const termLabel = rc.term_name === 'first'  ? (lang === 'fr' ? 'Trimestre 1' : 'Term 1')
                  : rc.term_name === 'second' ? (lang === 'fr' ? 'Trimestre 2' : 'Term 2')
                  :                             (lang === 'fr' ? 'Trimestre 3' : 'Term 3');

  const attendancePct = rc.total_school_days
    ? Math.round((rc.days_present / rc.total_school_days) * 100)
    : 0;

  return (
    <div className="bg-white" style={{ fontFamily: 'serif', maxWidth: '210mm', margin: '0 auto', padding: '16mm 14mm' }}>
      {/* Header */}
      <div className="text-center border-b-2 border-slate-800 pb-4 mb-4">
        {logoUrl ? (
          <img src={logoUrl} alt="logo" className="w-16 h-16 object-contain mx-auto mb-2" />
        ) : (
          <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-2">
            <Award size={28} className="text-white" />
          </div>
        )}
        <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-wide">{schoolInfo.name}</h1>
        <p className="text-slate-600 text-sm italic">{schoolInfo.motto}</p>
        <p className="text-slate-500 text-xs mt-1">{schoolInfo.address} · {schoolInfo.phone}</p>
        <div className="mt-3 bg-indigo-700 text-white text-sm font-bold py-1.5 px-4 rounded inline-block uppercase tracking-widest">
          {lang === 'fr' ? 'BULLETIN DE NOTES' : 'STUDENT PROGRESS REPORT'}
        </div>
      </div>

      {/* Student info grid */}
      <div className="grid grid-cols-2 gap-4 mb-5 text-sm">
        <div className="space-y-1.5">
          {([
            [lang === 'fr' ? 'Nom complet' : 'Full Name',    rc.student_name],
            [lang === 'fr' ? 'Matricule'   : 'Adm. No.',     rc.student_number],
            [lang === 'fr' ? 'Classe'      : 'Class',        rc.class_name],
          ] as [string, string][]).map(([label, val]) => (
            <div key={label} className="flex gap-2">
              <span className="text-slate-500 w-36 shrink-0">{label} :</span>
              <span className="font-semibold text-slate-900">{val}</span>
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          {([
            [lang === 'fr' ? 'Année scolaire' : 'Academic Year', rc.academic_year],
            [lang === 'fr' ? 'Trimestre'       : 'Term',          termLabel],
            [lang === 'fr' ? 'Directeur'       : 'Head Teacher',  schoolInfo.headTeacher],
          ] as [string, string][]).map(([label, val]) => (
            <div key={label} className="flex gap-2">
              <span className="text-slate-500 w-36 shrink-0">{label} :</span>
              <span className="font-semibold text-slate-900">{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Marks table */}
      <table className="w-full text-sm border-collapse mb-5">
        <thead>
          <tr className="bg-slate-800 text-white">
            <th className="text-left px-3 py-2 font-semibold">{lang === 'fr' ? 'Matière' : 'Subject'}</th>
            <th className="text-center px-3 py-2 font-semibold">{lang === 'fr' ? 'Séq 1 /100' : 'Seq 1 /100'}</th>
            <th className="text-center px-3 py-2 font-semibold">{lang === 'fr' ? 'Séq 2 /100' : 'Seq 2 /100'}</th>
            <th className="text-center px-3 py-2 font-semibold">Total /100</th>
            <th className="text-center px-3 py-2 font-semibold">{lang === 'fr' ? 'Mention' : 'Grade'}</th>
            <th className="text-center px-3 py-2 font-semibold">{lang === 'fr' ? 'Appréciation' : 'Remark'}</th>
          </tr>
        </thead>
        <tbody>
          {rc.entries.map((e, i) => (
            <tr key={e.subject_id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'} style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td className="px-3 py-2 font-medium text-slate-800">{e.subject_name}</td>
              <td className="px-3 py-2 text-center text-slate-700">{e.ca_score}</td>
              <td className="px-3 py-2 text-center text-slate-700">{e.exam_score}</td>
              <td className="px-3 py-2 text-center font-bold text-slate-900">{e.total_score}</td>
              <td className={clsx('px-3 py-2 text-center font-bold', gradeColor[e.grade] ?? 'text-slate-700')}>{e.grade}</td>
              <td className="px-3 py-2 text-center text-slate-600 text-xs">{e.remark}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-indigo-50" style={{ borderTop: '2px solid #4f46e5' }}>
            <td className="px-3 py-2 font-bold text-slate-800" colSpan={3}>
              {lang === 'fr' ? 'Moyenne générale' : 'Overall Average'}
            </td>
            <td className="px-3 py-2 text-center font-bold text-indigo-700">{rc.percentage}%</td>
            <td className="px-3 py-2 text-center font-bold text-indigo-700" colSpan={2}>
              {lang === 'fr' ? 'Rang' : 'Rank'}: {rc.class_position ?? '—'}/{rc.out_of ?? '—'}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Summary boxes */}
      <div className="grid grid-cols-3 gap-4 mb-5 text-sm">
        <div className="border border-slate-300 rounded p-3 text-center">
          <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">{lang === 'fr' ? 'Classement' : 'Class Position'}</p>
          <p className="text-2xl font-bold text-indigo-700">
            {rc.class_position ?? '—'}<sup className="text-sm">/{rc.out_of ?? '—'}</sup>
          </p>
        </div>
        <div className="border border-slate-300 rounded p-3 text-center">
          <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">{lang === 'fr' ? 'Présence' : 'Attendance'}</p>
          <p className="text-2xl font-bold text-green-700">{attendancePct}%</p>
          <p className="text-xs text-slate-400">{rc.days_present}/{rc.total_school_days} {lang === 'fr' ? 'jours' : 'days'}</p>
        </div>
        <div className="border border-slate-300 rounded p-3 text-center">
          <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">{lang === 'fr' ? 'Conduite' : 'Conduct'}</p>
          <p className="text-lg font-bold text-slate-800">{rc.conduct || '—'}</p>
        </div>
      </div>

      {/* Comments */}
      <div className="space-y-3 mb-6 text-sm">
        <div className="border border-slate-200 rounded p-3">
          <p className="text-xs font-bold text-slate-500 uppercase mb-1">
            {lang === 'fr' ? 'Appréciation du professeur principal' : "Class Teacher's Comment"}
          </p>
          <p className="text-slate-800 italic min-h-6">
            {rc.class_teacher_comment ? `"${rc.class_teacher_comment}"` : ''}
          </p>
        </div>
        <div className="border border-slate-200 rounded p-3">
          <p className="text-xs font-bold text-slate-500 uppercase mb-1">
            {lang === 'fr' ? 'Appréciation du directeur' : "Head Teacher's Comment"}
          </p>
          <p className="text-slate-800 italic min-h-6">
            {rc.head_teacher_comment ? `"${rc.head_teacher_comment}"` : ''}
          </p>
        </div>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-3 gap-8 text-sm border-t border-slate-300 pt-4">
        {[
          lang === 'fr' ? 'Professeur Principal' : 'Class Teacher',
          lang === 'fr' ? 'Directeur' : 'Head Teacher',
          lang === 'fr' ? 'Parent / Tuteur' : 'Parent / Guardian',
        ].map(role => (
          <div key={role} className="text-center">
            <div className="border-b border-slate-400 h-8 mb-1" />
            <p className="text-slate-500 text-xs">{role} ({lang === 'fr' ? 'Signature' : 'Signature'})</p>
          </div>
        ))}
      </div>

      <div className="mt-4 text-center text-xs text-slate-400 border-t border-slate-200 pt-2">
        <p>{lang === 'fr' ? 'Document officiel' : 'Official Progress Report'} · {schoolInfo.name}</p>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ReportCards() {
  const { t, lang } = useLanguage();
  const { schoolInfo } = useBranding();

  const [classes,     setClasses]     = useState<ClassRecord[]>([]);
  const [terms,       setTerms]       = useState<TermRaw[]>([]);
  const [classId,     setClassId]     = useState('');
  const [termId,      setTermId]      = useState('');
  const [students,    setStudents]    = useState<Student[]>([]);
  const [reportCards, setReportCards] = useState<RcRecord[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [generating,  setGenerating]  = useState(false);
  const [previewRc,   setPreviewRc]   = useState<RcRecord | null>(null);
  const [printList,   setPrintList]   = useState<RcRecord[] | null>(null);

  // Load classes and terms on mount
  useEffect(() => {
    Promise.all([api.getClasses(), api.getTerms()])
      .then(([cls, tms]) => {
        setClasses(cls);
        setTerms(tms as TermRaw[]);
        if (cls.length > 0) setClassId(cls[0].id);
        const cur = (tms as TermRaw[]).find(tm => tm.is_current);
        if (cur) setTermId(cur.id);
        else if (tms.length) setTermId(tms[0].id);
      })
      .catch(console.error);
  }, []);

  // Reload cards whenever class or term selection changes
  const loadCards = useCallback(async () => {
    if (!classId || !termId) return;
    setLoading(true);
    try {
      const data = await api.getReportCards({ classId, termId });
      setReportCards(data as unknown as RcRecord[]);
    } catch (err) { console.error(err); }
    setLoading(false);
  }, [classId, termId]);

  useEffect(() => { loadCards(); }, [loadCards]);

  // Load students for the selected class (independent of term — shows who is in the class)
  useEffect(() => {
    if (!classId) { setStudents([]); return; }
    api.getStudents({ classId })
      .then(ss => setStudents(ss as Student[]))
      .catch(console.error);
  }, [classId]);

  // Generate report cards from saved marks
  const [generateMsg, setGenerateMsg] = useState('');

  const handleGenerate = async () => {
    if (!classId || !termId) return;
    setGenerating(true);
    setGenerateMsg('');
    try {
      const result = await api.generateReportCards({ classId, termId });
      setGenerateMsg(
        lang === 'fr'
          ? `${result.generated} bulletin(s) généré(s).`
          : `${result.generated} report card(s) generated.`
      );
      await loadCards();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setGenerateMsg(lang === 'fr' ? `Erreur : ${msg}` : `Error: ${msg}`);
      console.error(err);
    }
    setGenerating(false);
  };

  // Print one or many cards
  const handlePrint = (rcs: RcRecord[]) => {
    setPrintList(rcs);
    setTimeout(() => {
      window.print();
      setPrintList(null);
    }, 300);
  };

  const handleDownloadPdf = () => {
    const cards = studentRows.filter(r => r.rc !== null).map(r => r.rc!);
    if (cards.length === 0) return;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const X = 14;
    const W = 182;

    const tLabel = (name: string) =>
      name === 'first'  ? (lang === 'fr' ? 'Trimestre 1' : 'Term 1')
      : name === 'second' ? (lang === 'fr' ? 'Trimestre 2' : 'Term 2')
      :                     (lang === 'fr' ? 'Trimestre 3' : 'Term 3');

    cards.forEach((rc, idx) => {
      if (idx > 0) doc.addPage();
      let y = 14;

      // ── School header ─────────────────────────────────────────
      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(schoolInfo.name.toUpperCase(), X + W / 2, y, { align: 'center' });
      y += 6;

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(71, 85, 105);
      if (schoolInfo.motto) { doc.text(schoolInfo.motto, X + W / 2, y, { align: 'center' }); y += 5; }
      doc.setFont('helvetica', 'normal');
      doc.text(`${schoolInfo.address || ''}  ·  ${schoolInfo.phone || ''}`, X + W / 2, y, { align: 'center' });
      y += 4;

      doc.setDrawColor(203, 213, 225);
      doc.line(X, y, X + W, y);
      y += 4;

      doc.setFillColor(79, 70, 229);
      doc.roundedRect(X, y, W, 8, 1.5, 1.5, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(lang === 'fr' ? 'BULLETIN DE NOTES' : 'STUDENT PROGRESS REPORT', X + W / 2, y + 5.2, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      y += 12;

      // ── Student info grid ─────────────────────────────────────
      doc.setFontSize(8.5);
      const leftRows: [string, string][] = [
        [lang === 'fr' ? 'Nom complet' : 'Full Name',  rc.student_name   ],
        [lang === 'fr' ? 'Matricule'   : 'Adm. No.',   rc.student_number ],
        [lang === 'fr' ? 'Classe'      : 'Class',       rc.class_name     ],
      ];
      const rightRows: [string, string][] = [
        [lang === 'fr' ? 'Année scolaire' : 'Academic Year', rc.academic_year              ],
        [lang === 'fr' ? 'Trimestre'       : 'Term',          tLabel(rc.term_name)          ],
        [lang === 'fr' ? 'Directeur'       : 'Head Teacher',  schoolInfo.headTeacher || ''],
      ];
      leftRows.forEach(([label, val], i) => {
        doc.setFont('helvetica', 'bold'); doc.setTextColor(100, 116, 139);
        doc.text(`${label} :`, X, y + i * 5.5);
        doc.setFont('helvetica', 'normal'); doc.setTextColor(15, 23, 42);
        doc.text(String(val || ''), X + 36, y + i * 5.5);
      });
      rightRows.forEach(([label, val], i) => {
        doc.setFont('helvetica', 'bold'); doc.setTextColor(100, 116, 139);
        doc.text(`${label} :`, X + W / 2 + 2, y + i * 5.5);
        doc.setFont('helvetica', 'normal'); doc.setTextColor(15, 23, 42);
        doc.text(String(val || ''), X + W / 2 + 40, y + i * 5.5);
      });
      y += 3 * 5.5 + 6;

      // ── Marks table ───────────────────────────────────────────
      autoTable(doc, {
        startY: y,
        head: [[
          lang === 'fr' ? 'Matière'      : 'Subject',
          lang === 'fr' ? 'Séq 1 /100'  : 'CA /100',
          lang === 'fr' ? 'Séq 2 /100'  : 'Exam /100',
          'Total /100',
          lang === 'fr' ? 'Mention'      : 'Grade',
          lang === 'fr' ? 'Appréciation' : 'Remark',
        ]],
        body: rc.entries.map(e => [
          e.subject_name || '', e.ca_score ?? 0, e.exam_score ?? 0,
          e.total_score ?? 0, e.grade || '', e.remark || '',
        ]),
        foot: [[
          { content: lang === 'fr' ? 'Moyenne générale' : 'Overall Average', colSpan: 3,
            styles: { fontStyle: 'bold', fillColor: [238, 242, 255], textColor: [79, 70, 229] } },
          { content: `${rc.percentage}%`,
            styles: { fontStyle: 'bold', halign: 'center', fillColor: [238, 242, 255], textColor: [79, 70, 229] } },
          { content: `${lang === 'fr' ? 'Rang' : 'Rank'}: ${rc.class_position ?? '—'}/${rc.out_of ?? '—'}`, colSpan: 2,
            styles: { fontStyle: 'bold', halign: 'center', fillColor: [238, 242, 255], textColor: [79, 70, 229] } },
        ]],
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, halign: 'center' },
        bodyStyles: { fontSize: 8 },
        footStyles: { fontSize: 8.5 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 55, halign: 'left' },
          1: { halign: 'center', cellWidth: 22 },
          2: { halign: 'center', cellWidth: 22 },
          3: { halign: 'center', cellWidth: 22, fontStyle: 'bold' },
          4: { halign: 'center', cellWidth: 18, fontStyle: 'bold' },
          5: { halign: 'center' },
        },
        margin: { left: X, right: X },
      });
      y = (doc as any).lastAutoTable.finalY + 6;

      // ── Summary boxes ─────────────────────────────────────────
      const BW = (W - 8) / 3;
      const BH = 18;
      const attendancePct = rc.total_school_days
        ? Math.round((rc.days_present / rc.total_school_days) * 100) : 0;

      const drawBox = (bx: number, title: string, value: string, sub?: string, vc?: [number, number, number]) => {
        doc.setDrawColor(203, 213, 225); doc.setFillColor(248, 250, 252);
        doc.roundedRect(bx, y, BW, BH, 1, 1, 'FD');
        doc.setFontSize(6.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(100, 116, 139);
        doc.text(title, bx + BW / 2, y + 4.5, { align: 'center' });
        doc.setFontSize(12); doc.setFont('helvetica', 'bold');
        doc.setTextColor(...(vc ?? ([30, 41, 59] as [number, number, number])));
        doc.text(value, bx + BW / 2, y + 11.5, { align: 'center' });
        if (sub) {
          doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
          doc.text(sub, bx + BW / 2, y + 16, { align: 'center' });
        }
        doc.setTextColor(0, 0, 0);
      };

      drawBox(X,              lang === 'fr' ? 'CLASSEMENT'  : 'CLASS POSITION',
        `${rc.class_position ?? '—'}/${rc.out_of ?? '—'}`, undefined, [79, 70, 229]);
      drawBox(X + BW + 4,     lang === 'fr' ? 'PRÉSENCE'    : 'ATTENDANCE',
        `${attendancePct}%`, `${rc.days_present}/${rc.total_school_days} ${lang === 'fr' ? 'jours' : 'days'}`, [22, 163, 74]);
      drawBox(X + (BW + 4)*2, lang === 'fr' ? 'CONDUITE'    : 'CONDUCT',
        rc.conduct || '—');

      y += BH + 7;

      // ── Comments ──────────────────────────────────────────────
      const drawComment = (label: string, text: string | null) => {
        doc.setFontSize(6.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(100, 116, 139);
        doc.text(label.toUpperCase(), X, y);
        y += 3.5;
        doc.setDrawColor(203, 213, 225); doc.setFillColor(250, 250, 252);
        doc.roundedRect(X, y, W, 10, 1, 1, 'FD');
        if (text) {
          doc.setFontSize(8); doc.setFont('helvetica', 'italic'); doc.setTextColor(30, 41, 59);
          doc.text(`"${text}"`, X + 3, y + 6, { maxWidth: W - 6 });
        }
        doc.setTextColor(0, 0, 0);
        y += 14;
      };

      drawComment(lang === 'fr' ? "Appréciation du professeur principal" : "Class Teacher's Comment", rc.class_teacher_comment);
      drawComment(lang === 'fr' ? "Appréciation du directeur" : "Head Teacher's Comment", rc.head_teacher_comment);

      // ── Signatures ────────────────────────────────────────────
      doc.setDrawColor(203, 213, 225);
      doc.line(X, y, X + W, y);
      y += 10;
      const sigLabels = lang === 'fr'
        ? ['Professeur Principal', 'Directeur', 'Parent / Tuteur']
        : ['Class Teacher', 'Head Teacher', 'Parent / Guardian'];
      sigLabels.forEach((lbl, i) => {
        const sx = X + i * (W / 3) + (W / 3) / 2;
        doc.setDrawColor(148, 163, 184);
        doc.line(sx - 22, y + 8, sx + 22, y + 8);
        doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
        doc.text(lbl, sx, y + 13, { align: 'center' });
      });
      y += 20;

      // ── Footer ────────────────────────────────────────────────
      doc.setDrawColor(203, 213, 225); doc.line(X, y, X + W, y); y += 4;
      doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(148, 163, 184);
      doc.text(`${lang === 'fr' ? 'Document officiel' : 'Official Progress Report'} · ${schoolInfo.name}`,
        X + W / 2, y, { align: 'center' });
    });

    const fname = `report-cards-${(selectedClass?.name ?? 'class').replace(/\s+/g, '-')}-${selectedTerm ? termLabel(selectedTerm) : 'term'}.pdf`.toLowerCase();
    doc.save(fname);
  };

  const termLabel = (tm: TermRaw) => {
    const n = tm.name === 'first' ? 1 : tm.name === 'second' ? 2 : 3;
    return lang === 'fr' ? `Trimestre ${n}` : `Term ${n}`;
  };

  const selectedClass = classes.find(c => c.id === classId);
  const selectedTerm  = terms.find(tm => tm.id === termId);

  // Merge: one row per student in the class; attach their report card if it exists
  const studentRows = students.map(s => ({
    student: s,
    rc: reportCards.find(rc => rc.student_id === s.id) ?? null,
  }));

  return (
    <>
      {/* Print-only overlay — hidden on screen, shown when window.print() fires */}
      {printList && (
        <div className="print-only">
          {printList.map((rc, i) => (
            <div key={rc.id} style={i < printList.length - 1 ? { pageBreakAfter: 'always' } : undefined}>
              <PrintCard rc={rc} />
            </div>
          ))}
        </div>
      )}

      {/* Preview modal */}
      {previewRc && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm py-8 px-4"
          onClick={e => { if (e.target === e.currentTarget) setPreviewRc(null); }}
        >
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 sticky top-0 bg-white rounded-t-2xl z-10">
              <div>
                <p className="font-semibold text-slate-800">{previewRc.student_name}</p>
                <p className="text-xs text-slate-400">{previewRc.class_name} · {previewRc.academic_year}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePrint([previewRc])}
                  className="flex items-center gap-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
                >
                  <Printer size={14} /> {lang === 'fr' ? 'Imprimer' : 'Print'}
                </button>
                <button onClick={() => setPreviewRc(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto max-h-[80vh] p-2">
              <PrintCard rc={previewRc} />
            </div>
          </div>
        </div>
      )}

      {/* Page content */}
      <div className="space-y-5 no-print">

        {/* Controls bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">{t.assessments.class}</label>
              <select
                value={classId}
                onChange={e => setClassId(e.target.value)}
                className="py-2 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">{t.assessments.term}</label>
              <select
                value={termId}
                onChange={e => setTermId(e.target.value)}
                className="py-2 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {terms.map(tm => (
                  <option key={tm.id} value={tm.id}>
                    {termLabel(tm)}{tm.is_current ? ' ✓' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="ml-auto flex items-center gap-2 flex-wrap">
              <button
                onClick={handleGenerate}
                disabled={generating || !classId || !termId}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <RefreshCw size={14} className={generating ? 'animate-spin' : ''} />
                {generating
                  ? (lang === 'fr' ? 'Génération…' : 'Generating…')
                  : (lang === 'fr' ? 'Générer les bulletins' : 'Generate Report Cards')}
              </button>

              {reportCards.length > 0 && (
                <>
                  <button
                    onClick={() => handlePrint(studentRows.filter(r => r.rc !== null).map(r => r.rc!))}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    <Printer size={14} />
                    {lang === 'fr'
                      ? `Imprimer tout (${reportCards.length})`
                      : `Print All (${reportCards.length})`}
                  </button>
                  <button
                    onClick={handleDownloadPdf}
                    className="flex items-center gap-2 bg-indigo-700 hover:bg-indigo-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    <Download size={14} />
                    {lang === 'fr' ? 'Télécharger PDF' : 'Download PDF'}
                  </button>
                </>
              )}
            </div>
          </div>

          {selectedClass && selectedTerm && (
            <p className="text-xs text-slate-400 mt-2">
              {selectedClass.name} · {termLabel(selectedTerm)}
              {students.length > 0 && ` · ${students.length} ${lang === 'fr' ? 'élèves' : 'students'}`}
              {reportCards.length > 0 && ` · ${reportCards.length} ${lang === 'fr' ? 'bulletins générés' : 'cards generated'}`}
            </p>
          )}
          {generateMsg && (
            <p className={`text-xs mt-1 font-medium ${generateMsg.startsWith('Error') || generateMsg.startsWith('Erreur') ? 'text-red-600' : 'text-emerald-600'}`}>
              {generateMsg}
            </p>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : students.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BookOpen size={28} className="text-slate-300" />
            </div>
            <h3 className="text-slate-600 font-semibold mb-1">
              {lang === 'fr' ? 'Aucun élève dans cette classe' : 'No students in this class'}
            </h3>
          </div>
        ) : (
          <div className="space-y-3">
            {studentRows.map(({ student, rc }) => {
              const initials = `${student.first_name[0] ?? ''}${student.last_name[0] ?? ''}`.toUpperCase();
              const fullName = `${student.first_name} ${student.last_name}`;

              if (!rc) {
                return (
                  <div key={student.id} className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4 opacity-70">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold shrink-0 text-sm">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-700">{fullName}</p>
                      <p className="text-slate-400 text-xs">{student.student_number}</p>
                    </div>
                    <span className="text-xs font-medium bg-amber-50 text-amber-600 border border-amber-200 rounded-full px-3 py-1 whitespace-nowrap">
                      {lang === 'fr' ? 'Bulletin non généré' : 'Not generated'}
                    </span>
                  </div>
                );
              }

              return (
                <div key={rc.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    {/* Student identity */}
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold shrink-0 text-sm">
                        {initials}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800">{rc.student_name}</h3>
                        <p className="text-slate-400 text-xs">{rc.student_number} · {rc.class_name}</p>
                        <p className="text-slate-400 text-xs">
                          {rc.term_name === 'first'  ? (lang === 'fr' ? 'Trimestre 1' : 'Term 1')
                            : rc.term_name === 'second' ? (lang === 'fr' ? 'Trimestre 2' : 'Term 2')
                            : (lang === 'fr' ? 'Trimestre 3' : 'Term 3')} · {rc.academic_year}
                        </p>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-6 text-center">
                      <div>
                        <p className="text-2xl font-bold text-indigo-600">{rc.percentage}%</p>
                        <p className="text-xs text-slate-400">{lang === 'fr' ? 'Moyenne' : 'Average'}</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-slate-800">
                          {rc.class_position ?? '—'}
                          <span className="text-sm text-slate-400">/{rc.out_of ?? '—'}</span>
                        </p>
                        <p className="text-xs text-slate-400">{t.common.position}</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700">{rc.conduct || '—'}</p>
                        <p className="text-xs text-slate-400">{t.reportCards.conduct}</p>
                      </div>
                      <StatusBadge status={rc.status} />
                    </div>
                  </div>

                  {/* Subject grade strip */}
                  {rc.entries.length > 0 && (
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-slate-400 uppercase tracking-wide">
                            {rc.entries.map(e => (
                              <th key={e.subject_id} className="text-center px-2 py-1 font-medium">
                                {e.subject_name?.split(' ')[0]}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            {rc.entries.map(e => (
                              <td key={e.subject_id} className="text-center px-2 py-1">
                                <span className={clsx('font-bold', gradeColor[e.grade] ?? 'text-slate-700')}>{e.grade}</span>
                                <span className="text-slate-400 ml-1">{e.total_score}</span>
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => setPreviewRc(rc)}
                      className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                    >
                      <Eye size={14} /> {t.reportCards.preview}
                    </button>
                    <button
                      onClick={() => handlePrint([rc])}
                      className="flex items-center gap-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors ml-auto"
                    >
                      <Printer size={14} /> {t.reportCards.printReportCard}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
