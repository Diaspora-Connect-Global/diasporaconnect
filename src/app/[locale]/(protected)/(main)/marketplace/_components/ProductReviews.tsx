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
    <li className="border-b border-gray-100 py-4 last:border-b-0">
      <div className="flex items-center gap-2">
        <StarRating value={review.rating} size={14} />
        <time dateTime={review.created_at} className="text-xs text-gray-500">
          {posted}
        </time>
      </div>

      {review.text && (
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-gray-700">
          {review.text}
        </p>
      )}

      {review.reply && (
        <div className="mt-3 rounded-md border-l-2 border-gray-300 bg-gray-50 px-3 py-2">
          <p className="text-xs font-medium text-gray-600">{vendorRepliedLabel}</p>
          <p className="mt-1 whitespace-pre-line text-sm text-gray-700">{review.reply}</p>
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
    <section className="mt-8" aria-labelledby="product-reviews-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="product-reviews-heading" className="text-lg font-semibold text-gray-900">
          {t("reviews")}
        </h2>

        {total > 0 && (
          <div className="flex items-center gap-2">
            <StarRating value={average} size={16} />
            <span className="text-sm font-medium text-gray-900">
              {t("averageRating", { rating: average.toFixed(1) })}
            </span>
            <span className="text-sm text-gray-500">
              {total === 1 ? t("reviewsCountOne") : t("reviewsCount", { count: total })}
            </span>
          </div>
        )}
      </div>

      {loading && reviews.length === 0 ? (
        <div className="mt-4 space-y-3" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-md bg-gray-100" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="mt-4 rounded-md border border-dashed border-gray-200 px-4 py-6 text-center">
          <p className="text-sm font-medium text-gray-700">{t("noReviewsYet")}</p>
          <p className="mt-1 text-sm text-gray-500">{t("beFirstToReview")}</p>
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
              className="mt-3 w-full rounded-md border border-gray-300 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
            >
              {t("loadMoreReviews")}
            </button>
          )}
        </>
      )}
    </section>
  );
}
