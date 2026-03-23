/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { HashinalsProvider } from '@/components/layout/HashinalsProvider';

// Set up queryClient
const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
    return (
        <HashinalsProvider>
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </HashinalsProvider>
    );
}