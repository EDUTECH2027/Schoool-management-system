/*
 * Copyright (c) 2026 [COMPANY LEGAL NAME]. All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution or
 * modification of this file, via any medium, is strictly prohibited.
 */
import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { api, type LicenseStatus } from '../api/client';

// Shows a warning bar on on-prem builds when the license is in its grace period.
// On the hosted SaaS the endpoint reports { required: false } and this renders nothing.
export default function LicenseBanner() {
  const [status, setStatus] = useState<LicenseStatus | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () => api.licenseStatus().then(s => { if (alive) setStatus(s); }).catch(() => {});
    load();
    const t = setInterval(load, 6 * 60 * 60 * 1000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  if (!status || !status.required || (status.valid && !status.inGrace)) return null;

  const expired = status.reason?.startsWith('expired');
  const msg = expired
    ? 'This installation’s licence has expired and is running on a grace period.'
    : 'This installation cannot reach the licence server and is running on a grace period.';

  return (
    <div className="w-full bg-amber-500 text-amber-950 text-sm font-medium px-4 py-2 flex items-center justify-center gap-2">
      <AlertTriangle size={15} className="shrink-0" />
      <span>{msg} Contact your vendor to renew.</span>
    </div>
  );
}
