import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";

import { useAuthContext } from "@/features/auth";
import {
  getMarkerAverageRating,
  getUserMarkerRating,
  listMarkerRatings,
  submitMarkerRating,
  type MarkerRatingRecord,
} from "@/services/appwrite";

interface UseMarkerRatingOptions {
  markerId?: string | null;
  averageRating?: number | null;
  onRatingSaved?: () => Promise<void> | void;
}

const useMarkerRating = ({
  markerId,
  averageRating,
  onRatingSaved,
}: UseMarkerRatingOptions) => {
  const { isLogged, user } = useAuthContext();
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState("");
  const [isLoadingExistingRating, setIsLoadingExistingRating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasExistingRating, setHasExistingRating] = useState(false);
  const [displayAverageRating, setDisplayAverageRating] = useState<number | null>(
    typeof averageRating === "number" ? averageRating : null,
  );
  const [reviews, setReviews] = useState<MarkerRatingRecord[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [reviewsErrorMessage, setReviewsErrorMessage] = useState<string | null>(null);

  const isAuthenticated = isLogged && Boolean(user?.$id);

  useEffect(() => {
    setDisplayAverageRating(typeof averageRating === "number" ? averageRating : null);
  }, [averageRating, markerId]);

  const loadReviews = useCallback(async () => {
    if (!markerId) {
      setReviews([]);
      setReviewsErrorMessage(null);
      setIsLoadingReviews(false);
      setDisplayAverageRating(null);
      return;
    }

    setIsLoadingReviews(true);
    setReviewsErrorMessage(null);

    try {
      const [nextReviews, nextAverageRating] = await Promise.all([
        listMarkerRatings(markerId, { limit: 3 }),
        getMarkerAverageRating(markerId),
      ]);
      setReviews(nextReviews);
      setDisplayAverageRating(nextAverageRating);
    } catch (error) {
      setReviews([]);
      setReviewsErrorMessage(
        error instanceof Error ? error.message : "Could not load marker reviews.",
      );
    } finally {
      setIsLoadingReviews(false);
    }
  }, [markerId]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  useEffect(() => {
    let isActive = true;

    setScore(0);
    setComment("");
    setErrorMessage(null);
    setHasExistingRating(false);

    if (!markerId || !isAuthenticated || !user?.$id) {
      setIsLoadingExistingRating(false);
      return () => {
        isActive = false;
      };
    }

    setIsLoadingExistingRating(true);

    void (async () => {
      try {
        const existingRating = await getUserMarkerRating(markerId, user.$id);

        if (!isActive) {
          return;
        }

        if (existingRating) {
          setScore(existingRating.score);
          setComment(existingRating.comment);
          setHasExistingRating(true);
        }
      } catch (error) {
        if (!isActive) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : "Could not load your existing rating.",
        );
      } finally {
        if (isActive) {
          setIsLoadingExistingRating(false);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, [isAuthenticated, markerId, user?.$id]);

  const handleScoreChange = useCallback((nextScore: number) => {
    setErrorMessage(null);
    setScore(nextScore);
  }, []);

  const handleCommentChange = useCallback((nextComment: string) => {
    setErrorMessage(null);
    setComment(nextComment);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!markerId) {
      return;
    }

    if (!isAuthenticated || !user?.$id) {
      Alert.alert("Sign in required", "You need an account to rate this sitting spot.");
      return;
    }

    if (score < 1 || score > 5) {
      setErrorMessage("Choose a rating from 1 to 5 stars.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await submitMarkerRating({
        markerId,
        userId: user.$id,
        authorName: user.username,
        score,
        comment,
      });

      setScore(result.rating.score);
      setComment(result.rating.comment);
      setHasExistingRating(true);
      setDisplayAverageRating(result.averageRating);
      await loadReviews();
      await onRatingSaved?.();
      Alert.alert(
        hasExistingRating ? "Rating updated" : "Rating saved",
        "Your rating has been recorded for this sitting spot.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not save your rating.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    comment,
    hasExistingRating,
    isAuthenticated,
    loadReviews,
    markerId,
    onRatingSaved,
    score,
    user?.$id,
    user?.username,
  ]);

  return {
    averageRating: displayAverageRating,
    score,
    comment,
    reviews,
    errorMessage,
    hasExistingRating,
    isAuthenticated,
    isLoadingExistingRating,
    isLoadingReviews,
    isSubmitting,
    reviewsErrorMessage,
    handleScoreChange,
    handleCommentChange,
    handleSubmit,
  };
};

export default useMarkerRating;
