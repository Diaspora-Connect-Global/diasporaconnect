"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  GET_EVENT,
  GET_EVENT_STATS,
  GET_EVENT_REGISTRATIONS,
  GET_EVENT_ATTENDANCE,
  GET_EVENT_TICKETS,
  EVENT_PROMO_CODES,
  UPDATE_EVENT,
  PUBLISH_EVENT,
  UNPUBLISH_EVENT,
  CANCEL_EVENT,
  DELETE_EVENT,
  UPDATE_EVENT_FORM_FIELDS,
  CREATE_EVENT_TICKET,
  UPDATE_EVENT_TICKET,
  CREATE_EVENT_PROMO_CODE,
  DEACTIVATE_EVENT_PROMO_CODE,
  DELETE_EVENT_PROMO_CODE,
  type GetEventData,
  type GetEventStatsData,
  type GetEventRegistrationsData,
  type GetEventAttendanceData,
  type GetEventTicketsData,
  type EventPromoCodesData,
  type EventTicketFull,
  type EventPromoCode,
  type RegistrationFormField,
} from "@/services/gql/events";
import { ButtonType1, ButtonType2, ButtonType3 } from "@/components/custom/button";
import { ConfirmationModal } from "@/components/custom/confirmationModal";
import { TextInput, TextArea, Select } from "@/components/custom/input";
import { Link } from "@/i18n/navigation";
import {
  Loader2, ChevronLeft, Users, TicketIcon, Tag, BarChart2,
  ClipboardList, Settings, Plus, Trash2, PauseCircle,
  CheckSquare, Edit2, QrCode,
} from "lucide-react";
import { toast } from "sonner";

type Tab = 'overview' | 'registrations' | 'attendance' | 'tickets' | 'promoCodes' | 'formBuilder' | 'settings';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <BarChart2 className="w-4 h-4" /> },
  { id: 'registrations', label: 'Registrations', icon: <Users className="w-4 h-4" /> },
  { id: 'attendance', label: 'Attendance', icon: <QrCode className="w-4 h-4" /> },
  { id: 'tickets', label: 'Tickets', icon: <TicketIcon className="w-4 h-4" /> },
  { id: 'promoCodes', label: 'Promo Codes', icon: <Tag className="w-4 h-4" /> },
  { id: 'formBuilder', label: 'Reg. Form', icon: <ClipboardList className="w-4 h-4" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
];

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-lg border border-border-subtle p-4 space-y-1">
      <p className="text-sm text-text-secondary">{label}</p>
      <p className="text-2xl font-semibold text-text-primary">{value}</p>
      {sub && <p className="text-xs text-text-secondary">{sub}</p>}
    </div>
  );
}

// ─── Overview Tab ────────────────────────────────────────────────────────────
function OverviewTab({ eventId }: { eventId: string }) {
  const { data, loading } = useQuery<GetEventStatsData>(GET_EVENT_STATS, { variables: { eventId } });
  const stats = data?.getEventStats;

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-text-brand" /></div>;
  if (!stats) return <p className="text-text-secondary text-sm p-4">No stats available.</p>;

  const fillRate = stats.totalCapacity > 0
    ? Math.round((stats.confirmedRegistrations / stats.totalCapacity) * 100)
    : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total registrations" value={stats.totalRegistrations} />
        <StatCard label="Confirmed" value={stats.confirmedRegistrations} />
        <StatCard label="Pending" value={stats.pendingRegistrations} />
        <StatCard label="Cancelled" value={stats.cancelledRegistrations} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Check-ins" value={stats.totalCheckIns} />
        <StatCard label="Saves" value={stats.saveCount} />
        {stats.totalCapacity > 0 && (
          <StatCard label="Capacity" value={`${stats.confirmedRegistrations} / ${stats.totalCapacity}`} sub={fillRate != null ? `${fillRate}% filled` : undefined} />
        )}
        {stats.totalRevenue && (
          <StatCard label="Revenue" value={`${stats.currency ?? ''} ${stats.totalRevenue}`} />
        )}
      </div>
    </div>
  );
}

