'use client';
import { AccountId, LedgerId, TopicCreateTransaction, Client, TopicMessageSubmitTransaction, Hbar, TokenCreateTransaction, TokenType, TokenSupplyType, PrivateKey, TokenId, TokenMintTransaction, TransferTransaction, TokenAssociateTransaction, AccountInfoQuery, CustomRoyaltyFee, AccountAllowanceApproveTransaction, NftId } from '@hashgraph/sdk';
import { HashinalsWalletConnectSDK } from '@hashgraphonline/hashinal-wc';
import { BrowserHCS2Client} from '@hashgraphonline/standards-sdk';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

import { useWalletStore } from '@/components/store/wallet-store';
import { setAccountIdCookie, deleteAccountIdCookie } from '@/app/actions';
import spaceships, { MySpaceships, Ship, ShipData } from '@/components/utils/Spaceships';
import { CollectedItem, Items, ListItem, rarityOrder } from '@/components/utils/Items';

export interface HighscoreMessage {
    player: string;
    score: number;
    ship: string;
    action: "SUBMIT_SCORE";
    consensusTimestamp: string;
    date?: string;
};

export type BestScoresMap = Record<string, HighscoreMessage>;

interface HashinalsContextType {
    sdk: HashinalsWalletConnectSDK | null;
    ownedItems: Items[];
    userHighscores: HighscoreMessage[];
    leaderboard: any[];
    totalUser: number;
    mySpaceships: MySpaceships[];
    userListings: ListItem[];
    allListing: ListItem[];
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
    getAccountBalance: () => Promise<void>;
    CreateTopic: () => Promise<void>;
    submitHighscore: (score: number, shipName: string) => Promise<boolean | undefined>;
    getAllScore: () => Promise<HighscoreMessage[] | undefined>;
    fetchUserSpaceships: () => Promise<void>;
    mintItems: (itemData: CollectedItem, toastId: string) => Promise<boolean | undefined>;
    listItem: (itemData: Items, price: number, allowBids: boolean, auctionDuration: number, toastId: string) => Promise<boolean>;
    cancelListing: (listingSerialNumber: number, endTime: number, allowBids: boolean, toastId: string) => Promise<boolean>;
    updatePrice: (listingId: number, newPrice: number, allowBids: boolean, toastId: string) => Promise<boolean | undefined>;
    buyItemListing: (item: ListItem, toastId: string) => Promise<boolean>;
    createInfiniteCollection: () => Promise<TokenId | null | undefined>;
    mintSpaceship: (shipData: ShipData, toastId: string) => Promise<boolean>;
    placeBid: (item: ListItem, bidAmount: number, toastId: string) => Promise<boolean>;
    acceptBid: (item: ListItem, toastId: string) => Promise<boolean>;
    cancelBid: (item: ListItem, toastId: string) => Promise<boolean>;
};

const processTopScores = (data: HighscoreMessage[]): HighscoreMessage[] => {
    const bestScores: Record<string, HighscoreMessage> = {};

    data.forEach((entry) => {
        const uniqueKey = `${entry.player}_${entry.ship}`;
        const currentBest = bestScores[uniqueKey];

        if (!currentBest || 
            entry.score > currentBest.score || 
            (entry.score === currentBest.score && parseFloat(entry.consensusTimestamp) < parseFloat(currentBest.consensusTimestamp))
        ) {
            bestScores[uniqueKey] = entry;
        }
    });

    return Object.values(bestScores).sort((a, b) => {
        if (b.score !== a.score) {
            return b.score - a.score;
        }
        return parseFloat(a.consensusTimestamp) - parseFloat(b.consensusTimestamp);
    });
};

let isGlobalInitializing = false;

const HashinalsContext = createContext<HashinalsContextType>({} as HashinalsContextType);

export const projectId = process.env.NEXT_PUBLIC_PROJECT_ID!;
const env = process.env.NEXT_PUBLIC_HEDERA_NETWORK || "testnet";
const topicId = process.env.NEXT_PUBLIC_HCS_TOPIC_ID!;
const pixelorbitSpaceshipsId = process.env.NEXT_PUBLIC_PIXELORBIT_SPACESHIPS_TOKEN_ID!;
const pixelorbitItemsId = process.env.NEXT_PUBLIC_PIXELORBIT_ITEMS_TOKEN_ID!;
const pixelorbitItemsMarketplaceTopicId = process.env.NEXT_PUBLIC_HCS_MARKETPLACE_TOPIC_ID!;
const privateKey = process.env.NEXT_PUBLIC_PRIVATE_KEY!;
const adminId= process.env.NEXT_PUBLIC_ADMIN_ID!;
const network = LedgerId.fromString(env);

export const appMetadata = {
    name: "PIXELORBIT",
    description: "Web3 Space Shooter • Powered by Hedera",
    url: typeof window !== 'undefined' ? window.location.origin : "https://yourdomain.com",
    icons: ["https://wallet.hashinals.com/favicon.ico"],
};

