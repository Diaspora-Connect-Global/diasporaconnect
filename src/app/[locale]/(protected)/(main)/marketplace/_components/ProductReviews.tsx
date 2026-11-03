"use client";

import React, { useState } from "react";
import { useQuery } from "@apollo/client/react";
import { useLocale, useTranslations } from "next-intl";
import { GET_PRODUCT_REVIEWS } from "@/services/gql/marketplace";
import type {
  MarketplaceReviewType,
  ProductReviewsResponse,
} from "@/services/gql/types/marketplace";
import { StarRating } from "./StarRating";

const PAGE_SIZE = 10;

function ReviewRow({
  review,
  locale,
  vendorRepliedLabel,
}: {
  review: MarketplaceReviewType;
  locale: string;
  vendorRepliedLabel: string;
}) {
  const posted = new Date(review.created_at).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <li className="border-b border-border-subtle py-4 last:border-b-0">
      <div className="flex items-center gap-2">
        <StarRating value={review.rating} size={14} />
        <time dateTime={review.created_at} className="text-xs text-muted-foreground">
          {posted}
        </time>
      </div>

      {review.text && (
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-text-primary">
          {review.text}
        </p>
      )}

      {review.reply && (
        <div className="mt-3 rounded-lg bg-surface-subtle px-3 py-2">
          <p className="text-xs font-medium text-text-secondary">{vendorRepliedLabel}</p>
          <p className="mt-1 whitespace-pre-line text-sm text-text-primary">{review.reply}</p>
        </div>
      )}
    </li>
  );
}

/**
 * Reviews for one product. Public — a shopper reads these before signing in, so
 * this renders without auth and only the write form (elsewhere) requires it.
 */
export function ProductReviews({ productId }: { productId: string }) {
  const t = useTranslations("marketplace");
  const locale = useLocale();
  const [offset, setOffset] = useState(0);

  const { data, loading, error, fetchMore } = useQuery<ProductReviewsResponse>(
    GET_PRODUCT_REVIEWS,
    {
      variables: { product_id: productId, limit: PAGE_SIZE, offset: 0 },
      // Reviews change rarely; serve the cache and refresh quietly behind it.
      fetchPolicy: "cache-and-network",
    },
  );

  const result = data?.productReviews;
  const reviews = result?.reviews ?? [];
  const total = result?.total ?? 0;
  const average = result?.average_rating ?? 0;

  const loadMore = async () => {
    const nextOffset = offset + PAGE_SIZE;
    await fetchMore({
      variables: { product_id: productId, limit: PAGE_SIZE, offset: nextOffset },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult?.productReviews) return prev;
        return {
          productReviews: {
            ...fetchMoreResult.productReviews,
            reviews: [
              ...(prev?.productReviews?.reviews ?? []),
              ...fetchMoreResult.productReviews.reviews,
            ],
          },
        };
      },
    });
    setOffset(nextOffset);
  };

  // A reviews panel that shows an error box is worse than one that shows
  // nothing — the product page still has to be usable.
  if (error && reviews.length === 0) return null;

  return (
    <section className="rounded-2xl border border-border-subtle bg-surface-default p-4 shadow-sm sm:p-5" aria-labelledby="product-reviews-heading" data-testid="mp-reviews">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="product-reviews-heading" className="text-lg font-bold text-text-primary">
          {t("reviews")}
        </h2>

        {total > 0 && (
          <div className="flex items-center gap-2">
            <StarRating value={average} size={16} />
            <span className="text-sm font-medium text-text-primary">
              {t("averageRating", { rating: average.toFixed(1) })}
            </span>
            <span className="text-sm text-muted-foreground">
              {total === 1 ? t("reviewsCountOne") : t("reviewsCount", { count: total })}
            </span>
          </div>
        )}
      </div>

      {loading && reviews.length === 0 ? (
        <div className="mt-4 space-y-3" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-surface-subtle" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-border-subtle px-4 py-6 text-center">
          <p className="text-sm font-medium text-text-primary">{t("noReviewsYet")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("beFirstToReview")}</p>
        </div>
      ) : (
        <>
          <ul className="mt-2">
            {reviews.map((review) => (
              <ReviewRow
                key={review.id}
                review={review}
                locale={locale}
                vendorRepliedLabel={t("vendorReplied")}
              />
            ))}
          </ul>

          {result?.has_more && (
            <button
              type="button"
              onClick={loadMore}
              disabled={loading}
              className="mt-3 min-h-11 w-full rounded-full border border-border-subtle py-2 text-sm font-medium text-text-primary transition hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand disabled:opacity-60"
            >
              {t("loadMoreReviews")}
            </button>
          )}
        </>
      )}
    </section>
  );
}
