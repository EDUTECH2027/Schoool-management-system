/*
 * Copyright (c) 2026 [COMPANY LEGAL NAME]. All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution or
 * modification of this file, via any medium, is strictly prohibited.
 */
import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import type { EmailStatus } from '../../api/client';

interface Props {
  adminEmail: string;
  email: EmailStatus;
  /** Present only when the email could not be sent, so the platform admin can hand it over by hand. */
  tempPassword?: string;
}

// Result of emailing a school administrator their platform URL + first-login credentials.
export default function CredentialsEmailNotice({ adminEmail, email, tempPassword }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!tempPassword) return;
    try {
      await navigator.clipboard.writeText(tempPassword);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = tempPassword; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } finally { document.body.removeChild(ta); }
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  if (email.sent) {
    return (
      <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-3 text-xs text-green-800 dark:text-green-300" role="status">
        School created. The platform URL and first-login credentials were emailed to <strong>{adminEmail}</strong>.
        <span className="block opacity-80 mt-1">If it does not arrive within a few minutes, ask them to check their spam folder.</span>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-xs text-amber-900 dark:text-amber-200 space-y-2" role="alert">
      <p>School created, but the email to <strong>{adminEmail}</strong> could <strong>not be sent</strong>: {email.error ?? 'unknown error'}</p>
      {tempPassword && (
        <div className="space-y-1">
          <p className="opacity-80">Give the administrator these first-login details by hand (they must change the password at first sign-in):</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all rounded bg-white/60 dark:bg-black/20 px-2 py-1 select-all">{adminEmail} / {tempPassword}</code>
            <button type="button" onClick={copy}
              className="shrink-0 inline-flex items-center gap-1 rounded-md border border-current/30 px-2 py-1 font-medium hover:bg-white/50 dark:hover:bg-white/10">
              {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied' : 'Copy password'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
