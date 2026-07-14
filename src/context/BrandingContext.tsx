import { createContext, useContext, useState, type ReactNode } from 'react';
import { school as defaultSchool } from '../data/mockData';

export interface SchoolInfo {
  name:        string;
  code:        string;
  address:     string;
  phone:       string;
  email:       string;
  headTeacher: string;
  motto:       string;
}

interface BrandingContextValue {
  logoUrl:       string | null;
  schoolName:    string;
  schoolSub:     string;
  schoolInfo:    SchoolInfo;
  setLogoUrl:    (url: string | null) => void;
  setSchoolName: (name: string) => void;
  setSchoolSub:  (sub: string) => void;
  setSchoolInfo: (info: SchoolInfo) => void;
}

const BrandingContext = createContext<BrandingContextValue>({
  logoUrl: null, schoolName: 'Bright Stars', schoolSub: 'Primary School',
  schoolInfo: {
    name: defaultSchool.name, code: defaultSchool.code, address: defaultSchool.address,
    phone: defaultSchool.phone, email: defaultSchool.email,
    headTeacher: defaultSchool.headTeacher, motto: defaultSchool.motto,
  },
  setLogoUrl: () => {}, setSchoolName: () => {}, setSchoolSub: () => {}, setSchoolInfo: () => {},
});

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [logoUrl, setLogoUrlState]       = useState<string | null>(() => localStorage.getItem('brand_logo'));
  const [schoolName, setSchoolNameState] = useState(() => localStorage.getItem('brand_name') ?? 'Bright Stars');
  const [schoolSub, setSchoolSubState]   = useState(() => localStorage.getItem('brand_sub')  ?? 'Primary School');
  const [schoolInfo, setSchoolInfoState] = useState<SchoolInfo>(() => {
    try {
      const stored = localStorage.getItem('school_info');
      if (stored) return JSON.parse(stored) as SchoolInfo;
    } catch { /* ignore */ }
    return {
      name: defaultSchool.name, code: defaultSchool.code, address: defaultSchool.address,
      phone: defaultSchool.phone, email: defaultSchool.email,
      headTeacher: defaultSchool.headTeacher, motto: defaultSchool.motto,
    };
  });

  const setLogoUrl = (url: string | null) => {
    setLogoUrlState(url);
    try {
      if (url) localStorage.setItem('brand_logo', url);
      else localStorage.removeItem('brand_logo');
    } catch { /* quota exceeded — logo still shows in session */ }
  };

  const setSchoolName = (name: string) => {
    setSchoolNameState(name);
    localStorage.setItem('brand_name', name);
  };

  const setSchoolSub = (sub: string) => {
    setSchoolSubState(sub);
    localStorage.setItem('brand_sub', sub);
  };

  const setSchoolInfo = (info: SchoolInfo) => {
    setSchoolInfoState(info);
    localStorage.setItem('school_info', JSON.stringify(info));
  };

  return (
    <BrandingContext.Provider value={{ logoUrl, schoolName, schoolSub, schoolInfo, setLogoUrl, setSchoolName, setSchoolSub, setSchoolInfo }}>
      {children}
    </BrandingContext.Provider>
  );
}

export const useBranding = () => useContext(BrandingContext);
