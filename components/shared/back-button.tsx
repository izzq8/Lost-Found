"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
  fallbackHref: string;
  fallbackLabel: string;
}

/**
 * Context-aware back navigation.
 * - Uses router.back() to go to the actual previous page
 * - Uses fallbackHref only when there's no browser history (direct URL access)
 */
export function BackButton({ fallbackHref, fallbackLabel }: BackButtonProps) {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();

    // Check if we have history to go back to
    // window.history.length > 1 means there is a previous page in this tab
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-1 text-orange-600 hover:underline w-fit transition-colors text-sm font-medium cursor-pointer"
    >
      <ArrowLeft size={16} />
      {fallbackLabel}
    </button>
  );
}
