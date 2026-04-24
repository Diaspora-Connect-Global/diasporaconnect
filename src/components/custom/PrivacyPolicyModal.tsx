'use client';

import { useEffect, useState } from 'react';
import { Lock, Shield, X } from 'lucide-react';
import { ButtonType2 } from '@/components/custom/button';

const STORAGE_KEY = 'privacy_policy_accepted';

const sections = [
  {
    id: 'collection',
    title: 'Information we collect',
    body: 'We collect account details, profile information, content you submit, transaction data, and technical data needed to operate and secure the platform. This includes device information, IP addresses, and usage patterns to ensure a safe and reliable experience.',
  },
  {
    id: 'use',
    title: 'How we use information',
    body: 'We use your information to provide services, personalise experiences, process transactions, improve safety, communicate important updates, and comply with legal obligations. We do not use your data to build advertising profiles or sell it to third parties.',
  },
  {
    id: 'sharing',
    title: 'Sharing of information',
    body: 'We do not sell personal data. We may share data with service providers, payment processors, and legal authorities where required to deliver services or meet legal requirements. All third-party providers are bound by data processing agreements.',
  },
  {
    id: 'retention',
    title: 'Data retention',
    body: 'We retain personal data for as long as needed to provide services, resolve disputes, and comply with legal and operational requirements. When you delete your account, we remove your personal data within 30 days except where required by law.',
  },
  {
    id: 'rights',
    title: 'Your rights',
    body: 'Depending on your jurisdiction, you may have rights to access, correct, delete, or restrict processing of your personal data. You may also have the right to data portability and to withdraw consent at any time. Submit requests via your account settings or by contacting us.',
  },
  {
    id: 'security',
    title: 'Security',
    body: 'We use administrative, technical, and organisational controls to protect your data, including encryption in transit and at rest. No system is fully immune to risk, but we continuously improve our safeguards and respond promptly to any incidents.',
  },
  {
    id: 'cookies',
    title: 'Cookies and tracking',
    body: 'We use cookies and similar technologies to keep you signed in, remember your preferences, and understand how the platform is used. You can control non-essential cookies through your browser settings or our cookie preferences panel.',
  },
];

export default function PrivacyPolicyModal() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem(STORAGE_KEY);
    if (!accepted) setShow(true);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 flex justify-center pointer-events-none">
      <div className="w-full max-w-2xl bg-surface-default rounded-2xl shadow-2xl border border-border-subtle pointer-events-auto">

        {/* Content row */}
        <div className="flex items-start gap-3 px-4 pt-4 pb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-text-brand/10 shrink-0 mt-0.5">
            <Lock className="h-4 w-4 text-text-brand" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-text-primary">Privacy Policy</h2>
            <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
              We collect and use your data to provide and improve our services. We do not sell your personal data.
              By continuing you consent to our{' '}
              <a href="/privacy" target="_blank" className="text-text-brand underline hover:opacity-80">
                full privacy policy
              </a>
              .
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="shrink-0 p-1 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-subtle transition-colors mt-0.5"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-4 pb-4">
          <Shield className="h-3.5 w-3.5 text-text-brand shrink-0" />
          <p className="text-xs text-text-secondary flex-1">Last updated: March 27, 2026</p>
          <ButtonType2
            onClick={handleDismiss}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold"
          >
            Accept
          </ButtonType2>
        </div>
      </div>
    </div>
  );
}
