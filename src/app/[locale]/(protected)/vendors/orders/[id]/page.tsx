"use client";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useMutation, useQuery, useApolloClient } from "@apollo/client/react";
import { toast } from "sonner";
import { ConfirmationModal } from "@/components/custom/confirmationModal";
import {
  GET_MARKETPLACE_ORDER,
  CANCEL_MARKETPLACE_ORDER,
  CONFIRM_ORDER_DELIVERY,
  GET_PRODUCT,
} from "@/services/gql/marketplace";
import type {
  GetMarketplaceOrderResponse,
  CancelMarketplaceOrderResponse,
  ConfirmOrderDeliveryResponse,
  GetProductResponse,
} from "@/services/gql/types/marketplace";

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Pending Payment",
  PAYMENT_CONFIRMED: "Payment Confirmed",
  IN_PROGRESS: "In Progress",
  DELIVERED: "Delivered",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  DISPUTED: "Disputed",
  REFUNDED: "Refunded",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING_PAYMENT: "text-text-warning",
  PAYMENT_CONFIRMED: "text-text-brand",
  IN_PROGRESS: "text-text-brand",
  DELIVERED: "text-text-success",
  COMPLETED: "text-text-success",
  CANCELLED: "text-text-danger",
  DISPUTED: "text-text-danger",
  REFUNDED: "text-text-secondary",
};

