import { useState, useEffect } from 'react';

interface Country { code: string; name: string; dial: string; digits: number; flag: string; }

export const PHONE_COUNTRIES: Country[] = [
  { code: 'ZW', name: 'Zimbabwe',        dial: '+263', digits: 9,  flag: '🇿🇼' },
  { code: 'ZA', name: 'South Africa',    dial: '+27',  digits: 9,  flag: '🇿🇦' },
  { code: 'ZM', name: 'Zambia',          dial: '+260', digits: 9,  flag: '🇿🇲' },
  { code: 'MZ', name: 'Mozambique',      dial: '+258', digits: 9,  flag: '🇲🇿' },
  { code: 'BW', name: 'Botswana',        dial: '+267', digits: 8,  flag: '🇧🇼' },
  { code: 'MW', name: 'Malawi',          dial: '+265', digits: 9,  flag: '🇲🇼' },
  { code: 'TZ', name: 'Tanzania',        dial: '+255', digits: 9,  flag: '🇹🇿' },
  { code: 'KE', name: 'Kenya',           dial: '+254', digits: 9,  flag: '🇰🇪' },
  { code: 'NG', name: 'Nigeria',         dial: '+234', digits: 10, flag: '🇳🇬' },
  { code: 'GH', name: 'Ghana',           dial: '+233', digits: 9,  flag: '🇬🇭' },
  { code: 'SN', name: 'Senegal',         dial: '+221', digits: 9,  flag: '🇸🇳' },
  { code: 'CM', name: 'Cameroon',        dial: '+237', digits: 9,  flag: '🇨🇲' },
  { code: 'CI', name: "Côte d'Ivoire",  dial: '+225', digits: 10, flag: '🇨🇮' },
  { code: 'FR', name: 'France',          dial: '+33',  digits: 9,  flag: '🇫🇷' },
  { code: 'GB', name: 'United Kingdom',  dial: '+44',  digits: 10, flag: '🇬🇧' },
  { code: 'US', name: 'USA / Canada',    dial: '+1',   digits: 10, flag: '🇺🇸' },
];

/** Parse a stored phone string (e.g. "+263771112201") into country code + local digits. */
export function parsePhone(value: string): { countryCode: string; local: string } {
  if (!value) return { countryCode: 'ZW', local: '' };
  const digits = value.replace(/\D/g, '');
  // Match longest dial code first to avoid prefix ambiguity
  const sorted = [...PHONE_COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
  for (const c of sorted) {
    const dialDigits = c.dial.replace('+', '');
    if (digits.startsWith(dialDigits)) {
      return { countryCode: c.code, local: digits.slice(dialDigits.length) };
    }
  }
  // No dial code found — strip leading 0 (national trunk prefix) and default to ZW
  return { countryCode: 'ZW', local: digits.startsWith('0') ? digits.slice(1) : digits };
}

/** Returns true when the stored phone value passes digit-count validation. */
export function isPhoneValid(value: string): boolean {
  if (!value) return false;
  const { countryCode, local } = parsePhone(value);
  const country = PHONE_COUNTRIES.find(c => c.code === countryCode);
  return !!country && local.length === country.digits;
}

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  required?: boolean;
}

export default function PhoneInput({ label, value, onChange, error, required }: Props) {
  const [countryCode, setCountryCode] = useState(() => parsePhone(value).countryCode);
  const [local, setLocal]             = useState(() => parsePhone(value).local);

  // Re-sync when the parent resets the field externally
  useEffect(() => {
    const p = parsePhone(value);
    setCountryCode(p.countryCode);
    setLocal(p.local);
  }, [value]);

  const country = PHONE_COUNTRIES.find(c => c.code === countryCode) ?? PHONE_COUNTRIES[0];

  const emit = (code: string, localDigits: string) => {
    const c = PHONE_COUNTRIES.find(x => x.code === code) ?? PHONE_COUNTRIES[0];
    onChange(`${c.dial}${localDigits}`);
  };

  const handleCountry = (code: string) => {
    setCountryCode(code);
    emit(code, local);
  };

  const handleLocal = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, country.digits);
    setLocal(digits);
    emit(countryCode, digits);
  };

  const digitWarn = local.length > 0 && local.length !== country.digits;

  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className={[
        'flex rounded-lg overflow-hidden border focus-within:ring-2 transition-all',
        error     ? 'border-red-300 focus-within:ring-red-400'
        : digitWarn ? 'border-orange-300 focus-within:ring-orange-400'
        : 'border-slate-200 focus-within:ring-indigo-500',
      ].join(' ')}>
        {/* Country picker */}
        <select
          value={countryCode}
          onChange={e => handleCountry(e.target.value)}
          className="shrink-0 border-0 border-r border-slate-200 bg-slate-50 py-2.5 pl-2.5 pr-1 text-sm focus:outline-none cursor-pointer"
        >
          {PHONE_COUNTRIES.map(c => (
            <option key={c.code} value={c.code}>{c.flag} {c.dial}</option>
          ))}
        </select>

        {/* Number input */}
        <input
          type="tel"
          value={local}
          onChange={e => handleLocal(e.target.value)}
          placeholder={'0'.repeat(country.digits)}
          className="flex-1 py-2.5 px-3 text-sm bg-white focus:outline-none"
        />

        {/* Live digit counter */}
        <span className={[
          'shrink-0 self-center pr-3 text-xs font-mono tabular-nums',
          local.length === 0           ? 'text-slate-300'
          : local.length === country.digits ? 'text-emerald-500'
          : 'text-orange-500',
        ].join(' ')}>
          {local.length}/{country.digits}
        </span>
      </div>

      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      {!error && digitWarn && (
        <p className="text-orange-500 text-xs mt-1">
          {country.name} numbers require exactly {country.digits} digits
        </p>
      )}
    </div>
  );
}
