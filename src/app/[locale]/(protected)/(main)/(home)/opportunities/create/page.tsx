'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMutation } from '@apollo/client/react';
import { useUserStore } from '@/store/useUserStore';
import { CREATE_OPPORTUNITY, PUBLISH_OPPORTUNITY } from '@/services/gql/opportunities';
import type { CreateOpportunityData } from '@/services/gql/types/opportunities';
import type { CreateOpportunityInput } from '@/services/gql/types/opportunities';
import { ButtonType2 } from '@/components/custom/button';
import { TextInput } from '@/components/custom/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link } from '@/i18n/navigation';

const TYPES = ['EMPLOYMENT', 'SCHOLARSHIP', 'INVESTMENT', 'FELLOWSHIP', 'GRANT', 'VOLUNTEER', 'CONTRACT', 'INITIATIVE', 'PROGRAM'] as const;
const CATEGORIES = ['EMPLOYMENT_CAREER', 'EDUCATION_TRAINING', 'FUNDING_GRANTS', 'FELLOWSHIPS_LEADERSHIP', 'BUSINESS_INVESTMENT', 'VOLUNTEERING_SOCIAL_IMPACT'] as const;
const VISIBILITY = ['PUBLIC', 'COMMUNITY_ONLY', 'ASSOCIATION_ONLY'] as const;
const APPLICATION_METHOD = ['IN_PLATFORM_FORM', 'EXTERNAL_LINK', 'EMAIL_REQUEST'] as const;
const WORK_MODE = ['REMOTE', 'HYBRID', 'ONSITE'] as const;
const ENGAGEMENT = ['FULL_TIME', 'PART_TIME', 'CONTRACT'] as const;

export default function CreateOpportunityPage() {
  const t = useTranslations('home.opportunities');
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const userId = user?.userId;

  const [form, setForm] = useState<Partial<CreateOpportunityInput>>({
    type: 'EMPLOYMENT',
    category: 'EMPLOYMENT_CAREER',
    visibility: 'PUBLIC',
    applicationMethod: 'IN_PLATFORM_FORM',
  });
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [published, setPublished] = useState(false);

  const [createOpportunity, { loading: creating }] = useMutation<CreateOpportunityData>(CREATE_OPPORTUNITY);
  const [publishOpportunity, { loading: publishing }] = useMutation(PUBLISH_OPPORTUNITY);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !form.type || !form.category || !form.title || !form.description || !form.visibility || !form.applicationMethod) return;
    try {
      const { data } = await createOpportunity({
        variables: {
          input: {
            ownerType: 'USER',
            ownerId: userId,
            type: form.type,
            category: form.category,
            title: form.title,
            description: form.description,
            visibility: form.visibility,
            applicationMethod: form.applicationMethod,
            workMode: form.workMode || undefined,
            engagementType: form.engagementType || undefined,
            location: form.location || undefined,
            deadline: form.deadline || undefined,
            externalLink: form.externalLink || undefined,
            applicationEmail: form.applicationEmail || undefined,
          },
        },
      });
      const id = data?.createOpportunity?.id;
      if (id) setCreatedId(id);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePublish = async () => {
    if (!createdId) return;
    try {
      await publishOpportunity({ variables: { id: createdId } });
      setPublished(true);
    } catch (err) {
      console.error(err);
    }
  };

  if (!userId) {
    return (
      <div className="p-4 max-w-xl mx-auto">
        <p className="text-text-secondary">You must be signed in to create an opportunity.</p>
        <Link href="/opportunities" className="text-text-brand mt-2 inline-block">Back to opportunities</Link>
      </div>
    );
  }

  if (createdId) {
    return (
      <div className="p-4 max-w-xl mx-auto space-y-4">
        <h2 className="text-xl font-semibold text-text-primary">Opportunity created</h2>
        <p className="text-text-secondary">Your opportunity was saved as a draft.</p>
        {published ? (
          <p className="text-text-success">It is now published and visible to others.</p>
        ) : (
          <ButtonType2 onClick={handlePublish} disabled={publishing}>
            {publishing ? 'Publishing…' : 'Publish now'}
          </ButtonType2>
        )}
        <div className="flex gap-2">
          <Link href={`/opportunities/${createdId}`} className="text-text-brand">View opportunity</Link>
          <Link href="/opportunities" className="text-text-brand">Back to opportunities</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/opportunities" className="text-text-secondary hover:text-text-primary">← Opportunities</Link>
      </div>
      <h1 className="text-2xl font-heading-large mb-4">{t('create') ?? 'Create opportunity'}</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Type</Label>
          <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              {TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Category</Label>
          <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <TextInput
          label="Title"
          value={form.title ?? ''}
          onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          placeholder="Opportunity title"
          required
        />
        <div>
          <Label>Description</Label>
          <textarea
            value={form.description ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="Full description"
            className="w-full mt-1 px-3 py-2 border border-border-default rounded-sm bg-surface-subtle text-text-primary min-h-[120px]"
            required
          />
        </div>
        <div>
          <Label>Visibility</Label>
          <Select value={form.visibility} onValueChange={(v) => setForm((p) => ({ ...p, visibility: v }))}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {VISIBILITY.map((v) => (
                <SelectItem key={v} value={v}>{v.replace(/_/g, ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>How to apply</Label>
          <Select value={form.applicationMethod} onValueChange={(v) => setForm((p) => ({ ...p, applicationMethod: v }))}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {APPLICATION_METHOD.map((m) => (
                <SelectItem key={m} value={m}>{m.replace(/_/g, ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {form.applicationMethod === 'EXTERNAL_LINK' && (
          <TextInput
            label="External application URL"
            value={form.externalLink ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, externalLink: e.target.value }))}
            placeholder="https://..."
          />
        )}
        {form.applicationMethod === 'EMAIL_REQUEST' && (
          <TextInput
            label="Application email"
            type="email"
            value={form.applicationEmail ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, applicationEmail: e.target.value }))}
            placeholder="apply@example.com"
          />
        )}
        <div>
          <Label>Work mode (optional)</Label>
          <Select value={form.workMode ?? ''} onValueChange={(v) => setForm((p) => ({ ...p, workMode: v || undefined }))}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Optional" /></SelectTrigger>
            <SelectContent>
              {WORK_MODE.map((w) => (
                <SelectItem key={w} value={w}>{w}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Engagement (optional)</Label>
          <Select value={form.engagementType ?? ''} onValueChange={(v) => setForm((p) => ({ ...p, engagementType: v || undefined }))}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Optional" /></SelectTrigger>
            <SelectContent>
              {ENGAGEMENT.map((e) => (
                <SelectItem key={e} value={e}>{e.replace(/_/g, ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <TextInput
          label="Location (optional)"
          value={form.location ?? ''}
          onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
          placeholder="City, Country"
        />
        <TextInput
          label="Deadline (optional, YYYY-MM-DD)"
          value={form.deadline ?? ''}
          onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))}
          placeholder="2025-12-31"
        />
        <ButtonType2 type="submit" disabled={creating}>
          {creating ? 'Creating…' : 'Create draft'}
        </ButtonType2>
      </form>
    </div>
  );
}
