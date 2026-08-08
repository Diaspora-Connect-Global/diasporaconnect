"use client";

import React, { useState } from "react";
import { useMutation } from "@apollo/client/react";
import { useTranslations } from "next-intl";
import { ADD_REVIEW, GET_PRODUCT_REVIEWS } from "@/services/gql/marketplace";
import type { AddReviewMutationResponse } from "@/services/gql/types/marketplace";
import { StarRating } from "./StarRating";

/**
 * Post a review for one purchased item.
 *
 * Belongs beside a delivered/completed order — marketplace-service rejects the
 * review unless `orderId` is the caller's own order, has reached DELIVERED or
 * COMPLETED, and actually contained `targetId`. The author is taken from the
 * session by the gateway, never sent from here.
 */
export function WriteReviewForm({
  targetId,
  orderId,
  vendorId,
  onPosted,
}: {
  targetId: string;
  orderId: string;
  vendorId: string;
  onPosted?: () => void;
}) {
  const t = useTranslations("marketplace");
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<{ kind: "error" | "success"; message: string } | null>(null);

  const [addReview, { loading }] = useMutation<AddReviewMutationResponse>(ADD_REVIEW, {
    // The list beside this form must reflect the new review immediately.
    refetchQueries: [{ query: GET_PRODUCT_REVIEWS, variables: { product_id: targetId, limit: 10, offset: 0 } }],
  });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (rating < 1) {
      setStatus({ kind: "error", message: t("ratingRequired") });
      return;
    }

    setStatus(null);
    try {
      await addReview({
        variables: {
          input: {
            target_id: targetId,
            order_id: orderId,
            vendor_id: vendorId,
            rating,
            text: text.trim() || undefined,
          },
        },
      });
      setRating(0);
      setText("");
      setStatus({ kind: "success", message: t("reviewPosted") });
      onPosted?.();
    } catch (error) {
      // Surface the server's reason — it explains WHY (order not delivered yet,
      // already reviewed, not your order), which a generic message would lose.
      const message = error instanceof Error ? error.message : t("reviewFailed");
      setStatus({ kind: "error", message });
    }
  };

  return (
    <form onSubmit={submit} className="rounded-md border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-900">{t("writeReview")}</h3>

      <div className="mt-3 flex items-center gap-2">
        <span className="text-sm text-gray-600">{t("editYourRating")}</span>
        <StarRating value={rating} size={22} onChange={setRating} label={t("editYourRating")} />
      </div>

      <label className="mt-3 block">
        <span className="sr-only">{t("reviewPlaceholder")}</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder={t("reviewPlaceholder")}
          className="w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        />
      </label>

      {status && (
        <p
          role={status.kind === "error" ? "alert" : "status"}
          className={`mt-2 text-sm ${status.kind === "error" ? "text-red-600" : "text-green-700"}`}
        >
          {status.message}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-3 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-60"
      >
        {loading ? t("submittingReview") : t("submitReview")}
      </button>
    </form>
  );
}
