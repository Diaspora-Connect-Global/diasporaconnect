import { Mail, Handshake, Clock, MessageCircle, ArrowRight, ExternalLink } from 'lucide-react';
import Link from 'next/link';

const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@diaspoplug.com';
const businessEmail = 'partners@diaspoplug.com';
const pressEmail = 'press@diaspoplug.com';

const channels = [
  {
    icon: Mail,
    title: 'Support',
    description: 'Account, technical, or billing questions.',
    cta: supportEmail,
    href: `mailto:${supportEmail}`,
    tag: 'Fastest response',
  },
  {
    icon: Handshake,
    title: 'Partnerships',
    description: 'Community collaborations and strategic partnerships.',
    cta: businessEmail,
    href: `mailto:${businessEmail}`,
    tag: null,
  },
  {
    icon: MessageCircle,
    title: 'Press & media',
    description: 'Press inquiries, interviews, and media assets.',
    cta: pressEmail,
    href: `mailto:${pressEmail}`,
    tag: null,
  },
];

const faqs = [
  {
    q: 'How quickly do you respond?',
    a: 'We typically respond within 24–48 hours on business days. Urgent account security issues are prioritised.',
  },
  {
    q: 'Where can I report a bug?',
    a: 'Send a detailed description including steps to reproduce to support@diaspoplug.com. Screenshots and screen recordings are very helpful.',
  },
  {
    q: 'I have a privacy request.',
    a: 'Privacy-related requests (data access, deletion, correction) should be sent to privacy@diaspoplug.com.',
  },
];

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-surface-default">

      {/* Hero */}
      <section className="border-b border-border-subtle">
        <div className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-brand">
            Contact
          </p>
          <h1 className="text-4xl font-black tracking-tight text-text-primary sm:text-5xl">
            We&apos;re here to help.
          </h1>
          <p className="mt-4 max-w-lg text-base font-light leading-relaxed text-text-secondary">
            Reach out through the right channel below and we will get back to you as quickly as
            possible.
          </p>
        </div>
      </section>

      {/* Contact cards */}
      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="grid gap-4 sm:grid-cols-3">
          {channels.map(({ icon: Icon, title, description, cta, href, tag }) => (
            <a
              key={title}
              href={href}
              className="group relative flex flex-col rounded-xl border border-border-subtle bg-surface-default p-6 hover:border-text-brand/40 hover:shadow-sm transition-all"
            >
              {tag && (
                <span className="absolute top-4 right-4 rounded-full bg-text-brand/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-brand">
                  {tag}
                </span>
              )}
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-text-brand/10">
                <Icon className="h-5 w-5 text-text-brand" />
              </div>
              <h2 className="mb-1 text-base font-bold text-text-primary">{title}</h2>
              <p className="mb-4 text-sm font-light text-text-secondary flex-1">{description}</p>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-text-brand group-hover:gap-2.5 transition-all">
                {cta} <ExternalLink className="h-3.5 w-3.5" />
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* Response time banner */}
      <section className="mx-auto max-w-5xl px-6 pb-4">
        <div className="flex items-center gap-4 rounded-xl border border-border-subtle bg-surface-subtle px-6 py-4">
          <Clock className="h-5 w-5 flex-shrink-0 text-text-brand" />
          <p className="text-sm text-text-secondary">
            <span className="font-semibold text-text-primary">Response time: </span>
            We reply within 24–48 hours on business days. For urgent account security issues,
            include &quot;URGENT&quot; in your subject line.
          </p>
        </div>
      </section>

      {/* FAQs */}
      <section className="border-t border-border-subtle mt-8">
        <div className="mx-auto max-w-5xl px-6 py-12">
          <h2 className="mb-8 text-2xl font-bold tracking-tight text-text-primary">
            Common questions
          </h2>
          <div className="space-y-0 divide-y divide-border-subtle">
            {faqs.map(({ q, a }) => (
              <div key={q} className="py-6">
                <h3 className="mb-2 text-base font-semibold text-text-primary">{q}</h3>
                <p className="text-sm font-light leading-relaxed text-text-secondary">{a}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex items-center justify-between rounded-xl border border-border-subtle bg-surface-subtle px-6 py-5">
            <div>
              <p className="font-semibold text-text-primary">Can&apos;t find what you need?</p>
              <p className="text-sm text-text-secondary">Browse our full help centre for guides and FAQs.</p>
            </div>
            <Link
              href="/help"
              className="inline-flex items-center gap-2 rounded-full bg-text-brand px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              Help centre <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

    </main>
  );
}
