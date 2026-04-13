import React, { useMemo } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
}

type PaginationItem = number | "ellipsis";

export const buildPaginationItems = (
  currentPage: number,
  totalPages: number,
): PaginationItem[] => {
  if (totalPages <= 6) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const leadingPages = [1, 2];
  const trailingPages = [totalPages - 1, totalPages];

  if (currentPage <= 2 || currentPage >= totalPages - 1) {
    const edgeItems: PaginationItem[] = [...leadingPages, "ellipsis", ...trailingPages];

    return edgeItems.filter((item, index) => edgeItems.indexOf(item) === index);
  }

  return [1, "ellipsis", currentPage, "ellipsis", totalPages];
};

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  isLoading = false,
  onPageChange,
}) => {
  const items = useMemo(
    () => buildPaginationItems(currentPage, totalPages),
    [currentPage, totalPages],
  );

  if (totalPages <= 1) {
    return null;
  }

  return (
    <View className="mt-6 items-center px-1">
      <View
        className="w-full flex-row items-center justify-center rounded-[24px] border border-slate-700 bg-slate-800 px-2 py-2"
        style={{ gap: 6 }}
      >
        <Pressable
          onPress={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || isLoading}
          className={`h-9 w-9 items-center justify-center rounded-2xl ${
            currentPage === 1 || isLoading ? "bg-slate-800" : "bg-slate-700"
          }`}
        >
          <MaterialIcons name="chevron-left" size={18} color="#F8FAFC" />
        </Pressable>

        <View className="flex-row items-center justify-center" style={{ gap: 6 }}>
          {items.map((item, index) =>
            typeof item === "number" ? (
              <Pressable
                key={`page-${item}`}
                onPress={() => onPageChange(item)}
                disabled={isLoading || item === currentPage}
                className={`h-9 w-9 items-center justify-center rounded-2xl ${
                  item === currentPage ? "bg-teal-700" : "bg-slate-700"
                }`}
              >
                <Text className="font-pmedium text-sm text-white">{item}</Text>
              </Pressable>
            ) : (
              <View
                key={`${item}-${index}`}
                className="h-9 w-9 items-center justify-center"
              >
                <Text className="font-pmedium text-sm text-slate-400">...</Text>
              </View>
            ),
          )}
        </View>

        <Pressable
          onPress={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || isLoading}
          className={`h-9 w-9 items-center justify-center rounded-2xl ${
            currentPage === totalPages || isLoading ? "bg-slate-800" : "bg-slate-700"
          }`}
        >
          <MaterialIcons name="chevron-right" size={18} color="#F8FAFC" />
        </Pressable>
      </View>

      <View className="mt-3 min-h-[20px] items-center justify-center">
        {isLoading ? (
          <ActivityIndicator size="small" color="#CBD5E1" />
        ) : (
          <Text className="font-pregular text-xs text-slate-400">
            Page {currentPage} of {totalPages}
          </Text>
        )}
      </View>
    </View>
  );
};

export default Pagination;