export default function OrderDetailsPage() {
  const t = useTranslations("vendors.orders");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const params = useParams();
  const orderId = params?.id as string;

  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [productNames, setProductNames] = useState<Record<string, string>>({});
  const fetchedIds = useRef<Set<string>>(new Set());
  const client = useApolloClient();

  const { data, loading, error } = useQuery<GetMarketplaceOrderResponse>(GET_MARKETPLACE_ORDER, {
    variables: { order_id: orderId },
    skip: !orderId,
  });

  const order = data?.getMarketplaceOrder?.order;

  useEffect(() => {
    const items = order?.items ?? [];
    if (items.length === 0) return;
    const unfetched = items.filter((i) => i.product_id && !fetchedIds.current.has(i.product_id));
    if (unfetched.length === 0) return;

    for (const i of unfetched) fetchedIds.current.add(i.product_id);

    Promise.all(
      unfetched.map((i) =>
        client
          .query<GetProductResponse>({ query: GET_PRODUCT, variables: { product_id: i.product_id } })
          .then((res) => ({ id: i.product_id, title: res.data?.getProduct?.product?.title ?? null }))
          .catch(() => ({ id: i.product_id, title: null }))
      )
    ).then((results) => {
      const names: Record<string, string> = {};
      for (const r of results) {
        if (r.id && r.title) names[r.id] = r.title;
      }
      if (Object.keys(names).length > 0) {
        setProductNames((prev) => ({ ...prev, ...names }));
      }
    });
  }, [order?.items, client]);

  const [cancelOrder, { loading: cancelling }] = useMutation<CancelMarketplaceOrderResponse>(
    CANCEL_MARKETPLACE_ORDER
  );
  const [confirmDelivery, { loading: confirming }] = useMutation<ConfirmOrderDeliveryResponse>(
    CONFIRM_ORDER_DELIVERY
  );

  const formatAmount = (amount: number, currency: string) =>
    `${currency} ${(amount / 100).toFixed(2)}`;

  const handleDeclineConfirm = async () => {
    try {
      const { data: mutData } = await cancelOrder({
        variables: { order_id: orderId, reason: declineReason || undefined },
      });
      if (!mutData?.cancelMarketplaceOrder?.success) {
        toast.error(mutData?.cancelMarketplaceOrder?.message ?? "Failed to decline order");
        return;
      }
      toast.success("Order declined");
      setDeclineModalOpen(false);
      router.push(`/${locale}/vendors/orders`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to decline order";
      toast.error(msg);
    }
  };

  const handleProcessOrder = async () => {
    try {
      const { data: mutData } = await confirmDelivery({ variables: { order_id: orderId } });
      if (!mutData?.confirmOrderDelivery?.success) {
        toast.error(mutData?.confirmOrderDelivery?.message ?? "Failed to confirm delivery");
        return;
      }
      toast.success("Delivery confirmed");
      router.push(`/${locale}/vendors/orders`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to confirm delivery";
      toast.error(msg);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-text-secondary">Loading order…</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-8">
        <p className="text-text-danger">Order not found.</p>
      </div>
    );
  }

  const canDecline = !["COMPLETED", "CANCELLED", "REFUNDED"].includes(order.status ?? "");
  const canConfirmDelivery = order.status === "IN_PROGRESS";

  return (
    <div className="p-8 max-w-7xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-text-secondary mb-4">
        <button
          onClick={() => router.push(`/${locale}/vendors/orders`)}
          className="hover:text-text-primary"
        >
          {t("title")}
        </button>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-text-primary font-mono">{orderId.slice(0, 8)}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">{t("orderDetails") || "Order details"}</h1>
        <div className="flex gap-3">
          {canDecline && (
            <button
              onClick={() => setDeclineModalOpen(true)}
              disabled={cancelling}
              className="px-6 py-2.5 border-2 border-border-danger text-text-danger rounded-lg font-medium hover:bg-surface-danger transition-colors disabled:opacity-50"
            >
              Decline order
            </button>
          )}
          {canConfirmDelivery && (
            <button
              onClick={handleProcessOrder}
              disabled={confirming}
              className="px-6 py-2.5 bg-surface-brand text-text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {confirming ? "Confirming…" : "Confirm delivery"}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="col-span-2 space-y-6">
          {/* Order Details Card */}
          <div className="bg-surface-default rounded-xl border border-border-subtle p-6">
            <div className="grid grid-cols-3 gap-6 mb-6">
              <div>
                <p className="text-sm text-text-secondary mb-1">Order number</p>
                <p className="text-base font-medium text-text-primary font-mono">{orderId.slice(0, 8)}</p>
              </div>
              <div>
                <p className="text-sm text-text-secondary mb-1">Order date</p>
                <p className="text-base font-medium text-text-primary">
                  {order.created_at
                    ? new Date(order.created_at).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-text-secondary mb-1">Status</p>
                <p className={`text-base font-medium ${STATUS_COLORS[order.status ?? ""] ?? "text-text-primary"}`}>
                  {STATUS_LABELS[order.status ?? ""] ?? order.status}
                </p>
              </div>
            </div>

            {["PAYMENT_CONFIRMED", "IN_PROGRESS"].includes(order.status ?? "") && (
              <div className="bg-surface-brand-subtle border border-border-brand rounded-lg p-4">
                <p className="text-sm font-medium text-text-brand mb-1">Payment secured in escrow</p>
                <p className="text-sm text-text-secondary">
                  {order.status === "PAYMENT_CONFIRMED"
                    ? "Payment confirmed — fulfill and confirm delivery when done."
                    : "Order in progress — confirm delivery once fulfilled."}
                </p>
              </div>
            )}
          </div>

          {/* Order Items */}
          <div className="bg-surface-default rounded-xl border border-border-subtle overflow-hidden">
            <div className="divide-y divide-border-subtle">
              {(order.items ?? []).map((item, idx) => (
                <div key={`${item.product_id}-${idx}`} className="p-6 flex gap-4">
                  <div className="w-16 h-16 rounded-lg bg-surface-subtle flex items-center justify-center text-2xl flex-shrink-0">
                    📦
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-medium text-text-primary mb-1">
                      {productNames[item.product_id] ?? (
                        <span className="font-mono text-sm text-text-tertiary">{item.product_id.slice(0, 12)}…</span>
                      )}
                    </p>
                    <p className="text-sm text-text-secondary">Qty: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-medium text-text-primary">
                      {item.currency} {((item.price ?? 0) / 100).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t border-border-subtle p-6 space-y-3">
              <div className="flex justify-between text-base font-semibold">
                <span className="text-text-primary">Total</span>
                <span className="text-text-primary">
                  {formatAmount(order.total_amount ?? 0, order.currency ?? "GHS")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Buyer Info */}
          <div className="bg-surface-default rounded-xl border border-border-subtle p-6">
            <h3 className="text-sm font-medium text-text-secondary mb-4">Customer ID</h3>
            <p className="text-sm font-mono text-text-primary break-all">{order.buyer_id}</p>
          </div>

          {/* Shipping Address */}
          {order.shipping_address && (
            <div className="bg-surface-default rounded-xl border border-border-subtle p-6">
              <h3 className="text-sm font-medium text-text-secondary mb-4">Shipping Address</h3>
              <p className="text-sm text-text-primary whitespace-pre-wrap">{order.shipping_address}</p>
            </div>
          )}

          {/* Notes */}
          {order.notes && (
            <div className="bg-surface-default rounded-xl border border-border-subtle p-6">
              <h3 className="text-sm font-medium text-text-secondary mb-2">Notes</h3>
              <p className="text-sm text-text-primary">{order.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Decline Modal */}
      <ConfirmationModal
        open={declineModalOpen}
        onCancel={() => setDeclineModalOpen(false)}
        onConfirm={handleDeclineConfirm}
        title="Decline this order?"
        description="This will cancel the order and release the payment back to the buyer."
        confirmText={cancelling ? "Declining…" : "Decline order"}
        confirmVariant="destructive"
      >
        <div className="mt-2">
          <label className="block text-sm text-text-secondary mb-1">Reason (optional)</label>
          <input
            type="text"
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            placeholder="e.g. Out of stock"
            className="w-full px-3 py-2 border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-border-brand"
          />
        </div>
      </ConfirmationModal>
    </div>
  );
}
