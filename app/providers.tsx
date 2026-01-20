'use client';

import { URLSyncProvider } from "@/lib/use-url-sync";

export function Providers({ children }: { children: React.ReactNode }) {
  return <URLSyncProvider>{children}</URLSyncProvider>;
}
