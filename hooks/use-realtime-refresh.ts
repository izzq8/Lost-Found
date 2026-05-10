"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

let channelCounter = 0;

interface RealtimeRefreshOptions {
  /** Tables to subscribe to (e.g., ["reports", "claims"]) */
  tables: string[];
  /** Callback to run when a change is detected */
  onEvent: () => void;
  /** Debounce interval in ms (default: 1000) — prevents rapid-fire refreshes */
  debounceMs?: number;
  /** Optional filter for notifications table: only trigger for specific userId */
  notificationUserId?: string;
}

/**
 * Subscribe to Supabase Realtime PostgreSQL changes on specified tables.
 * When a change is detected, calls `onEvent` (debounced).
 *
 * Usage:
 *   useRealtimeRefresh({
 *     tables: ["reports", "claims", "notifications"],
 *     onEvent: () => router.refresh(),
 *     notificationUserId: currentUser.id,
 *   });
 */
export function useRealtimeRefresh({
  tables,
  onEvent,
  debounceMs = 1000,
  notificationUserId,
}: RealtimeRefreshOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    const supabase = createClient();
    const channelName = `rt-refresh-${++channelCounter}-${Date.now()}`;

    const debouncedCallback = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        onEventRef.current();
      }, debounceMs);
    };

    let channel = supabase.channel(channelName);

    for (const table of tables) {
      if (table === "notifications" && notificationUserId) {
        channel = channel.on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${notificationUserId}`,
          },
          debouncedCallback
        );
      } else {
        channel = channel.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table,
          },
          debouncedCallback
        );
      }
    }

    channel.subscribe();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables.join(","), debounceMs, notificationUserId]);
}
