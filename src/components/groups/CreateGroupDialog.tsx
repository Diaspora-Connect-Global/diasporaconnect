'use client';

import { useState, type FormEvent } from 'react';
import { useMutation } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { X, Globe, Lock, Users } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { Spinner } from '@/components/ui/spinner';
import {
  CREATE_GROUP,
  GET_MY_GROUPS,
  GROUPS_DIRECTORY,
  type CreateGroupResponse,
} from '@/services/gql/groups';
import { GroupPrivacy } from '@/services/gql/groups';

interface CreateGroupDialogProps {
  onClose: () => void;
}

const MY_GROUPS_VARS = { limit: 50, offset: 0 };

/**
 * Modal dialog to create a new group.
 * Used in CommunityComposer and the /groups page sidebar.
 */
export function CreateGroupDialog({ onClose }: CreateGroupDialogProps) {
  const t = useTranslations('createGroup');
  const router = useRouter();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<GroupPrivacy>(GroupPrivacy.PUBLIC);
  const [maxMembers, setMaxMembers] = useState<number | ''>('');
  const [submitted, setSubmitted] = useState(false);

  const [createGroup, { loading }] = useMutation<CreateGroupResponse>(CREATE_GROUP, {
    refetchQueries: [
      { query: GET_MY_GROUPS, variables: MY_GROUPS_VARS },
      { query: GROUPS_DIRECTORY, variables: { query: '', limit: 20, offset: 0 } },
    ],
    awaitRefetchQueries: true,
  });

  const nameTrimmed = name.trim();
  const nameError = submitted && nameTrimmed.length < 2;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (nameTrimmed.length < 2) return;

    try {
      const res = await createGroup({
        variables: {
          createInput: {
            name: nameTrimmed,
            description: description.trim() || undefined,
            privacy,
            maxMembers: maxMembers !== '' ? Number(maxMembers) : undefined,
          },
        },
      });
      const result = res.data?.createGroup;
      if (result?.success && result.group?.id) {
        toast.success(t('successToast', { name: nameTrimmed }));
        onClose();
        router.push(`/groups/${encodeURIComponent(result.group.id)}`);
      } else {
        toast.error(result?.message ?? t('errorToast'));
      }
    } catch {
      toast.error(t('errorToast'));
    }
  };

  return (
    /* Backdrop */
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-group-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-md rounded-2xl border border-border-subtle bg-surface-default p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-surface-brand/10">
              <Users className="size-5 text-text-brand" aria-hidden />
            </span>
            <h2 id="create-group-dialog-title" className="text-lg font-bold text-text-primary">
              {t('title')}
            </h2>
          </div>
          <button
            type="button"
            aria-label={t('close')}
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="cg-name" className="mb-1 block text-sm font-semibold text-text-primary">
              {t('nameLabel')} <span aria-hidden className="text-text-danger">*</span>
            </label>
            <input
              id="cg-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              placeholder={t('namePlaceholder')}
              aria-describedby={nameError ? 'cg-name-error' : undefined}
              aria-invalid={nameError}
              className="w-full rounded-xl border border-border-subtle bg-surface-subtle px-4 py-2.5 text-sm text-text-primary placeholder:text-muted-foreground focus:border-border-brand focus:outline-none focus:ring-2 focus:ring-text-brand/20"
            />
            {nameError && (
              <p id="cg-name-error" role="alert" className="mt-1 text-xs text-text-danger">
                {t('nameError')}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="cg-desc" className="mb-1 block text-sm font-semibold text-text-primary">
              {t('descLabel')}
            </label>
            <textarea
              id="cg-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder={t('descPlaceholder')}
              className="w-full resize-none rounded-xl border border-border-subtle bg-surface-subtle px-4 py-2.5 text-sm text-text-primary placeholder:text-muted-foreground focus:border-border-brand focus:outline-none focus:ring-2 focus:ring-text-brand/20"
            />
          </div>

          {/* Privacy */}
          <div>
            <p className="mb-2 text-sm font-semibold text-text-primary">{t('privacyLabel')}</p>
            <div className="grid grid-cols-2 gap-2">
              {([GroupPrivacy.PUBLIC, GroupPrivacy.PRIVATE] as const).map((opt) => {
                const isSelected = privacy === opt;
                const Icon = opt === GroupPrivacy.PUBLIC ? Globe : Lock;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setPrivacy(opt)}
                    aria-pressed={isSelected}
                    className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand ${
                      isSelected
                        ? 'border-text-brand bg-surface-brand/10 text-text-brand'
                        : 'border-border-subtle bg-surface-subtle text-text-secondary hover:bg-surface-default'
                    }`}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden />
                    {t(`privacy.${opt}`)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Max Members (optional) */}
          <div>
            <label htmlFor="cg-max" className="mb-1 block text-sm font-semibold text-text-primary">
              {t('maxMembersLabel')}
            </label>
            <input
              id="cg-max"
              type="number"
              min={2}
              max={10000}
              value={maxMembers}
              onChange={(e) => setMaxMembers(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
              placeholder={t('maxMembersPlaceholder')}
              className="w-full rounded-xl border border-border-subtle bg-surface-subtle px-4 py-2.5 text-sm text-text-primary placeholder:text-muted-foreground focus:border-border-brand focus:outline-none focus:ring-2 focus:ring-text-brand/20"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="inline-flex h-10 items-center rounded-full border border-border-subtle px-5 text-sm font-semibold text-text-primary hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand disabled:opacity-60"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-surface-brand px-5 text-sm font-semibold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand disabled:opacity-60"
            >
              {loading && <Spinner className="size-4" />}
              {t('submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
