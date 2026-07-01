import { X, Calendar, MapPin, Phone, BookOpen, Hash, User } from 'lucide-react';
import type { Student } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { StatusBadge } from '../ui/Badge';

interface Props {
  student: Student;
  onClose: () => void;
  onEdit: () => void;
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Calendar; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon size={14} className="text-slate-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-slate-400 text-xs">{label}</p>
        <p className="text-slate-800 font-medium">{value}</p>
      </div>
    </div>
  );
}

export default function StudentViewModal({ student, onClose, onEdit }: Props) {
  const { t } = useLanguage();

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800">{t.students.profileTitle}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={17} className="text-slate-500" />
          </button>
        </div>

        {/* Banner */}
        <div className="px-5 py-5 bg-indigo-50 border-b border-indigo-100 flex items-center gap-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold shrink-0
            ${student.gender === 'female' ? 'bg-pink-200 text-pink-700' : 'bg-blue-200 text-blue-700'}`}>
            {student.firstName[0]}{student.lastName[0]}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">{student.firstName} {student.lastName}</h3>
            <p className="text-slate-500 text-sm font-mono">{student.studentNumber}</p>
            <div className="mt-1.5 flex items-center gap-2">
              <StatusBadge status={student.isActive ? 'present' : 'absent'} />
              <span className="bg-indigo-100 text-indigo-700 text-xs font-medium px-2 py-0.5 rounded-full">
                {student.className}
              </span>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Personal info */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              {t.students.personalInfo}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <InfoRow icon={Calendar} label={t.students.dateOfBirth}
                value={new Date(student.dateOfBirth).toLocaleDateString('en-GB')} />
              <InfoRow icon={User} label={t.students.gender}
                value={student.gender === 'male' ? t.common.male : t.common.female} />
              <InfoRow icon={Hash} label={t.students.admNo} value={student.studentNumber} />
              <InfoRow icon={Calendar} label={t.students.admissionDate}
                value={new Date(student.admissionDate).toLocaleDateString('en-GB')} />
            </div>
            {student.address && (
              <div className="mt-3 flex items-start gap-2 text-sm">
                <MapPin size={14} className="text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-slate-400 text-xs">{t.students.address}</p>
                  <p className="text-slate-800 font-medium">{student.address}</p>
                </div>
              </div>
            )}
          </div>

          {/* School info */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              {t.students.schoolInfo}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <InfoRow icon={BookOpen} label={t.common.class} value={student.className} />
              <InfoRow icon={BookOpen} label="Grade Level" value={student.gradeLevelName} />
            </div>
          </div>

          {/* Guardian info */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              {t.students.guardianInfo}
            </p>
            <div className="bg-slate-50 rounded-xl p-4 space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">{t.common.name}</span>
                <span className="font-medium text-slate-800">{student.guardianName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">{t.settings.phone}</span>
                <a href={`tel:${student.guardianPhone}`} className="font-medium text-indigo-600 flex items-center gap-1">
                  <Phone size={12} />{student.guardianPhone}
                </a>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">{t.students.relationship}</span>
                <span className="capitalize font-medium text-slate-700">{student.guardianRelationship}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            {t.common.cancel}
          </button>
          <button
            onClick={onEdit}
            className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
          >
            {t.common.edit}
          </button>
        </div>
      </div>
    </div>
  );
}
