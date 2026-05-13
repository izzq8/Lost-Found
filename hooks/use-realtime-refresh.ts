"use client";

import { useEffect, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

let channelCounter = 0;

type RealtimeEvent = "*" | "INSERT" | "UPDATE" | "DELETE";
type RealtimeSubscription =
  | string
  | {
      table: string;
      event?: RealtimeEvent;
      filter?: string;
    };

interface RealtimeRefreshOptions {
  tables: RealtimeSubscription[];
  onEvent: () => void;
  debounceMs?: number;
  notificationUserId?: string;
}

export function useRealtimeRefresh({
  tables,
  onEvent,
  debounceMs = 1000,
  notificationUserId,
}: RealtimeRefreshOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const subscriptionKey = useMemo(
    () =>
      tables
        .map((subscription) =>
          typeof subscription === "string"
            ? subscription
            : `${subscription.table}:${subscription.event ?? "*"}:${subscription.filter ?? ""}`
        )
        .join("|"),
    [tables]
  );

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

    for (const subscription of tables) {
      const table = typeof subscription === "string" ? subscription : subscription.table;
      const event = typeof subscription === "string" ? "*" : subscription.event ?? "*";
      const filter =
        typeof subscription === "string"
          ? table === "notifications" && notificationUserId
            ? `user_id=eq.${notificationUserId}`
            : undefined
          : subscription.filter;

      channel = channel.on(
        "postgres_changes",
        {
          event,
          schema: "public",
          table,
          ...(filter ? { filter } : {}),
        },
        debouncedCallback
      );
    }

    channel.subscribe();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscriptionKey, debounceMs, notificationUserId]);
}
