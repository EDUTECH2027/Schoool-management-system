/*
 * Copyright (c) 2026 [COMPANY LEGAL NAME]. All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution or
 * modification of this file, via any medium, is strictly prohibited.
 */
import { useEffect, useState } from 'react';
import { Copy, Check, Loader2 } from 'lucide-react';
import { api } from '../../api/client';
import type { WhatsAppStatus, WhatsAppDelivery } from '../../api/client';

interface Props {
  schoolId: string;
  adminEmail: string;
  activationLink: string;
  /** What the API said right after sending (Meta accepted it, or rejected it outright). */
  sendResult: WhatsAppStatus;
}

const POLL_MS = 3000;
const POLL_MAX = 14; // ~40 s

// Shows the real outcome of the activation message. "Accepted by WhatsApp" is NOT "delivered",
// so this follows up with delivery reports (via Meta's webhook) and always offers the link to copy.
export default function WhatsAppDeliveryNotice({ schoolId, adminEmail, activationLink, sendResult }: Props) {
  const [delivery, setDelivery] = useState<WhatsAppDelivery>(
    sendResult.sent ? { state: 'accepted' } : { state: 'failed', error: sendResult.error },
  );
  const [waiting, setWaiting] = useState(sendResult.sent);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!sendResult.sent) { setDelivery({ state: 'failed', error: sendResult.error }); setWaiting(false); return; }
    setDelivery({ state: 'accepted' });
    setWaiting(true);
    let tries = 0, stop = false;
    const tick = async () => {
      tries++;
      try {
        const d = await api.platform.getWhatsAppStatus(schoolId);
        if (stop) return;
        setDelivery(d);
        if (d.state === 'delivered' || d.state === 'read' || d.state === 'failed') { setWaiting(false); return; }
      } catch { /* keep polling */ }
      if (tries >= POLL_MAX) { if (!stop) setWaiting(false); return; }
      timer = window.setTimeout(tick, POLL_MS);
    };
    let timer = window.setTimeout(tick, POLL_MS);
    return () => { stop = true; window.clearTimeout(timer); };
  }, [schoolId, sendResult]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(activationLink);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = activationLink; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } finally { document.body.removeChild(ta); }
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  let tone = 'slate'; let message: React.ReactNode;
  if (delivery.state === 'delivered' || delivery.state === 'read') {
    tone = 'green';
    message = delivery.state === 'read' ? 'School created. The administrator received and opened the WhatsApp message.' : 'School created. The activation message was delivered on WhatsApp.';
  } else if (delivery.state === 'failed') {
    tone = 'amber';
    message = <>School created, but WhatsApp could <strong>not deliver</strong> the message{delivery.error ? <>: {delivery.error}</> : '.'}</>;
  } else if (waiting) {
    tone = 'blue';
    message = <span className="inline-flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> School created. Message sent to WhatsApp — waiting for delivery confirmation…</span>;
  } else {
    tone = 'amber';
    message = 'School created. WhatsApp accepted the message but no delivery confirmation has arrived yet. If the administrator does not receive it, send them the link below yourself.';
  }

  const toneClass: Record<string, string> = {
    green: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300',
    amber: 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200',
    blue: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
    slate: 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200',
  };

  return (
    <div className={`border rounded-lg p-3 text-xs space-y-2 ${toneClass[tone]}`} role="status" aria-live="polite">
      <p>{message}</p>
      <div className="space-y-1">
        <p className="opacity-80">Activation link for <strong>{adminEmail}</strong> (one-time, valid 7 days):</p>
        <div className="flex items-start gap-2">
          <code className="flex-1 break-all rounded bg-white/60 dark:bg-black/20 px-2 py-1 select-all">{activationLink}</code>
          <button type="button" onClick={copy}
            className="shrink-0 inline-flex items-center gap-1 rounded-md border border-current/30 px-2 py-1 font-medium hover:bg-white/50 dark:hover:bg-white/10">
            {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  );
}
