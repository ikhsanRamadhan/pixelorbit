import { AccountId } from "@hashgraph/sdk";
import { create } from "zustand";
import { BrowserHCS2Client } from '@hashgraphonline/standards-sdk';

interface WalletState {
    accountId: string | undefined;
    accountIdObj: AccountId | null;
    balance: string;
    isConnected: boolean;
    client: BrowserHCS2Client | null;
    signer: any | null;
    setAll: (payload: Partial<WalletState>) => void;
};

export const useWalletStore = create<WalletState>((set) => ({
    accountId: undefined,
    accountIdObj: null,
    balance: '0',
    isConnected: false,
    client: null,
    signer: null,
    setAll: (payload) => set((state) => ({ ...state, ...payload })),
}));