'use client';

import { useQuery, useMutation } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { Users } from 'lucide-react';
import { toast } from 'sonner';
import { useUserStore } from '@/store/useUserStore';
import { toCdnUrl } from '@/lib/cdn';
import { useImageFallback } from '@/components/ui/ImageWithFallback';
import {
  GET_ALL_PENDING_CONNECTIONS,
  ACCEPT_CONNECTION,
  REJECT_CONNECTION,
  GetPendingRequestsResponse,
  AcceptConnectionResponse,
  RejectConnectionResponse,
} from '@/services/gql/connection';
import { EmptyState } from '@/components/feedback';
import { Spinner } from '@/components/ui/spinner';

const SILENT = { context: { silentErrors: true } } as const;

interface PendingConn {
  id: string;
  requesterId: string;
  receiverId: string;
  message?: string | null;
  createdAt?: string | null;
  requester: { userId: string; firstName: string; lastName: string; avatarUrl?: string | null; occupation?: string | null; sector?: string | null };
  receiver: { userId: string; firstName: string; lastName: string; avatarUrl?: string | null; occupation?: string | null; sector?: string | null };
}

function PersonRow({
  conn,
  direction,
  onAccept,
  onReject,
  accepting,
  rejecting,
}: {
  conn: PendingConn;
  direction: 'received' | 'sent';
  onAccept?: () => void;
  onReject?: () => void;
  accepting?: boolean;
  rejecting?: boolean;
}) {
  const t = useTranslations('requestsPage');
  const person = direction === 'received' ? conn.requester : conn.receiver;
  const { src, onError } = useImageFallback(
    person.avatarUrl ? toCdnUrl(person.avatarUrl) : undefined,
    '/PROFILE.png',
  );
  const date = conn.createdAt
    ? new Date(conn.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : null;

  return (
    <li className="flex items-start gap-3 px-4 py-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        width={40}
        height={40}
        onError={onError}
        className="size-10 shrink-0 rounded-full border border-border-subtle object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-text-primary">
          {person.firstName} {person.lastName}
        </p>
        {(person.occupation ?? person.sector) && (
          <p className="truncate text-xs text-muted-foreground">
            {person.occupation ?? person.sector}
          </p>
        )}
        {date && <p className="text-xs text-text-secondary">{date}</p>}
        {direction === 'received' && (
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={onAccept}
              disabled={accepting || rejecting}
              className="inline-flex h-7 items-center rounded-full bg-surface-brand px-3 text-xs font-semibold text-white transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand disabled:opacity-60"
            >
              {accepting ? <Spinner className="size-3" /> : t('accept')}
            </button>
            <button
              type="button"
              onClick={onReject}
              disabled={accepting || rejecting}
              className="inline-flex h-7 items-center rounded-full border border-border-subtle bg-surface-default px-3 text-xs font-semibold text-text-primary transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand disabled:opacity-60"
            >
              {rejecting ? <Spinner className="size-3" /> : t('decline')}
            </button>
          </div>
        )}
        {direction === 'sent' && (
          <span className="mt-1 inline-block rounded-full bg-surface-info px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-brand">
            {t('pending')}
          </span>
        )}
      </div>
    </li>
  );
}

function ConnectionSection({
  items,
  direction,
}: {
  items: PendingConn[];
  direction: 'received' | 'sent';
}) {
  const t = useTranslations('requestsPage');
  const [accepting, setAccepting] = React.useState<Record<string, boolean>>({});
  const [rejecting, setRejecting] = React.useState<Record<string, boolean>>({});

  const [acceptConn] = useMutation<AcceptConnectionResponse>(ACCEPT_CONNECTION, {
    refetchQueries: [{ query: GET_ALL_PENDING_CONNECTIONS, variables: { limit: 100, offset: 0 } }],
    awaitRefetchQueries: true,
    ...SILENT,
  });

  const [rejectConn] = useMutation<RejectConnectionResponse>(REJECT_CONNECTION, {
    refetchQueries: [{ query: GET_ALL_PENDING_CONNECTIONS, variables: { limit: 100, offset: 0 } }],
    awaitRefetchQueries: true,
    ...SILENT,
  });

  const doAccept = async (conn: PendingConn) => {
    setAccepting((p) => ({ ...p, [conn.id]: true }));
    try {
      const res = await acceptConn({ variables: { input: { connectionId: conn.id } } });
      if (res.data?.acceptConnection?.success) toast.success(t('acceptedToast'));
      else toast.error(res.data?.acceptConnection?.message ?? t('acceptFailed'));
    } catch {
      toast.error(t('acceptFailed'));
    } finally {
      setAccepting((p) => ({ ...p, [conn.id]: false }));
    }
  };

  const doReject = async (conn: PendingConn) => {
    setRejecting((p) => ({ ...p, [conn.id]: true }));
    try {
      const res = await rejectConn({ variables: { input: { connectionId: conn.id } } });
      if (res.data?.rejectConnection?.success) toast.success(t('declinedToast'));
      else toast.error(res.data?.rejectConnection?.message ?? t('declineFailed'));
    } catch {
      toast.error(t('declineFailed'));
    } finally {
      setRejecting((p) => ({ ...p, [conn.id]: false }));
    }
  };

  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-default">
      <p className="border-b border-border-subtle px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-text-secondary">
        {direction === 'received' ? t('received') : t('sent')}
      </p>
      <ul className="divide-y divide-border-subtle">
        {items.map((conn) => (
          <PersonRow
            key={conn.id}
            conn={conn}
            direction={direction}
            onAccept={() => doAccept(conn)}
            onReject={() => doReject(conn)}
            accepting={accepting[conn.id]}
            rejecting={rejecting[conn.id]}
          />
        ))}
      </ul>
    </div>
  );
}

import React from 'react';

export function ConnectionRequestsList() {
  const t = useTranslations('requestsPage');

  const { data, loading } = useQuery<GetPendingRequestsResponse>(GET_ALL_PENDING_CONNECTIONS, {
    variables: { limit: 100, offset: 0 },
    fetchPolicy: 'cache-and-network',
    ...SILENT,
  });

  const myUserId = useUserStore.getState().user?.userId;
  const all = data?.getPendingConnections?.connections ?? [];
  const received = all.filter((c) => c.receiverId === myUserId) as PendingConn[];
  const sent = all.filter((c) => c.requesterId === myUserId) as PendingConn[];

  if (loading && !data) {
    return (
      <div className="flex justify-center py-6">
        <Spinner className="size-6 text-text-brand" />
      </div>
    );
  }

  if (all.length === 0) {
    return (
      <div className="rounded-2xl border border-border-subtle bg-surface-default p-8">
        <EmptyState size="sm" icon={Users} title={t('emptyConnections')} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ConnectionSection items={received} direction="received" />
      <ConnectionSection items={sent} direction="sent" />
    </div>
  );
}
