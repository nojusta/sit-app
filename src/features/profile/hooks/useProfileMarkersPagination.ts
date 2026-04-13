import { useCallback, useEffect, useRef, useState } from "react";

import {
  listMarkersByAuthorPage,
  type MarkerPageResult,
  type MarkerRecord,
} from "@/services/appwrite";

export const PROFILE_MARKERS_PAGE_SIZE = 10;

interface UseProfileMarkersPaginationResult {
  markers: MarkerRecord[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  isLoading: boolean;
  isRefreshing: boolean;
  goToPage: (page: number) => void;
  refetch: () => Promise<void>;
}

const EMPTY_MARKER_PAGE: MarkerPageResult = {
  markers: [],
  page: 1,
  pageSize: PROFILE_MARKERS_PAGE_SIZE,
  total: 0,
  totalPages: 1,
};

const useProfileMarkersPagination = (
  authorId?: string,
): UseProfileMarkersPaginationResult => {
  const [page, setPage] = useState(1);
  const [markersPage, setMarkersPage] = useState<MarkerPageResult>(EMPTY_MARKER_PAGE);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const requestIdRef = useRef(0);

  const loadPage = useCallback(
    async (nextPage: number, mode: "load" | "refresh" = "load") => {
      if (!authorId) {
        setMarkersPage(EMPTY_MARKER_PAGE);
        return;
      }

      const requestId = ++requestIdRef.current;

      if (mode === "refresh") {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
        setMarkersPage((current) =>
          current.markers.length > 0 ? { ...current, markers: [] } : current,
        );
      }

      try {
        const response = await listMarkersByAuthorPage(authorId, {
          page: nextPage,
          pageSize: PROFILE_MARKERS_PAGE_SIZE,
        });

        if (requestId !== requestIdRef.current) {
          return;
        }

        setMarkersPage(response);

        if (response.totalPages !== nextPage && nextPage > response.totalPages) {
          setPage(response.totalPages);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [authorId],
  );

  useEffect(() => {
    setPage(1);
    setMarkersPage(EMPTY_MARKER_PAGE);
    setIsLoading(Boolean(authorId));
  }, [authorId]);

  useEffect(() => {
    void loadPage(page);
  }, [loadPage, page]);

  const goToPage = useCallback(
    (nextPage: number) => {
      const clampedPage = Math.max(1, Math.min(nextPage, markersPage.totalPages || 1));

      if (clampedPage === page) {
        return;
      }

      setIsLoading(true);
      setMarkersPage((current) =>
        current.markers.length > 0 ? { ...current, markers: [] } : current,
      );
      setPage(clampedPage);
    },
    [markersPage.totalPages, page],
  );

  const refetch = useCallback(async () => {
    await loadPage(page, "refresh");
  }, [loadPage, page]);

  return {
    markers: markersPage.markers,
    currentPage: page,
    totalPages: markersPage.totalPages,
    totalCount: markersPage.total,
    isLoading,
    isRefreshing,
    goToPage,
    refetch,
  };
};

export default useProfileMarkersPagination;