export function HashinalsProvider({ children }: { children: React.ReactNode }) {
    const { setAll, accountId, accountIdObj, isConnected, signer } = useWalletStore();
    const [sdk, setSdk] = useState<HashinalsWalletConnectSDK | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [ownedItems, setOwnedItems] = useState<Items[]>([]);
    const [userHighscores, setUserHighscores] = useState<HighscoreMessage[]>([]);
    const [leaderboard, setLeaderboard] = useState<HighscoreMessage[]>([]);
    const [totalUser, setTotalUser] = useState(0);
    const [mySpaceships, setMyspaceships] = useState<MySpaceships[]>([]);
    const [userListings, setUserListings] = useState<ListItem[]>([]);
    const [allListing, setAllListing] = useState<ListItem[]>([]);
    const AdminKey = PrivateKey.fromString(privateKey);
    const client = Client.forTestnet();
    client.setOperator(adminId, privateKey);

    // Use callback to prevent infinite loop
    const initSDK = useCallback(async () => {
        if (isInitialized || isGlobalInitializing) return;
        if (typeof window === 'undefined') return;

        isGlobalInitializing = true;

        try {
            const instance = HashinalsWalletConnectSDK.getInstance();
            await instance.init(projectId, appMetadata, LedgerId.TESTNET);
            setSdk(instance);

            if (!projectId) {
                throw new Error("NEXT_PUBLIC_PROJECT_ID is missing in .env");
            }

            const metadata = {
                ...appMetadata,
                url: window.location.origin
            };

            await new Promise(resolve => setTimeout(resolve, 200));

            const existingAccount = await instance.initAccount(projectId, metadata);

            if (existingAccount) {
                const clientInstance = new BrowserHCS2Client({
                    network: env as 'testnet' | 'mainnet',
                    hwc: instance,
                    logLevel: 'info',
                });

                setAll({
                    accountId: existingAccount.accountId,
                    accountIdObj: AccountId.fromString(existingAccount.accountId),
                    balance: existingAccount.balance,
                    isConnected: true,
                    client: clientInstance,
                    signer: instance.dAppConnector.getSigner(AccountId.fromString(existingAccount.accountId) as unknown as any)
                });

                await setAccountIdCookie(existingAccount.accountId);
            } else {
                await deleteAccountIdCookie();
                setAll({
                    accountId: undefined,
                    accountIdObj: null,
                    balance: '0',
                    isConnected: false,
                    client: null,
                    signer: null
                })
                setOwnedItems([]);
                setUserHighscores([]);
                setMyspaceships([]);
            }

            setIsInitialized(true);
        } catch (error) {
            console.error('❌ Critical Init Error:', error);
            isGlobalInitializing = false;
        } finally {
            isGlobalInitializing = false;
        }
    }, [isInitialized, setAll]);

    useEffect(() => {
        initSDK();
    }, []);

    const convertToAccountId = async (evmAddress: string) => {
        if (!evmAddress || evmAddress === "0x0000000000000000000000000000000000000000") return "N/A";
        try {
            const res = await fetch(`https://testnet.mirrornode.hedera.com/api/v1/accounts/${evmAddress}`);
            const data = await res.json();
            return data.account || evmAddress;
        } catch {
            return evmAddress;
        }
    };

    const CreateTopic = async () => {
        if (!accountId) return;

        const transaction = new TopicCreateTransaction()
            .setTopicMemo("PixelOrbit Items Marketplace")
            .freezeWith(client);

        const txResponse = await transaction.execute(client);

        const receipt = await txResponse.getReceipt(client);
        const newTopicId = receipt.topicId;

        console.log(`✅ Successfully created topic: ${newTopicId}`);
    };

    const connect = async () => {
        const currentSdk = sdk || await initSDK();
        if (!currentSdk) {
            toast.error("Wallet SDK not ready");
            return;
        }

        try {
            const { accountId: newId, balance } = await currentSdk.connectWallet(projectId, appMetadata, network);

            const client = new BrowserHCS2Client({
                network: env as 'testnet' | 'mainnet',
                hwc: currentSdk,
            });

            await setAccountIdCookie(newId);

            setAll({
                accountId: newId,
                accountIdObj: AccountId.fromString(newId),
                balance: balance,
                isConnected: true,
                client: client,
                signer: currentSdk.dAppConnector.getSigner(AccountId.fromString(newId) as unknown as any)
            });
            
            toast.success(`Welcome Commander ${newId}`);
        } catch (error) {
            console.error('Connect error:', error);
            toast.error('Connection cancelled or failed');
        }
    };

    const disconnect = async () => {
        if (!sdk) return;
        const tempId = accountId;

        try {
            await sdk.disconnectWallet();
            await deleteAccountIdCookie();

            setAll({
                accountId: undefined,
                accountIdObj: null,
                balance: '0',
                isConnected: false,
                client: null,
                signer: null
            });

            setOwnedItems([]);
            setUserHighscores([]);
            setMyspaceships([]);

            toast.success(`Goodbye ${tempId}`);
        } catch (error) {
            toast.error('Disconnect failed');
        } finally {
            await sdk.disconnectWallet();
            await deleteAccountIdCookie();

            setAll({
                accountId: undefined,
                accountIdObj: null,
                balance: '0',
                isConnected: false,
                client: null,
                signer: null
            });

            setOwnedItems([]);
            setUserHighscores([]);
            setMyspaceships([]);
        }
    };

    const getAccountBalance = async () => {
        if (!sdk) return;
        try {
            const balance = await sdk.getAccountBalance();
            setAll({ balance });
        } catch (error) {
            console.error('Balance error:', error);
        }
    };

    const submitHighscore = async (score: number, shipName: string) => {
        await initSDK();
    
        if (!isConnected || !accountId || !accountIdObj || !signer) {
            toast.error("Connect wallet first!");
            return false;
        }

        if (!topicId) {
            console.error("HCS Topic ID not found in environment variables.");
            return false;
        }
    
        const toastId = toast.loading("Submitting score to Hedera HCS...");
    
        try {
            const message = {
                player: accountId,
                score: score,
                ship: shipName,
                action: "SUBMIT_SCORE"
            };

            await new TopicMessageSubmitTransaction()
                .setTopicId(topicId)
                .setMessage(JSON.stringify(message))
                .executeWithSigner(signer as unknown as any);

            toast.success("Highscore recorded on Ledger!", { id: toastId });
            return true;
        } catch (error) {
            console.error("HCS Submission Error:", error);
            toast.error("Failed to record score on Ledger", { id: toastId });
            return false;
        } finally {
            await getAccountBalance();
            await getAllScore();
        }
    };

    const getAllScore = useCallback(async () => {
        const topicId = process.env.NEXT_PUBLIC_HCS_TOPIC_ID!;
        const { accountId } = useWalletStore.getState();
    
        if (!sdk) return [];
    
        try {
            const response = await sdk.getMessages(topicId);
            
            const rawScores = response.messages.filter((m: any) => m.action === "SUBMIT_SCORE");
    
            const uniquePlayers = new Set(rawScores.map((m: any) => m.player));
            setTotalUser(uniquePlayers.size);
    
            const scores: HighscoreMessage[] = rawScores.map((m: any) => ({
                player: m.player,
                score: Number(m.score),
                ship: m.ship || "Default_Ship",
                action: m.action,
                consensusTimestamp: m.consensus_timestamp || m.consensusTimestamp,
            }));
    
            const processedLeaderboard = processTopScores(scores);
            setLeaderboard(processedLeaderboard);
    
            if (accountId) {
                const userBestPerShip = processedLeaderboard.filter(
                    (entry) => entry.player === accountId
                );
                setUserHighscores(userBestPerShip);
            }
    
            return processedLeaderboard;
        } catch (error) {
            console.error("HCS Fetch Error:", error);
            return [];
        }
    }, [sdk, setUserHighscores, setLeaderboard, setTotalUser]);

    const createInfiniteCollection = async () => {
        if (!accountId || !signer) return;

        try {
            const transaction = new TokenCreateTransaction()
                .setTokenName("PIXELORBIT Items")
                .setTokenSymbol("POI")
                .setTokenType(TokenType.NonFungibleUnique)
                .setDecimals(0)
                .setSupplyType(TokenSupplyType.Infinite) 
                .setInitialSupply(0)
                .setSupplyKey(AdminKey)
                .setTreasuryAccountId(accountId as string)
                .setCustomFees([
                    new CustomRoyaltyFee()
                        .setNumerator(5)
                        .setDenominator(100)
                        .setFeeCollectorAccountId(adminId)
                ])
                .freezeWith(client);
        
            const signTx =  await (await transaction.sign(AdminKey));
            const txResponse = await signTx.execute(client);
            const receipt = await txResponse.getReceipt(client);

            const tokenId = receipt.tokenId;

            console.log("The new token ID is " + tokenId);
            return tokenId;
        } catch (error) {
            console.error("Error creating infinite collection:", error);
            return null;
        }
    };
    
    const mintSpaceship = async (shipData: ShipData, toastId: string) => {
        if (!isConnected || !accountId || !signer) {
            toast.error("Connect wallet first!", { id: toastId });
            return false;
        }
    
        try {
            const userAccountId = AccountId.fromString(accountId.toString());
            const adminAccountId = AccountId.fromString(adminId);
            const tokenId = pixelorbitSpaceshipsId;

            toast.loading("Checking wallet association...", { id: toastId });

            const accountInfo = await new AccountInfoQuery()
                .setAccountId(userAccountId)
                .execute(client);

            const isAssociated = accountInfo.tokenRelationships.get(tokenId.toString());
    
            if (!isAssociated) {
                toast.loading("Please approve token association in your wallet...", { id: toastId });
                const associateTx = await new TokenAssociateTransaction()
                    .setAccountId(userAccountId)
                    .setTokenIds([tokenId]);

                const assocRes = await (await associateTx.executeWithSigner(signer)).getReceiptWithSigner(signer);
                if (assocRes.status.toString() !== "SUCCESS") {
                    throw new Error("Association failed");
                }
            }

            toast.loading("Minting your new spaceship...", { id: toastId });
            const cid = shipData.metadata?.split('/').pop();
            if (!cid) throw new Error("Invalid Metadata CID");
            const metadataByte = new TextEncoder().encode(cid);
    
            const mintTx = await new TokenMintTransaction()
                .setTokenId(tokenId)
                .setMetadata([metadataByte])
                .freezeWith(client);
    
            const signMint = await mintTx.sign(AdminKey);
            const mintResponse = await signMint.execute(client);
            const mintReceipt = await mintResponse.getReceipt(client);
            const serialNumber = mintReceipt.serials[0].toNumber();
    
            if (serialNumber) {
                toast.loading(`Paying ${shipData.price} HBAR and collecting NFT...`, { id: toastId });
                
                const priceInHbar = new Hbar(shipData.price);
                const transaction = await new TransferTransaction()
                    .addNftTransfer(tokenId, serialNumber, adminAccountId, userAccountId)
                    .addHbarTransfer(userAccountId, priceInHbar.negated()) 
                    .addHbarTransfer(adminAccountId, priceInHbar)
                    .freezeWith(client); 
    
                const signAdmin = await transaction.sign(AdminKey);
                
                const txResponse = await signAdmin.executeWithSigner(signer);
                const receipt = await txResponse.getReceiptWithSigner(signer);
    
                if (receipt.status.toString() === "SUCCESS") {
                    toast.success(`Purchase successful! Serial #${serialNumber}`, { id: toastId });
                    return true;
                }
            }
            return false;
    
        } catch (error: any) {
            console.error("Failed to purchase Spaceship:", error);
            const msg = error.message || "";
            if (msg.includes("USER_REJECTED") || msg.includes("rejected")) {
                toast.error("Transaction cancelled by user", { id: toastId });
            } else {
                toast.error(`Purchase failed: ${msg}`, { id: toastId });
            }
            return false;
        }
    };

    const fetchUserSpaceships = async () => {
        if (!accountId) return;

        const freeShip = spaceships[0];
    
        try {
            const response = await fetch(
                `https://testnet.mirrornode.hedera.com/api/v1/accounts/${accountId}/nfts?token.id=${pixelorbitSpaceshipsId}`
            );
            const data = await response.json();
    
            if (!data.nfts || data.nfts.length === 0) {
                setMyspaceships([freeShip]);
                return;
            }
    
            const loadedShips: MySpaceships[] = await Promise.all(
                data.nfts.map(async (nft: any) => {
                    const cid = atob(nft.metadata);
                    const metadataUrl = `https://amethyst-implicit-silkworm-944.mypinata.cloud/ipfs/${cid}`;

                    const res = await fetch(metadataUrl);
                    const json = await res.json();
            
                    const getAttr = (type: string) => 
                        json.attributes.find((a: any) => a.trait_type === type)?.value;
            
                    return {
                        name: json.name,
                        icon: json.icon,
                        images: json.image,
                        hp: Number(getAttr("hp")), 
                        energyRegen: Number(getAttr("energyRegen")),
                        maxEnergy: Number(getAttr("maxEnergy")),
                        laserWidth: Number(getAttr("laserWidth")),
                        laserDamage: Number(getAttr("laserDamage")),
                        laserColor: String(getAttr("laserColor")),
                        bullet: Number(getAttr("bullet")),
                        width: Number(getAttr("width")),
                        height: Number(getAttr("height")),
                        maxFrame: Number(getAttr("maxFrame"))
                    };
                })
            );

            setMyspaceships([freeShip, ...loadedShips]);
    
        } catch (error) {
            console.error("Failed to fetch user spaceships:", error);
        }
    };

    const mintItems = async (itemData: CollectedItem, toastId: string) => {
        if (!isConnected || !accountId || !signer) {
            toast.error("Connect wallet first!", { id: toastId });
            return false;
        }
    
        try {
            const userAccountId = AccountId.fromString(accountId.toString());
            const adminAccountId = AccountId.fromString(adminId);
            const tokenId = pixelorbitItemsId; 

            toast.loading("Checking wallet association...", { id: toastId });
            const accountInfo = await new AccountInfoQuery()
                .setAccountId(userAccountId)
                .execute(client);
    
            const isAssociated = accountInfo.tokenRelationships.get(tokenId.toString());
    
            if (!isAssociated) {
                toast.loading("Please approve item association in your wallet...", { id: toastId });
                const associateTx = await new TokenAssociateTransaction()
                    .setAccountId(userAccountId)
                    .setTokenIds([tokenId])
    
                const assocRes = await (await associateTx.executeWithSigner(signer)).getReceiptWithSigner(signer);
                if (assocRes.status.toString() !== "SUCCESS") {
                    throw new Error("Association failed");
                }
            }
    
            toast.loading("Minting your new item...", { id: toastId });
            const cid = itemData.metadata?.split('/').pop();

            if (!cid) throw new Error("Invalid Metadata CID");
            const metadataByte = new TextEncoder().encode(cid);
    
            const mintTx = await new TokenMintTransaction()
                .setTokenId(tokenId)
                .setMetadata([metadataByte])
                .freezeWith(client);
    
            const signMint = await mintTx.sign(AdminKey);
            const mintResponse = await signMint.execute(client);
            const mintReceipt = await mintResponse.getReceipt(client);
            const serialNumber = mintReceipt.serials[0].toNumber();
    
            if (serialNumber) {
                toast.loading(`Sending item to your wallet...`, { id: toastId });
                
                const transaction = await new TransferTransaction()
                    .addNftTransfer(tokenId, serialNumber, adminAccountId, userAccountId)
                    .freezeWith(client);
    
                const signAdmin = await transaction.sign(AdminKey);
                const txResponse = await signAdmin.execute(client);
                const receipt = await txResponse.getReceipt(client);
    
                if (receipt.status.toString() === "SUCCESS") {
                    toast.success(`Item minted successfully! Serial #${serialNumber}`, { id: toastId });
                    return true;
                }
            }
            return false;
    
        } catch (error: any) {
            console.error("Failed to mint Item:", error);
            const msg = error.message || "";
            if (msg.includes("USER_REJECTED") || msg.includes("rejected")) {
                toast.error("Transaction cancelled", { id: toastId });
            } else {
                toast.error(`Minting failed: ${msg}`, { id: toastId });
            }
            return false;
        }
    };

    const fetchUserItems = async () => {
        if (!accountId) return;
    
        try {
            const response = await fetch(
                `https://testnet.mirrornode.hedera.com/api/v1/accounts/${accountId}/nfts?token.id=${pixelorbitItemsId}`
            );
            const data = await response.json();
    
            if (!data.nfts || data.nfts.length === 0) {
                setOwnedItems([]);
                return;
            }
    
            const loadedItems = await Promise.all(
                data.nfts.map(async (nft: any) => {
                    const cid = atob(nft.metadata);
                    const metadataUrl = `https://amethyst-implicit-silkworm-944.mypinata.cloud/ipfs/${cid}`;
    
                    try {
                        const res = await fetch(metadataUrl);
                        const json = await res.json();
    
                        const getAttr = (type: string) => 
                            json.attributes?.find((a: any) => a.trait_type === type)?.value;
    
                        return {
                            serialNumber: nft.serial_number,
                            name: json.name,
                            image: json.image,
                            rarity: json.rarity || getAttr("Rarity"),
                            dropRate: Number(getAttr("Drop Rate")) || 0,
                            metadata: cid,
                        };
                    } catch (err) {
                        console.error(`Failed to fetch metadata for serial ${nft.serial_number}`, err);
                        return null;
                    }
                })
            );
    
            const validItems = loadedItems.filter(item => item !== null);
            
            setOwnedItems(validItems);
    
        } catch (error) {
            console.error("Failed to fetch user items:", error);
        }
    };

    const listItem = async (itemData: Items, price: number, allowBids: boolean, auctionDuration: number, toastId: string) => {
        if (!isConnected || !accountId || !signer) {
            toast.error("Connect wallet first!", { id: toastId });
            return false;
        }

        try {
            toast.loading("Listing in progress...", { id: toastId });

            toast.loading("Step 1: Approving NFT Allowance...", { id: toastId });
            
            const nftId = new NftId(TokenId.fromString(pixelorbitItemsId), itemData.serialNumber);

            const approveTx = new AccountAllowanceApproveTransaction()
                .approveTokenNftAllowance(
                    nftId, 
                    accountId,
                    adminId
                );

            const txResponse = await approveTx.executeWithSigner(signer as any);
            const approveReceipt = await txResponse.getReceiptWithSigner(signer as any);
            
            if (approveReceipt.status.toString() !== "SUCCESS") {
                toast.error("Failed to approve allowance", { id: toastId });
                return false;
            }

            const message = {
                type: "LISTING",
                tokenId: pixelorbitItemsId.toString(),
                serialNumber: itemData.serialNumber,
                name: itemData.name,
                image: itemData.image,
                rarity: itemData.rarity,
                seller: accountId.toString(),
                price: price,
                isActive: true,
                allowBids: allowBids,
                auctionDuration: auctionDuration,
                highestBid: 0,
                highestBidder: '',
                metadata: itemData.metadata
            };
    
            await new TopicMessageSubmitTransaction()
                .setTopicId(pixelorbitItemsMarketplaceTopicId)
                .setMessage(JSON.stringify(message))
                .executeWithSigner(signer as unknown as any);
    
            toast.success("Listing broadcasted to network!", { id: toastId });

            return true;
        } catch (error) {
            toast.error("Failed to broadcast listing", { id: toastId });
            console.error(error);
            return false;
        }
    };

    const fetchUserListings = async () => {
        if (!accountId) return;
    
        const currentAccountIdStr = accountId.toString();
    
        try {
            const response = await fetch(
                `https://testnet.mirrornode.hedera.com/api/v1/topics/${pixelorbitItemsMarketplaceTopicId}/messages?order=desc`
            );
            const data = await response.json();
    
            if (!data.messages) {
                setUserListings([]);
                return;
            }
    
            const activeMap = new Map<number, ListItem>();
            const messages = [...data.messages].reverse();
    
            messages.forEach((msg: any) => {
                try {
                    const payload = JSON.parse(atob(msg.message));
                    const serial = Number(payload.serialNumber || payload.serial);

                    const currentMsgTimestamp = Number(msg.consensus_timestamp);

                    if (payload.type === "LISTING") {
                        const isAuction = payload.allowBids === true || payload.allowBids === "true";
                        
                        const newItem: ListItem = {
                            name: payload.name || "Unknown Item",
                            image: payload.image || "",
                            rarity: payload.rarity || "Common",
                            metadata: payload.metadata || "",
                            serialNumber: serial,
                            seller: payload.seller.toString(),
                            price: Number(payload.price),
                            isActive: Boolean(payload.isActive),
                            allowBids: isAuction,
                            highestBid: Number(payload.highestBid) || 0,
                            highestBidder: payload.highestBidder || "",
                            endTime: isAuction 
                                ? Math.floor(currentMsgTimestamp + Number(payload.auctionDuration || 0)) 
                                : 0,
                        };
                        activeMap.set(serial, newItem);
                    } else if (payload.type === "CANCEL") {
                        const existing = activeMap.get(serial);
                        
                        if (existing) {
                            const isSeller = existing.seller === payload.seller.toString();
                            
                            if (isSeller) {
                                activeMap.delete(serial);
                            }
                        }
                    } else if (payload.type === "UPDATE_PRICE") {
                        const existing = activeMap.get(serial);
                        
                        if (existing) {
                            const isSeller = existing.seller.toLowerCase() === payload.seller.toLowerCase();
                            
                            if (isSeller) {
                                existing.price = Number(payload.newPrice);
                                activeMap.set(serial, existing);
                            }
                        }
                    } else if (payload.type === "BID") {
                        const existing = activeMap.get(serial);
                        if (existing && existing.allowBids) {
                            existing.highestBid = Number(payload.amount);
                            existing.highestBidder = payload.bidder;
                            activeMap.set(serial, existing);
                        }
                    } else if (payload.type === "CANCEL_BID") {
                        const existing = activeMap.get(serial);
                        if (existing) {
                            if (existing.highestBidder === payload.bidder) {
                                existing.highestBid = 0;
                                existing.highestBidder = "";
                                activeMap.set(serial, existing);
                            }
                        }
                    } else if (payload.type === "SOLD" || payload.type === "CANCEL" || payload.type === "BID_ACCEPTED") {
                        activeMap.delete(serial);
                    }
                } catch (e) {
                    console.error("Error parsing message: ", e);
                }
            });
    
            const finalUserListings = Array.from(activeMap.values()).filter(
                (item) => item.seller.toLowerCase() === currentAccountIdStr.toLowerCase()
            );
    
            setUserListings(finalUserListings);
    
        } catch (error) {
            console.error("Failed to sync listings:", error);
        }
    };

    const fetchAllListings = async () => {
        try {
            const response = await fetch(
                `https://testnet.mirrornode.hedera.com/api/v1/topics/${pixelorbitItemsMarketplaceTopicId}/messages?order=desc`
            );
            const data = await response.json();
    
            if (!data.messages) {
                setAllListing([]);
                return;
            }
    
            const activeMap = new Map<number, ListItem>();
            
            const messages = [...data.messages].reverse();
    
            messages.forEach((msg: any) => {
                try {
                    const payload = JSON.parse(atob(msg.message));
                    const serial = Number(payload.serialNumber || payload.serial);
                    const currentMsgTimestamp = Number(msg.consensus_timestamp);
    
                    if (payload.type === "LISTING") {
                        const isAuction = payload.allowBids === true || payload.allowBids === "true";
                        
                        const newItem: ListItem = {
                            name: payload.name || "Unknown Item",
                            image: payload.image || "",
                            rarity: payload.rarity || "Common",
                            metadata: payload.metadata || "",
                            serialNumber: serial,
                            seller: payload.seller.toString(),
                            price: Number(payload.price),
                            isActive: Boolean(payload.isActive),
                            allowBids: isAuction,
                            highestBid: Number(payload.highestBid) || 0,
                            highestBidder: payload.highestBidder || "",
                            endTime: isAuction 
                                ? Math.floor(currentMsgTimestamp + Number(payload.auctionDuration || 0)) 
                                : 0,
                        };
                        activeMap.set(serial, newItem);
    
                    } else if (payload.type === "CANCEL") {
                        const existing = activeMap.get(serial);
                        if (existing && existing.seller === payload.seller.toString()) {
                            activeMap.delete(serial);
                        }
    
                    } else if (payload.type === "UPDATE_PRICE") {
                        const existing = activeMap.get(serial);
                        
                        if (existing) {
                            const isSeller = existing.seller.toLowerCase() === payload.seller.toLowerCase();
                            
                            if (isSeller) {
                                existing.price = Number(payload.newPrice);
                                activeMap.set(serial, existing);
                            }
                        }
                    } else if (payload.type === "BID") {
                        const existing = activeMap.get(serial);
                        if (existing && existing.allowBids) {
                            const bidAmount = Number(payload.amount);
                            if (bidAmount > existing.highestBid) {
                                existing.highestBid = bidAmount;
                                existing.highestBidder = payload.bidder;
                                activeMap.set(serial, existing);
                            }
                        }
                    } else if (payload.type === "CANCEL_BID") {
                        const existing = activeMap.get(serial);
                        if (existing) {
                            if (existing.highestBidder === payload.bidder) {
                                existing.highestBid = 0;
                                existing.highestBidder = "";
                                activeMap.set(serial, existing);
                            }
                        }
                    } else if (payload.type === "SOLD" || payload.type === "CANCEL" || payload.type === "BID_ACCEPTED") {
                        activeMap.delete(serial);
                    }
                } catch (e) {
                    console.error("Error parsing HCS message: ", e);
                }
            });
    
            const finalMarketplaceItems = Array.from(activeMap.values());
    
            setAllListing(finalMarketplaceItems);
    
        } catch (error) {
            console.error("Failed to fetch global listings:", error);
        }
    };

    const cancelListing = async (listingSerialNumber: number, endTime: number, allowBids: boolean, toastId: string) => {
        if (!accountId || !signer) {
            toast.error("Connect wallet first!", { id: toastId });
            return false;
        }
    
        const currentTimeInSeconds = Math.floor(Date.now() / 1000);
    
        if (allowBids && endTime > 0) {
            if (currentTimeInSeconds >= endTime) {
                toast.error("Cannot cancel: Auction has already ended!", { id: toastId });
                return false;
            }
        }
    
        try {
            toast.loading("Canceling listing...", { id: toastId });
    
            const cancelMessage = {
                type: "CANCEL",
                serialNumber: listingSerialNumber,
                seller: accountId.toString(),
                cancelledAt: currentTimeInSeconds 
            };
    
            const transaction = new TopicMessageSubmitTransaction()
                .setTopicId(pixelorbitItemsMarketplaceTopicId)
                .setMessage(JSON.stringify(cancelMessage));
    
            await transaction.executeWithSigner(signer as unknown as any);
    
            toast.success("Listing cancelled!", { id: toastId });
            
            fetchUserListings();
            return true;
        } catch (error) {
            console.error("Cancel failed:", error);
            toast.error("Failed to cancel listing", { id: toastId });
            return false;
        }
    };

    const updatePrice = async (serialNumber: number, newPrice: number, allowBids: boolean, toastId: string) => {
        if (!accountId || !signer) {
            toast.error("Connect wallet first!", { id: toastId });
            return false;
        }

        if (allowBids) {
            toast.error("Cannot update price: Auction is active!", { id: toastId });
            return false;
        }
    
        try {
            toast.loading("Updating price...", { id: toastId });
    
            const updateMessage = {
                type: "UPDATE_PRICE",
                serialNumber: serialNumber,
                seller: accountId.toString(),
                newPrice: Number(newPrice),
                timestamp: Date.now()
            };
    
            await new TopicMessageSubmitTransaction()
                .setTopicId(pixelorbitItemsMarketplaceTopicId)
                .setMessage(JSON.stringify(updateMessage))
                .executeWithSigner(signer as unknown as any);
    
            toast.success("Price updated on-chain!", { id: toastId });
            
            fetchUserListings(); 
            return true;
        } catch (error) {
            console.error("Update price failed:", error);
            toast.error("Failed to update price", { id: toastId });
            return false;
        }
    };

    const buyItemListing = async (item: ListItem, toastId: string) => {
        if (!isConnected || !accountId || !signer) {
            toast.error("Connect wallet first!", { id: toastId });
            return false;
        }
    
        try {
            const userAccountId = AccountId.fromString(accountId.toString());
            const sellerAccountId = AccountId.fromString(item.seller);
            const tokenId = pixelorbitItemsId;
            const priceHbar = new Hbar(item.price);
    
            toast.loading("Checking wallet association...", { id: toastId });
            const accountInfo = await new AccountInfoQuery()
                .setAccountId(userAccountId)
                .execute(client);
    
            const isAssociated = accountInfo.tokenRelationships.get(tokenId.toString());
    
            if (!isAssociated) {
                toast.loading("Please approve item association in your wallet...", { id: toastId });
                const associateTx = new TokenAssociateTransaction()
                    .setAccountId(userAccountId)
                    .setTokenIds([tokenId]);
    
                const assocRes = await (await associateTx.executeWithSigner(signer as any)).getReceiptWithSigner(signer as any);
                
                if (assocRes.status.toString() !== "SUCCESS") {
                    console.error("Association failed");
                    toast.error("Association failed", { id: toastId });
                    return false;
                }
                toast.success("Token associated successfully!", { id: toastId });
            }
    
            toast.loading("Processing purchase...", { id: toastId });
            
            const transaction = new TransferTransaction()
                .addApprovedNftTransfer(tokenId, item.serialNumber, sellerAccountId, userAccountId)
                .addHbarTransfer(userAccountId, priceHbar.negated())
                .addHbarTransfer(sellerAccountId, priceHbar)
                .freezeWith(client);

            const signAdmin = await transaction.sign(AdminKey);
    
            const executedTx = await signAdmin.executeWithSigner(signer as any);
            const receipt = await executedTx.getReceiptWithSigner(signer as any);
    
            if (receipt.status.toString() !== "SUCCESS") {
                throw new Error("Transfer failed");
            }
    
            toast.loading("Finalizing on-chain record...", { id: toastId });
            const soldMessage = {
                type: "SOLD",
                serialNumber: item.serialNumber,
                buyer: userAccountId.toString(),
                seller: sellerAccountId.toString(),
                price: item.price,
                timestamp: Date.now()
            };
    
            await new TopicMessageSubmitTransaction()
                .setTopicId(pixelorbitItemsMarketplaceTopicId)
                .setMessage(JSON.stringify(soldMessage))
                .executeWithSigner(signer as any);
    
            toast.success("Purchase successful! NFT transferred.", { id: toastId });
            
            fetchAllListings();
            return true;
    
        } catch (error: any) {
            console.error("Purchase failed:", error);
            const msg = error.message || "";
            
            if (msg.includes("USER_REJECTED") || msg.includes("rejected")) {
                toast.error("Transaction cancelled", { id: toastId });
            } else if (msg.includes("INSUFFICIENT_PAYER_BALANCE")) {
                toast.error("Insufficient HBAR balance", { id: toastId });
            } else if (msg.includes("SPENDER_DOES_NOT_HAVE_ALLOWANCE")) {
                toast.error("Seller has not approved the transfer allowance", { id: toastId });
            } else {
                toast.error(`Purchase failed: ${msg}`, { id: toastId });
            }
            return false;
        }
    };

    const placeBid = async (item: ListItem, bidAmount: number, toastId: string) => {
        if (!isConnected || !accountId || !signer) {
            toast.error("Connect wallet first!", { id: toastId });
            return false;
        }
    
        if (bidAmount <= item.highestBid) {
            toast.error(`Bid must be higher than ${item.highestBid} HBAR`, { id: toastId });
            return false;
        }
    
        try {
            const bidderId = AccountId.fromString(accountId.toString());
            const bidAmountHbar = new Hbar(bidAmount);
            const tokenId = pixelorbitItemsId;

            toast.loading("Verifying token association...", { id: toastId });

            const accountInfo = await new AccountInfoQuery()
                .setAccountId(bidderId)
                .execute(client);
    
            const isAssociated = accountInfo.tokenRelationships.get(tokenId.toString());
    
            if (!isAssociated) {
                toast.loading("Please approve item association in your wallet...", { id: toastId });
                const associateTx = new TokenAssociateTransaction()
                    .setAccountId(bidderId)
                    .setTokenIds([tokenId]);
    
                const assocRes = await (await associateTx.executeWithSigner(signer as any)).getReceiptWithSigner(signer as any);
                
                if (assocRes.status.toString() !== "SUCCESS") {
                    console.error("Association failed");
                    toast.error("Association failed", { id: toastId });
                    return false;
                }
                toast.success("Token associated successfully!", { id: toastId });
            }
    
            toast.loading("Approving bid allowance in your wallet...", { id: toastId });
    
            const approveTx = new AccountAllowanceApproveTransaction()
                .approveHbarAllowance(bidderId, adminId, bidAmountHbar)
                .freezeWith(client);

            const signAdmin = await approveTx.sign(AdminKey);
    
            const approveResponse = await signAdmin.executeWithSigner(signer as any);
            const approveReceipt = await approveResponse.getReceiptWithSigner(signer as any);
    
            if (approveReceipt.status.toString() !== "SUCCESS") {
                throw new Error("Allowance approval failed");
            }
    
            toast.loading("Placing your bid on-chain...", { id: toastId });
    
            const bidMessage = {
                type: "BID",
                serialNumber: item.serialNumber,
                tokenId: pixelorbitItemsId.toString(),
                bidder: accountId.toString(),
                amount: bidAmount,
            };
    
            const hcsTx = new TopicMessageSubmitTransaction()
                .setTopicId(pixelorbitItemsMarketplaceTopicId)
                .setMessage(JSON.stringify(bidMessage));
    
            await hcsTx.executeWithSigner(signer as any);
    
            toast.success(`Bid of ${bidAmount} HBAR placed and approved!`, { id: toastId });
            
            fetchAllListings();
            return true;
    
        } catch (error: any) {
            console.error("Failed to place bid:", error);
            const msg = error.message || "";
            toast.error(msg.includes("USER_REJECTED") ? "Transaction cancelled" : `Failed: ${msg}`, { id: toastId });
            return false;
        }
    };

    const acceptBid = async (item: ListItem, toastId: string) => {
        if (!isConnected || !accountId || !signer) {
            toast.error("Connect wallet first!", { id: toastId });
            return false;
        }
    
        try {
            const sellerAccountId = AccountId.fromString(accountId.toString());
            const bidderAccountId = AccountId.fromString(item.highestBidder);
            const tokenId = pixelorbitItemsId;
            const bidAmountHbar = new Hbar(item.highestBid);
    
            toast.loading(`Accepting bid ${bidAmountHbar} and transferring NFT...`, { id: toastId });
    
            const transaction = new TransferTransaction()
                .addApprovedNftTransfer(tokenId, item.serialNumber, sellerAccountId, bidderAccountId)
                .addApprovedHbarTransfer(bidderAccountId, bidAmountHbar.negated())
                .addHbarTransfer(sellerAccountId, bidAmountHbar)
                .freezeWith(client);

            const signAdmin = await transaction.sign(AdminKey);
    
            const executedTx = await signAdmin.executeWithSigner(signer as any);
            const receipt = await executedTx.getReceiptWithSigner(signer as any);
    
            if (receipt.status.toString() !== "SUCCESS") {
                throw new Error("Bid acceptance transfer failed");
            }
    
            // 3. Catat di Topic (HCS) untuk rekam jejak on-chain
            toast.loading("Finalizing auction record...", { id: toastId });
            const acceptMessage = {
                type: "BID_ACCEPTED",
                serialNumber: item.serialNumber,
                winner: bidderAccountId.toString(),
                seller: sellerAccountId.toString(),
                finalPrice: item.highestBid,
                timestamp: Date.now()
            };
    
            await new TopicMessageSubmitTransaction()
                .setTopicId(pixelorbitItemsMarketplaceTopicId)
                .setMessage(JSON.stringify(acceptMessage))
                .executeWithSigner(signer as any);
    
            toast.success("Bid accepted! NFT transferred to winner.", { id: toastId });
            
            fetchAllListings();
            return true;
    
        } catch (error: any) {
            console.error("Accept bid failed:", error);
            const msg = error.message || "";
    
            if (msg.includes("USER_REJECTED")) {
                toast.error("Transaction cancelled", { id: toastId });
            } else if (msg.includes("SPENDER_DOES_NOT_HAVE_ALLOWANCE")) {
                toast.error("Bidder balance not approved for this transfer", { id: toastId });
            } else {
                toast.error(`Failed to accept bid: ${msg}`, { id: toastId });
            }
            return false;
        }
    };

    const cancelBid = async (item: ListItem, toastId: string) => {
        if (!isConnected || !accountId || !signer) {
            toast.error("Connect wallet first!", { id: toastId });
            return false;
        }
    
        if (accountId.toString() !== item.highestBidder) {
            toast.error("Only the bidder can cancel this bid.", { id: toastId });
            return false;
        }
    
        try {
            const bidderId = AccountId.fromString(accountId.toString());
    
            toast.loading("Revoking HBAR allowance...", { id: toastId });
    
            const revokeTx = new AccountAllowanceApproveTransaction()
                .approveHbarAllowance(bidderId, adminId, new Hbar(0))
                .freezeWith(client);

            const signAdmin = await revokeTx.sign(AdminKey);
    
            const revokeResponse = await signAdmin.executeWithSigner(signer as any);
            const revokeReceipt = await revokeResponse.getReceiptWithSigner(signer as any);
    
            if (revokeReceipt.status.toString() !== "SUCCESS") {
                throw new Error("Failed to revoke allowance on-chain.");
            }
    
            toast.loading("Updating marketplace status...", { id: toastId });
    
            const cancelMessage = {
                type: "CANCEL_BID",
                serialNumber: item.serialNumber,
                tokenId: pixelorbitItemsId.toString(),
                bidder: accountId.toString(),
                timestamp: Date.now()
            };
    
            const hcsTx = new TopicMessageSubmitTransaction()
                .setTopicId(pixelorbitItemsMarketplaceTopicId)
                .setMessage(JSON.stringify(cancelMessage));
    
            await hcsTx.executeWithSigner(signer as any);
    
            toast.success("Bid cancelled and allowance revoked!", { id: toastId });
            
            fetchAllListings();
            return true;
        } catch (error: any) {
            console.error("Cancel bid failed:", error);
            const msg = error.message || "";
            toast.error(msg.includes("USER_REJECTED") ? "Cancelled by user" : `Error: ${msg}`, { id: toastId });
            return false;
        }
    };
    
    useEffect(() => {
        let intervalId: NodeJS.Timeout;
    
        if (isConnected) {
            getAllScore();
            fetchUserItems();
            fetchUserListings();
            fetchAllListings();
            getAccountBalance();
    
            intervalId = setInterval(() => {
                getAllScore();
                fetchUserItems();
                fetchUserListings();
                fetchAllListings();
                fetchUserSpaceships();
                getAccountBalance();
            }, 4000);
        }
    
        return () => {
            if (intervalId) {
                clearInterval(intervalId);
                console.log("Polling stopped");
            }
        };
    }, [isConnected, getAllScore]);

    return (
        <HashinalsContext.Provider 
            value={{ 
                sdk,
                ownedItems,
                userHighscores,
                leaderboard,
                totalUser,
                mySpaceships,
                userListings,
                allListing,
                connect, 
                disconnect, 
                getAccountBalance,
                CreateTopic,
                submitHighscore,
                getAllScore,
                fetchUserSpaceships,
                mintItems,
                listItem,
                cancelListing,
                updatePrice,
                buyItemListing,
                createInfiniteCollection,
                mintSpaceship,
                placeBid,
                acceptBid,
                cancelBid,
            }}
        >
            {children}
        </HashinalsContext.Provider>
    );
}

export const useHashinals = () => useContext(HashinalsContext);