// ─── Registrations Tab ───────────────────────────────────────────────────────
function RegistrationsTab({ eventId }: { eventId: string }) {
  const [statusFilter, setStatusFilter] = useState('');
  const { data, loading, fetchMore } = useQuery<GetEventRegistrationsData>(GET_EVENT_REGISTRATIONS, {
    variables: { eventId, limit: 25, offset: 0, status: statusFilter || undefined },
  });

  const list = data?.getEventRegistrations;

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = {
      confirmed: 'text-text-success bg-surface-success',
      pending: 'text-text-warning bg-surface-warning',
      cancelled: 'text-text-danger bg-surface-danger',
      waitlisted: 'text-text-brand bg-surface-brand/10',
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${colors[s] ?? 'text-text-secondary bg-surface-subtle'}`}>
        {s}
      </span>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        {['', 'confirmed', 'pending', 'cancelled', 'waitlisted'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-sm border transition-colors
              ${statusFilter === s ? 'bg-surface-brand text-text-white border-surface-brand' : 'border-border-subtle text-text-secondary hover:text-text-primary'}`}
          >
            {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-text-brand" /></div>
      ) : !list?.registrations.length ? (
        <p className="text-text-secondary text-sm">No registrations yet.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border-subtle">
            <table className="w-full text-sm">
              <thead className="bg-surface-subtle text-text-secondary">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">User ID</th>
                  <th className="px-4 py-2 text-left font-medium">Qty</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                  <th className="px-4 py-2 text-left font-medium">Amount</th>
                  <th className="px-4 py-2 text-left font-medium">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {list.registrations.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-subtle">
                    <td className="px-4 py-2 font-mono text-xs text-text-secondary truncate max-w-[120px]">{r.userId}</td>
                    <td className="px-4 py-2">{r.quantity}</td>
                    <td className="px-4 py-2">{statusBadge(r.status)}</td>
                    <td className="px-4 py-2 text-text-secondary">{r.totalAmount ? `${r.currency} ${r.totalAmount}` : '—'}</td>
                    <td className="px-4 py-2 text-text-secondary text-xs">
                      {r.registeredAt ? new Date(r.registeredAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {list.hasMore && (
            <ButtonType3
              size="lg"
              onClick={() => fetchMore({ variables: { offset: list.registrations.length } })}
            >
              Load more
            </ButtonType3>
          )}
          <p className="text-xs text-text-secondary">{list.total} total registrations</p>
        </>
      )}
    </div>
  );
}

// ─── Attendance Tab ──────────────────────────────────────────────────────────
function AttendanceTab({ eventId }: { eventId: string }) {
  const { data, loading } = useQuery<GetEventAttendanceData>(GET_EVENT_ATTENDANCE, {
    variables: { eventId, limit: 50 },
  });
  const list = data?.getEventAttendance;

  const methodIcon = (m: string) => {
    if (m === 'qr_code') return <QrCode className="w-3 h-3" />;
    if (m === 'manual') return <CheckSquare className="w-3 h-3" />;
    return null;
  };

  return (
    <div className="space-y-3">
      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-text-brand" /></div>
      ) : !list?.attendance.length ? (
        <p className="text-text-secondary text-sm">No check-ins yet.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border-subtle">
            <table className="w-full text-sm">
              <thead className="bg-surface-subtle text-text-secondary">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">User ID</th>
                  <th className="px-4 py-2 text-left font-medium">Method</th>
                  <th className="px-4 py-2 text-left font-medium">Checked in</th>
                  <th className="px-4 py-2 text-left font-medium">Checked out</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {list.attendance.map((a) => (
                  <tr key={a.id} className="hover:bg-surface-subtle">
                    <td className="px-4 py-2 font-mono text-xs text-text-secondary truncate max-w-[120px]">{a.userId}</td>
                    <td className="px-4 py-2">
                      <span className="flex items-center gap-1 text-text-secondary capitalize">
                        {methodIcon(a.checkInMethod)} {a.checkInMethod.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-text-secondary">
                      {new Date(a.checkedInAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-xs text-text-secondary">
                      {a.checkedOutAt ? new Date(a.checkedOutAt).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-text-secondary">{list.total} total check-ins</p>
        </>
      )}
    </div>
  );
}

// ─── Tickets Tab ─────────────────────────────────────────────────────────────
function TicketsTab({ eventId }: { eventId: string }) {
  const { data, loading, refetch } = useQuery<GetEventTicketsData>(GET_EVENT_TICKETS, {
    variables: { eventId },
  });
  const [createTicket] = useMutation(CREATE_EVENT_TICKET, {
    onCompleted: () => { refetch(); setShowForm(false); setTicketForm(TICKET_INIT); toast.success('Ticket created'); },
    onError: (e) => toast.error(e.message),
  });
  const [updateTicket] = useMutation(UPDATE_EVENT_TICKET, {
    onCompleted: () => { refetch(); setEditingId(null); toast.success('Ticket updated'); },
    onError: (e) => toast.error(e.message),
  });

  const TICKET_INIT = { name: '', priceInCents: '', description: '', ticketType: 'general', quantity: '', isActive: true };
  const [showForm, setShowForm] = useState(false);
  const [ticketForm, setTicketForm] = useState(TICKET_INIT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<EventTicketFull & { priceStr: string; qtyStr: string }>>({});

  const handleCreate = () => {
    createTicket({
      variables: {
        eventId,
        input: {
          name: ticketForm.name,
          description: ticketForm.description || undefined,
          ticketType: ticketForm.ticketType,
          priceInCents: Math.round(Number(ticketForm.priceInCents) * 100),
          quantity: ticketForm.quantity ? Number(ticketForm.quantity) : 0,
        },
      },
    });
  };

  const startEdit = (t: EventTicketFull) => {
    setEditingId(t.id);
    setEditForm({ ...t, priceStr: ((t.priceInCents ?? 0) / 100).toFixed(2), qtyStr: String(t.totalQuantity ?? '') });
  };

  const handleUpdate = () => {
    if (!editingId) return;
    updateTicket({
      variables: {
        ticketId: editingId,
        input: {
          name: editForm.name,
          description: editForm.description,
          priceInCents: Math.round(Number(editForm.priceStr ?? 0) * 100),
          quantity: editForm.qtyStr ? Number(editForm.qtyStr) : 0,
          isActive: editForm.isActive,
        },
      },
    });
  };

  const tickets = data?.getEventTickets.tickets ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-text-secondary">{tickets.length} ticket type{tickets.length !== 1 ? 's' : ''}</p>
        <ButtonType2 size="default" onClick={() => setShowForm(!showForm)} className="flex items-center gap-1">
          <Plus className="w-4 h-4" /> New ticket
        </ButtonType2>
      </div>

      {showForm && (
        <div className="rounded-lg border border-border-subtle p-4 space-y-3 bg-surface-subtle">
          <p className="font-medium text-text-primary">New ticket type</p>
          <TextInput id="tname" label="Name" placeholder="General Admission" value={ticketForm.name} onChange={(v) => setTicketForm(p => ({ ...p, name: v }))} required />
          <div className="grid grid-cols-2 gap-3">
            <TextInput id="tprice" label="Price" type="number" placeholder="0.00" value={ticketForm.priceInCents} onChange={(v) => setTicketForm(p => ({ ...p, priceInCents: v }))} />
            <TextInput id="tqty" label="Quantity (0 = unlimited)" type="number" placeholder="0" value={ticketForm.quantity} onChange={(v) => setTicketForm(p => ({ ...p, quantity: v }))} />
          </div>
          <TextArea id="tdesc" label="Description (optional)" placeholder="" value={ticketForm.description} onChange={(v) => setTicketForm(p => ({ ...p, description: v }))} rows={2} />
          <div className="flex gap-2 justify-end">
            <ButtonType3 size="default" onClick={() => setShowForm(false)}>Cancel</ButtonType3>
            <ButtonType2 size="default" onClick={handleCreate} disabled={!ticketForm.name}>Create</ButtonType2>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-6"><Loader2 className="w-5 h-5 animate-spin text-text-brand" /></div>
      ) : tickets.length === 0 ? (
        <p className="text-text-secondary text-sm">No tickets yet.</p>
      ) : (
        <div className="space-y-2">
          {tickets.map((t) => (
            <div key={t.id} className="rounded-lg border border-border-subtle p-4">
              {editingId === t.id ? (
                <div className="space-y-3">
                  <TextInput id="en" label="Name" placeholder="" value={editForm.name ?? ''} onChange={(v) => setEditForm(p => ({ ...p, name: v }))} />
                  <div className="grid grid-cols-2 gap-3">
                    <TextInput id="ep" label="Price" type="number" placeholder="" value={editForm.priceStr ?? ''} onChange={(v) => setEditForm(p => ({ ...p, priceStr: v }))} />
                    <TextInput id="eq" label="Quantity" type="number" placeholder="" value={editForm.qtyStr ?? ''} onChange={(v) => setEditForm(p => ({ ...p, qtyStr: v }))} />
                  </div>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={editForm.isActive ?? true} onChange={(e) => setEditForm(p => ({ ...p, isActive: e.target.checked }))} className="w-4 h-4 accent-surface-brand" />
                    Active
                  </label>
                  <div className="flex gap-2 justify-end">
                    <ButtonType3 size="default" onClick={() => setEditingId(null)}>Cancel</ButtonType3>
                    <ButtonType2 size="default" onClick={handleUpdate}>Save</ButtonType2>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-text-primary">{t.name}</p>
                    <p className="text-sm text-text-secondary">
                      {t.priceInCents === 0 ? 'Free' : `${(t.priceInCents / 100).toFixed(2)}`}
                      {' · '}
                      {t.soldQuantity ?? 0} sold
                      {t.totalQuantity ? ` / ${t.totalQuantity}` : ' (unlimited)'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!t.isActive && <span className="text-xs text-text-secondary bg-surface-subtle px-2 py-0.5 rounded-full">Inactive</span>}
                    <ButtonType1 size="default" onClick={() => startEdit(t)} className="flex items-center gap-1">
                      <Edit2 className="w-3 h-3" /> Edit
                    </ButtonType1>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Promo Codes Tab ─────────────────────────────────────────────────────────
function PromoCodesTab({ eventId }: { eventId: string }) {
  const { data, loading, refetch } = useQuery<EventPromoCodesData>(EVENT_PROMO_CODES, { variables: { eventId } });
  const [createCode] = useMutation(CREATE_EVENT_PROMO_CODE, {
    onCompleted: () => { refetch(); setShowForm(false); setForm(FORM_INIT); toast.success('Promo code created'); },
    onError: (e) => toast.error(e.message),
  });
  const [deactivateCode] = useMutation(DEACTIVATE_EVENT_PROMO_CODE, {
    onCompleted: () => { refetch(); toast.success('Promo code deactivated'); },
    onError: (e) => toast.error(e.message),
  });
  const [deleteCode] = useMutation(DELETE_EVENT_PROMO_CODE, {
    onCompleted: () => { refetch(); toast.success('Promo code deleted'); },
    onError: (e) => toast.error(e.message),
  });

  const FORM_INIT = { code: '', discountType: 'percentage', discountValue: '', maxUses: '', expiresAt: '' };
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(FORM_INIT);
  const [deleteTarget, setDeleteTarget] = useState<EventPromoCode | null>(null);

  const handleCreate = () => {
    createCode({
      variables: {
        input: {
          eventId,
          code: form.code.trim().toUpperCase(),
          discountType: form.discountType,
          discountValue: Number(form.discountValue),
          maxUses: form.maxUses ? Number(form.maxUses) : 0,
          expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
        },
      },
    });
  };

  const codes = data?.eventPromoCodes ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-text-secondary">{codes.length} promo code{codes.length !== 1 ? 's' : ''}</p>
        <ButtonType2 size="default" onClick={() => setShowForm(!showForm)} className="flex items-center gap-1">
          <Plus className="w-4 h-4" /> New code
        </ButtonType2>
      </div>

      {showForm && (
        <div className="rounded-lg border border-border-subtle p-4 space-y-3 bg-surface-subtle">
          <p className="font-medium text-text-primary">New promo code</p>
          <TextInput id="pcode" label="Code" placeholder="SAVE20" value={form.code} onChange={(v) => setForm(p => ({ ...p, code: v }))} required />
          <div className="grid grid-cols-2 gap-3">
            <Select
              id="pdtype"
              label="Discount type"
              value={form.discountType}
              onChange={(v) => setForm(p => ({ ...p, discountType: v }))}
              options={[{ value: 'percentage', label: '% Percentage' }, { value: 'fixed', label: 'Fixed amount' }]}
            />
            <TextInput
              id="pdval"
              label={form.discountType === 'percentage' ? 'Percentage (0-100)' : 'Amount (in major units)'}
              type="number"
              placeholder={form.discountType === 'percentage' ? '20' : '10.00'}
              value={form.discountValue}
              onChange={(v) => setForm(p => ({ ...p, discountValue: v }))}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextInput id="pmaxuses" label="Max uses (0 = unlimited)" type="number" placeholder="0" value={form.maxUses} onChange={(v) => setForm(p => ({ ...p, maxUses: v }))} />
            <TextInput id="pexpiry" label="Expires at (optional)" type="datetime-local" placeholder="" value={form.expiresAt} onChange={(v) => setForm(p => ({ ...p, expiresAt: v }))} />
          </div>
          <div className="flex gap-2 justify-end">
            <ButtonType3 size="default" onClick={() => setShowForm(false)}>Cancel</ButtonType3>
            <ButtonType2 size="default" onClick={handleCreate} disabled={!form.code || !form.discountValue}>Create</ButtonType2>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-6"><Loader2 className="w-5 h-5 animate-spin text-text-brand" /></div>
      ) : codes.length === 0 ? (
        <p className="text-text-secondary text-sm">No promo codes yet.</p>
      ) : (
        <div className="space-y-2">
          {codes.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-lg border border-border-subtle p-3">
              <div>
                <p className="font-mono font-medium text-text-primary">{c.code}</p>
                <p className="text-sm text-text-secondary">
                  {c.discountType === 'percentage' ? `${c.discountValue}% off` : `${c.discountValue / 100} fixed`}
                  {' · '}
                  {c.usesCount}/{c.maxUses === 0 ? '∞' : c.maxUses} used
                  {c.expiresAt && ` · expires ${new Date(c.expiresAt).toLocaleDateString()}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!c.isActive && <span className="text-xs text-text-secondary bg-surface-subtle px-2 py-0.5 rounded-full">Inactive</span>}
                {c.isActive && (
                  <ButtonType1 size="default" onClick={() => deactivateCode({ variables: { promoCodeId: c.id } })} className="flex items-center gap-1">
                    <PauseCircle className="w-3 h-3" /> Deactivate
                  </ButtonType1>
                )}
                <ButtonType1 size="default" onClick={() => setDeleteTarget(c)} className="flex items-center gap-1 text-text-danger border-text-danger">
                  <Trash2 className="w-3 h-3" />
                </ButtonType1>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmationModal
        open={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => { deleteCode({ variables: { promoCodeId: deleteTarget?.id } }); setDeleteTarget(null); }}
        title="Delete promo code"
        description={`Delete "${deleteTarget?.code}"? This cannot be undone.`}
        confirmText="Delete"
        confirmVariant="destructive"
      />
    </div>
  );
}

// ─── Form Builder Tab ─────────────────────────────────────────────────────────
function FormBuilderTab({ eventId }: { eventId: string }) {
  const { data } = useQuery<GetEventData>(GET_EVENT, { variables: { id: eventId } });
  const event = data?.getEvent;

  const [fields, setFields] = useState<RegistrationFormField[]>(() => event?.registrationFormFields ?? []);
  const [updateFormFields, { loading: saving }] = useMutation(UPDATE_EVENT_FORM_FIELDS, {
    onCompleted: () => toast.success('Form saved'),
    onError: (e) => toast.error(e.message),
  });

  const FIELD_TYPES = [
    { value: 'text', label: 'Text' },
    { value: 'select', label: 'Single choice' },
    { value: 'multiselect', label: 'Multiple choice' },
    { value: 'checkbox', label: 'Checkbox' },
  ];

  const addField = () => {
    setFields((prev) => [...prev, { id: `new_${Date.now()}`, label: '', type: 'text', required: false, options: [] }]);
  };

  const updateField = (idx: number, patch: Partial<RegistrationFormField>) => {
    setFields((prev) => prev.map((f, i) => i === idx ? { ...f, ...patch } : f));
  };

  const removeField = (idx: number) => {
    setFields((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    updateFormFields({
      variables: {
        input: {
          eventId,
          fields: fields.map((f) => ({
            id: f.id.startsWith('new_') ? undefined : f.id,
            label: f.label,
            type: f.type,
            required: f.required,
            options: ['select', 'multiselect'].includes(f.type) ? (f.options ?? []) : undefined,
          })),
        },
      },
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        These fields are shown to attendees when they register. Leave empty to use no custom form.
      </p>

      <div className="space-y-3">
        {fields.map((field, idx) => (
          <div key={field.id} className="rounded-lg border border-border-subtle p-4 space-y-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <TextInput
                  id={`label_${idx}`}
                  label="Question label"
                  placeholder="e.g. Full Name"
                  value={field.label}
                  onChange={(v) => updateField(idx, { label: v })}
                  required
                />
              </div>
              <Select
                id={`type_${idx}`}
                label="Type"
                value={field.type}
                onChange={(v) => updateField(idx, { type: v as RegistrationFormField['type'] })}
                options={FIELD_TYPES}
              />
              <button onClick={() => removeField(idx)} className="mt-6 text-text-danger hover:text-text-danger/70">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {(field.type === 'select' || field.type === 'multiselect') && (
              <div className="space-y-1">
                <label className="text-xs text-text-secondary">Options (one per line)</label>
                <textarea
                  value={(field.options ?? []).join('\n')}
                  onChange={(e) => updateField(idx, { options: e.target.value.split('\n').filter(Boolean) })}
                  rows={3}
                  placeholder="Option A&#10;Option B&#10;Option C"
                  className="w-full bg-surface-subtle border-2 border-border-subtle rounded-md px-3 py-2 text-sm focus:outline-none resize-none placeholder:text-text-secondary"
                />
              </div>
            )}

            <label className="flex items-center gap-2 text-sm cursor-pointer text-text-secondary">
              <input
                type="checkbox"
                checked={field.required}
                onChange={(e) => updateField(idx, { required: e.target.checked })}
                className="w-4 h-4 accent-surface-brand"
              />
              Required
            </label>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <ButtonType1 size="default" onClick={addField} className="flex items-center gap-1">
          <Plus className="w-4 h-4" /> Add field
        </ButtonType1>
        <ButtonType2 size="default" onClick={handleSave} disabled={saving} className="flex items-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Save form
        </ButtonType2>
        {fields.length > 0 && (
          <ButtonType3 size="default" onClick={() => { setFields([]); }}>
            Clear form
          </ButtonType3>
        )}
      </div>
    </div>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────
function SettingsTab({ eventId }: { eventId: string }) {
  const router = useRouter();
  const { data, refetch } = useQuery<GetEventData>(GET_EVENT, { variables: { id: eventId } });
  const event = data?.getEvent;

  const [updateEvent, { loading: updating }] = useMutation(UPDATE_EVENT, {
    onCompleted: () => { refetch(); toast.success('Event updated'); },
    onError: (e) => toast.error(e.message),
  });
  const [publishEvent, { loading: publishing }] = useMutation(PUBLISH_EVENT, {
    onCompleted: () => { refetch(); toast.success('Event published!'); },
    onError: (e) => toast.error(e.message),
  });
  const [unpublishEvent, { loading: unpublishing }] = useMutation(UNPUBLISH_EVENT, {
    onCompleted: () => { refetch(); toast.success('Event unpublished'); },
    onError: (e) => toast.error(e.message),
  });
  const [cancelEvent, { loading: cancelling }] = useMutation(CANCEL_EVENT, {
    onCompleted: () => { refetch(); toast.success('Event cancelled'); setCancelModal(false); },
    onError: (e) => toast.error(e.message),
  });
  const [deleteEvent, { loading: deleting }] = useMutation(DELETE_EVENT, {
    onCompleted: () => { toast.success('Event deleted'); router.push('/events'); },
    onError: (e) => toast.error(e.message),
  });
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const startEdit = () => {
    setEditTitle(event?.title ?? '');
    setEditDesc(event?.description ?? '');
    setEditMode(true);
  };

  const handleUpdate = () => {
    updateEvent({ variables: { id: eventId, input: { title: editTitle, description: editDesc } } });
    setEditMode(false);
  };

  if (!event) return <div className="flex justify-center p-6"><Loader2 className="w-5 h-5 animate-spin text-text-brand" /></div>;

  const statusBadge = {
    draft: 'bg-surface-subtle text-text-secondary',
    published: 'bg-surface-success text-text-success',
    cancelled: 'bg-surface-danger text-text-danger',
    completed: 'bg-surface-subtle text-text-secondary',
  }[event.status] ?? 'bg-surface-subtle text-text-secondary';

  return (
    <div className="space-y-6">
      {/* Status & quick actions */}
      <div className="flex flex-wrap items-center gap-3">
        <span className={`text-sm px-3 py-1 rounded-full capitalize font-medium ${statusBadge}`}>
          {event.status}
        </span>
        {event.status === 'draft' && (
          <ButtonType2 size="default" onClick={() => publishEvent({ variables: { id: eventId } })} disabled={publishing} className="flex items-center gap-1">
            {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Publish
          </ButtonType2>
        )}
        {event.status === 'published' && (
          <ButtonType1 size="default" onClick={() => unpublishEvent({ variables: { id: eventId } })} disabled={unpublishing}>
            {unpublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Unpublish'}
          </ButtonType1>
        )}
        {(event.status === 'draft' || event.status === 'published') && (
          <ButtonType1 size="default" onClick={() => setCancelModal(true)} className="flex items-center gap-1 text-text-danger border-text-danger">
            Cancel event
          </ButtonType1>
        )}
        <Link href={`/events/${eventId}`} className="text-sm text-text-brand hover:underline">
          View public page →
        </Link>
      </div>

      {/* Edit basic info */}
      <div className="rounded-lg border border-border-subtle p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-medium text-text-primary">Basic info</p>
          {!editMode && (
            <ButtonType1 size="default" onClick={startEdit} className="flex items-center gap-1">
              <Edit2 className="w-3 h-3" /> Edit
            </ButtonType1>
          )}
        </div>
        {editMode ? (
          <>
            <TextInput id="stitle" label="Title" placeholder="" value={editTitle} onChange={setEditTitle} required />
            <TextArea id="sdesc" label="Description" placeholder="" value={editDesc} onChange={setEditDesc} rows={4} />
            <div className="flex gap-2 justify-end">
              <ButtonType3 size="default" onClick={() => setEditMode(false)}>Cancel</ButtonType3>
              <ButtonType2 size="default" onClick={handleUpdate} disabled={updating} className="flex items-center gap-2">
                {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save
              </ButtonType2>
            </div>
          </>
        ) : (
          <>
            <p className="text-text-primary font-medium">{event.title}</p>
            <p className="text-sm text-text-secondary line-clamp-3">{event.description}</p>
          </>
        )}
      </div>

      {/* Danger zone */}
      <div className="rounded-lg border border-text-danger/30 p-4 space-y-3">
        <p className="font-medium text-text-danger">Danger zone</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-text-primary">Delete this event</p>
            <p className="text-xs text-text-secondary">Permanently removes all data. This cannot be undone.</p>
          </div>
          <ButtonType1 size="default" onClick={() => setDeleteModal(true)} className="text-text-danger border-text-danger flex items-center gap-1">
            <Trash2 className="w-3 h-3" /> Delete
          </ButtonType1>
        </div>
      </div>

      {/* Cancel modal */}
      <ConfirmationModal
        open={cancelModal}
        onCancel={() => { setCancelModal(false); setCancelReason(''); }}
        onConfirm={() => {
          if (!cancelReason.trim()) { toast.error('Please enter a cancellation reason'); return; }
          cancelEvent({ variables: { id: eventId, reason: cancelReason } });
        }}
        title="Cancel event"
        description="This will notify all registered attendees."
        confirmText="Cancel event"
        confirmVariant="destructive"
        isLoading={cancelling}
      >
        <div className="mt-3">
          <TextArea id="creason" label="Cancellation reason" placeholder="e.g. Venue unavailable" value={cancelReason} onChange={setCancelReason} rows={2} required />
        </div>
      </ConfirmationModal>

      {/* Delete modal */}
      <ConfirmationModal
        open={deleteModal}
        onCancel={() => setDeleteModal(false)}
        onConfirm={() => deleteEvent({ variables: { id: eventId } })}
        title="Delete event"
        description="This action is permanent and cannot be undone. All registrations and tickets will be removed."
        confirmText="Delete permanently"
        confirmVariant="destructive"
        isLoading={deleting}
      />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function EventManagePage() {
  const params = useParams();
  const eventId = params.id as string;
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const { data, loading } = useQuery<GetEventData>(GET_EVENT, {
    variables: { id: eventId },
    skip: !eventId,
  });
  const event = data?.getEvent;

  if (!eventId) return <div className="p-4 text-center text-text-secondary">Invalid event.</div>;
  if (!loading && event?.ownerType === 'user') {
    return (
      <div className="h-[calc(100vh-4rem)] lg:w-[60vw] overflow-y-auto scrollbar-hide p-4">
        <div className="max-w-3xl mx-auto rounded-lg border border-border-subtle p-6 text-center space-y-3">
          <h1 className="heading-small">Event management unavailable</h1>
          <p className="text-sm text-text-secondary">Users are not allowed to manage events.</p>
          <div>
            <Link href={`/events/${eventId}`} className="text-sm text-text-brand hover:underline">
              Back to event
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] lg:w-[60vw] overflow-y-auto scrollbar-hide p-4">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href={`/events/${eventId}`} className="text-text-secondary hover:text-text-brand">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            {loading ? (
              <div className="h-5 w-40 rounded bg-surface-subtle animate-pulse" />
            ) : (
              <h1 className="heading-small truncate">{event?.title ?? 'Manage event'}</h1>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto scrollbar-hide border-b border-border-subtle pb-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm whitespace-nowrap border-b-2 transition-colors
                ${activeTab === tab.id
                  ? 'border-text-brand text-text-brand font-medium'
                  : 'border-transparent text-text-secondary hover:text-text-primary'}`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="pt-1">
          {activeTab === 'overview' && <OverviewTab eventId={eventId} />}
          {activeTab === 'registrations' && <RegistrationsTab eventId={eventId} />}
          {activeTab === 'attendance' && <AttendanceTab eventId={eventId} />}
          {activeTab === 'tickets' && <TicketsTab eventId={eventId} />}
          {activeTab === 'promoCodes' && <PromoCodesTab eventId={eventId} />}
          {activeTab === 'formBuilder' && <FormBuilderTab eventId={eventId} />}
          {activeTab === 'settings' && <SettingsTab eventId={eventId} />}
        </div>
      </div>
    </div>
  );
}
