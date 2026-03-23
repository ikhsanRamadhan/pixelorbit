'use client';
import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import Image from "next/image";
import { toast } from 'sonner';
import { useHashinals } from "@/components/layout/HashinalsProvider";
import { rarityColors, ListItem, rarityOrder } from "@/components/utils/Items";
import { useWalletStore } from "@/components/store/wallet-store";
import Pagination from "@mui/material/Pagination";

interface MarketplaceProps {
    title: string;
    delay: number;
}

function FeatureCardMarketplace({ title, delay }: MarketplaceProps) {
    const { allListing, buyItemListing, placeBid, cancelBid } = useHashinals();
    const { accountId } = useWalletStore();
    
    const [isMarketOpen, setIsMarketOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<ListItem | null>(null);
    const [bidAmount, setBidAmount] = useState<string>("");
    const [loadingTransaction, setLoadingTransaction] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    const totalPages = Math.ceil(allListing.length / itemsPerPage);

    const paginatedListing = useMemo(() => {
        if (!allListing || !Array.isArray(allListing)) return [];
    
        const sortedData = [...allListing].sort((a, b) => {
            const orderA = rarityOrder[a.rarity] || 99;
            const orderB = rarityOrder[b.rarity] || 99;
            return orderA - orderB;
        });
    
        const startIndex = (currentPage - 1) * itemsPerPage;
        const slicedData = sortedData.slice(startIndex, startIndex + itemsPerPage);
    
        return slicedData;
    }, [allListing, currentPage]);

    useEffect(() => {
        if (selectedItem) {
            const baseValue = selectedItem.highestBid > 0 
                ? selectedItem.highestBid 
                : selectedItem.price;

            const min = (baseValue + 0.1).toFixed(1);

            console.log('bid:', selectedItem.highestBid);
            
            setBidAmount(min.toString());
        }
    }, [selectedItem]);

    const handleAction = async (item: ListItem) => {
        if (!accountId) {
            toast.error("Please connect your wallet first");
            return;
        }

        const toastId = toast.loading("Preparing transaction...");
        setLoadingTransaction(true);

        try {
            if (item.allowBids) {
                const amount = parseFloat(bidAmount);
                const currentPrice = item.highestBid > 0 ? item.highestBid : item.price;
                
                if (isNaN(amount) || amount <= currentPrice) {
                    toast.error(`Min bid must be higher than ${currentPrice} HBAR`, { id: toastId });
                    setLoadingTransaction(false);
                    return;
                }

                const success = await placeBid(item, amount, toastId as string);
                if (success) {
                    setSelectedItem(null);
                }
                setLoadingTransaction(false);
            } else {
                const success = await buyItemListing(item, toastId as string);
                if (success) setSelectedItem(null);
                setLoadingTransaction(false);
            }
        } catch (error) {
            console.error(error);
            toast.error("Transaction failed!", { id: toastId });
        } finally {
            setLoadingTransaction(false);
        }
    };

    const handleCancelBid = async (item: ListItem) => {
        setLoadingTransaction(true);
        const toastId = toast.loading("Cancelling bid...");

        try {
            const success = await cancelBid(item, toastId as string);
            if (success) {
                setSelectedItem(null);
            }
        } catch {
            toast.error("Transaction failed!", { id: toastId });
        } finally {
            setLoadingTransaction(false);
        }
    };

    return (
        <>
            {/* MINI PREVIEW CARD */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay, duration: 0.8 }}
                onClick={() => {setIsMarketOpen(true); setSelectedItem(null);}}
                className="relative p-6 rounded-xl border border-amber-500/30 bg-black/40 backdrop-blur-md group hover:border-amber-400 cursor-pointer transition-all duration-300 h-full flex flex-col overflow-hidden"
            >
                <div className="absolute top-2 right-3 text-[8px] text-amber-500/40 font-mono italic">MARKET_LIVE_V1</div>
                <h3 className="text-amber-400 font-bold uppercase tracking-[0.2em] text-center mb-6 text-sm">{title}</h3>
                <div className="grow flex justify-around items-center gap-2 py-4">
                    {allListing.slice(0, 4).map((item, idx) => (
                        <div key={idx} className="relative w-12 h-12">
                            <Image src={item.image} alt={item.name} fill className="object-contain opacity-50 group-hover:opacity-100 transition-opacity" unoptimized />
                        </div>
                    ))}
                    {allListing.length === 0 && <span className="text-gray-600 text-[10px] font-mono uppercase">No Active Listings</span>}
                </div>
                <div className="text-center mt-2 animate-pulse">
                    <span className="text-[9px] text-amber-500/60 font-mono">[ ENTER MARKETPLACE ]</span>
                </div>
            </motion.div>

            {/* FULL MARKETPLACE OVERLAY */}
            <AnimatePresence>
                {isMarketOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl"
                        onClick={() => { setIsMarketOpen(false); setSelectedItem(null); }}
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                            className="bg-[#050505] border border-amber-500/50 rounded-2xl p-6 w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row gap-6 shadow-[0_0_50px_rgba(245,158,11,0.1)]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Main Grid Area */}
                            <div className="flex-1 flex flex-col min-w-0">
                                <div className="flex justify-between items-center mb-8 border-b border-amber-950 pb-4">
                                    <div>
                                        <h2 className="text-2xl font-black text-amber-500 tracking-tighter uppercase italic">Global Marketplace</h2>
                                        <p className="text-[10px] text-amber-500/50 font-mono uppercase tracking-widest">Pixelorbit Decentralized Exchange</p>
                                    </div>
                                    <button onClick={() => {setIsMarketOpen(false); setSelectedItem(null);}} className="text-amber-500 hover:text-white transition-colors font-mono text-xl cursor-pointer">[X]</button>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto pr-2 custom-scrollbar">
                                    {paginatedListing.map((item, idx) => (
                                        <div 
                                            key={idx} 
                                            onClick={() => setSelectedItem(item)}
                                            className={`bg-white/5 rounded-xl p-3 border transition-all cursor-pointer flex flex-col gap-2 ${selectedItem?.serialNumber === item.serialNumber ? 'border-amber-500 bg-amber-500/10' : 'border-white/10 hover:border-amber-500/40'}`}
                                        >
                                            <div className="aspect-square relative bg-black rounded-lg border border-white/5 overflow-hidden">
                                                <Image src={item.image} alt={item.name} fill className="object-contain p-2" unoptimized />
                                                <div className={`absolute bottom-0 left-0 right-0 ${rarityColors[item.rarity]?.replace('text-', 'bg-')} text-[7px] text-black font-black text-center uppercase`}>
                                                    {item.rarity}
                                                </div>
                                                <div className={`absolute top-1 left-1 ${item.allowBids ? 'bg-blue-600' : 'bg-red-600'} text-[8px] px-1.5 py-0.5 rounded text-white font-black uppercase tracking-tighter`}>
                                                    {item.allowBids ? 'Bidding' : 'Fixed'}
                                                </div>
                                            </div>
                                            <div className="text-center">
                                                <h4 className="text-white font-bold uppercase text-[10px] truncate">{item.name}</h4>
                                                <p className="text-amber-400 font-mono font-bold text-xs">
                                                    {item.allowBids ? (item.highestBid > 0 ? item.highestBid : item.price) : item.price} ℏ
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex justify-center mt-6 pt-4 border-t border-amber-950/50">
                                    <Pagination 
                                        count={totalPages}
                                        page={currentPage}
                                        onChange={(_, p) => setCurrentPage(p)} 
                                        size="small" 
                                        sx={{ 
                                            '& .MuiPaginationItem-root': { 
                                                color: '#f59e0b',
                                                fontFamily: 'monospace',
                                                fontSize: '0.75rem',
                                                borderColor: 'rgba(245, 158, 11, 0.3)'
                                            },
                                            '& .Mui-selected': {
                                                backgroundColor: 'rgba(245, 158, 11, 0.2) !important',
                                                color: 'white !important',
                                                fontWeight: 'bold'
                                            }
                                        }} 
                                    />
                                </div>
                            </div>

                            <AnimatePresence mode="wait">
                                {selectedItem && (
                                    <motion.div 
                                        initial={{ x: 20, opacity: 0 }} 
                                        animate={{ x: 0, opacity: 1 }} 
                                        exit={{ x: 20, opacity: 0 }}
                                        className="w-full md:w-80 bg-amber-500/5 border border-amber-500/30 rounded-xl p-6 flex flex-col gap-4 h-fit"
                                    >
                                        <h3 className="font-mono text-[10px] text-amber-500 uppercase border-b border-amber-500/20 pb-2">Item Details</h3>
                                        
                                        <div className="aspect-square w-32 mx-auto relative bg-black/40 rounded-lg border border-amber-500/20">
                                            <Image src={selectedItem.image} alt="preview" fill className="object-contain p-3" unoptimized />
                                        </div>

                                        <div className="text-center space-y-1">
                                            <p className="text-white font-black uppercase text-base">{selectedItem.name}</p>
                                            <p className="text-[10px] text-amber-500/50 font-mono">SERIAL: #{selectedItem.serialNumber}</p>
                                            <div className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block bg-white/5 ${rarityColors[selectedItem.rarity]}`}>
                                                {selectedItem.rarity}
                                            </div>
                                        </div>

                                        <div className="bg-black/40 p-4 rounded-lg border border-white/5 space-y-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[9px] text-gray-500 uppercase font-mono">{selectedItem.allowBids ? 'Current Bid' : 'Price'}</span>
                                                <span className="text-sm font-black text-white font-mono">
                                                    {selectedItem.allowBids ? (selectedItem.highestBid > 0 ? selectedItem.highestBid : selectedItem.price) : selectedItem.price} ℏ
                                                </span>
                                            </div>
                                            {selectedItem.allowBids && selectedItem.highestBidder !== '' && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[9px] text-gray-500 uppercase font-mono">Highest Bidder</span>
                                                    <span className="text-sm font-black text-white font-mono">
                                                        {accountId === selectedItem.highestBidder ? 'You' : `${selectedItem.highestBidder.slice(0, 5)}...${selectedItem.highestBidder.slice(-3)} ℏ`}
                                                    </span>
                                                </div>
                                            )}

                                            {selectedItem.allowBids && selectedItem.seller.toLowerCase() !== accountId?.toLowerCase() && selectedItem.highestBidder?.toLowerCase() !== accountId?.toLowerCase() && (
                                                <div className="space-y-2 pt-2 border-t border-white/5">
                                                    <label className="text-[9px] text-amber-500 uppercase font-black block">Your Bid Amount (HBAR)</label>
                                                    <input 
                                                        type="number"
                                                        value={bidAmount}
                                                        onChange={(e) => setBidAmount(e.target.value)}
                                                        className="w-full bg-black border border-amber-500/30 rounded px-3 py-2 text-white font-mono text-sm outline-none focus:border-amber-500 shadow-inner"
                                                    />
                                                    <p className="text-[8px] text-gray-500 italic">*Must be higher than current price</p>
                                                </div>
                                            )}
                                        </div>

                                        {selectedItem.allowBids && (
                                            <>
                                                {selectedItem.highestBidder?.toLowerCase() === accountId?.toLowerCase() ? (
                                                    <button
                                                        disabled={loadingTransaction}
                                                        onClick={() => handleCancelBid(selectedItem)}
                                                        className="w-full py-3 rounded font-black uppercase text-xs tracking-widest bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/40 active:scale-95 cursor-pointer transition-all"
                                                    >
                                                        {loadingTransaction ? 'Processing...' : 'Cancel My Bid'}
                                                    </button>
                                                ) : (
                                                    <button
                                                        disabled={selectedItem.seller.toLowerCase() === accountId?.toLowerCase() || loadingTransaction}
                                                        onClick={() => handleAction(selectedItem)}
                                                        className={`w-full py-3 rounded font-black uppercase text-xs tracking-widest transition-all 
                                                            ${selectedItem.seller.toLowerCase() === accountId?.toLowerCase()
                                                                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                                                : 'bg-amber-600 hover:bg-amber-500 text-black shadow-lg shadow-amber-900/40 active:scale-95 cursor-pointer'
                                                            }`}
                                                    >
                                                        {loadingTransaction ? 'Processing...' : 
                                                            selectedItem.seller.toLowerCase() === accountId?.toLowerCase() ? 'Your Asset' : 'Confirm Bid'}
                                                    </button>
                                                )}
                                            </>
                                        )}

                                        {!selectedItem.allowBids && (
                                            <button
                                                disabled={selectedItem.seller.toLowerCase() === accountId?.toLowerCase() || loadingTransaction}
                                                onClick={() => handleAction(selectedItem)}
                                                className="w-full py-3 rounded font-black uppercase text-xs tracking-widest bg-amber-600 hover:bg-amber-500 text-black shadow-lg shadow-amber-900/40 active:scale-95 cursor-pointer transition-all"
                                            >
                                                {loadingTransaction ? 'Processing...' : 'Buy Now'}
                                            </button>
                                        )}

                                        <button onClick={() => setSelectedItem(null)} className="text-[9px] text-gray-600 hover:text-white uppercase font-mono transition-colors text-center cursor-pointer">
                                            [ Cancel Selection ]
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

export default FeatureCardMarketplace;
