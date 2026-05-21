import { useCallback, useEffect, useState } from "react";

import {
  getMarkerAverageRating,
  listMarkerRatingsPage,
  type MarkerRatingRecord,
} from "@/services/appwrite";

const PAGE_SIZE = 12;

interface UseMarkerReviewsListResult {
  averageRating: number | null;
  reviews: MarkerRatingRecord[];
  total: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  errorMessage: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

const useMarkerReviewsList = (markerId?: string | null): UseMarkerReviewsListResult => {
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [reviews, setReviews] = useState<MarkerRatingRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadPage = useCallback(
    async (nextOffset: number, options?: { append?: boolean }) => {
      if (!markerId) {
        setAverageRating(null);
        setReviews([]);
        setTotal(0);
        setOffset(0);
        setHasMore(false);
        setErrorMessage(null);
        setIsLoading(false);
        setIsLoadingMore(false);
        return;
      }

      const append = options?.append ?? false;

      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }

      setErrorMessage(null);

      try {
        const [page, nextAverageRating] = await Promise.all([
          listMarkerRatingsPage(markerId, {
            pageSize: PAGE_SIZE,
            offset: nextOffset,
          }),
          getMarkerAverageRating(markerId),
        ]);

        setAverageRating(nextAverageRating);
        setTotal(page.total);
        setOffset(nextOffset + page.ratings.length);
        setHasMore(page.hasMore);
        setReviews((current) => (append ? [...current, ...page.ratings] : page.ratings));
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Could not load marker reviews.",
        );
      } finally {
        if (append) {
          setIsLoadingMore(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    [markerId],
  );

  useEffect(() => {
    void loadPage(0);
  }, [loadPage]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || isLoading || !markerId) {
      return;
    }

    await loadPage(offset, { append: true });
  }, [hasMore, isLoading, isLoadingMore, loadPage, markerId, offset]);

  const refresh = useCallback(async () => {
    await loadPage(0);
  }, [loadPage]);

  return {
    averageRating,
    reviews,
    total,
    isLoading,
    isLoadingMore,
    errorMessage,
    hasMore,
    loadMore,
    refresh,
  };
};

export default useMarkerReviewsList;
