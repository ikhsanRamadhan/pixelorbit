'use client';
import { useState, useMemo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from "motion/react";
import Pagination from '@mui/material/Pagination';
import { MySpaceships } from '@/components/utils/Spaceships';
import { useWalletStore } from '@/components/store/wallet-store';
import { useHashinals } from '@/components/layout/HashinalsProvider';
import { Items, ListItem, rarityOrder, rarityColors, rarityBgColors } from '@/components/utils/Items';
import { toast } from 'sonner';

interface PilotProfileProps {
    spaceships: MySpaceships[];
    profileData: {
        highScore: number;
        highScoreShipName: string | null;
        shipsCount: number;
        itemsCount: number;
    };
};

const PilotProfile = ({ spaceships, profileData }: PilotProfileProps) => {
    const { accountId, balance } = useWalletStore();
    const { mySpaceships, userHighscores, ownedItems, userListings, listItem, cancelListing, updatePrice, acceptBid } = useHashinals();
    const [isInventoryOpen, setIsInventoryOpen] = useState(false);
    
    const [activeTab, setActiveTab] = useState<'inventory' | 'listings'>('inventory');
    const [selectedItem, setSelectedItem] = useState<Items | ListItem | null>(null);
    const [listPrice, setListPrice] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [allowBids, setAllowBids] = useState(false);
    const [auctionDuration, setAuctionDuration] = useState<string>("3600");

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    const highScoreShip = useMemo(() => {
        return spaceships.find(ship => ship.name === profileData.highScoreShipName) || spaceships[0];
    }, [spaceships, profileData.highScoreShipName]);

    const displayItems = useMemo(() => {
        let targetArray: Items[] | ListItem[] = [];
        if (activeTab === 'inventory') {
            const listedIds = new Set(userListings.map(l => l.serialNumber));
            targetArray = ownedItems.filter(item => !listedIds.has(item.serialNumber));
        } else {
            targetArray = userListings;
        }
        return [...targetArray].sort((a, b) => (rarityOrder[a.rarity] || 99) - (rarityOrder[b.rarity] || 99));
    }, [ownedItems, userListings, activeTab]);

    const paginatedItems = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return displayItems.slice(startIndex, startIndex + itemsPerPage);
    }, [displayItems, currentPage]);

    const totalPages = Math.ceil(displayItems.length / itemsPerPage);

    const handleAction = async () => {
        if (!selectedItem || !listPrice || parseFloat(listPrice) <= 0) {
            toast.error("Invalid price"); 
            return;
        }
    
        setIsSubmitting(true);
        const toastId = toast.loading("Processing...");
        const priceNum = parseFloat(listPrice);
    
        let success = false;
        if (activeTab === 'inventory') {
            success = await listItem(
                selectedItem as Items, 
                priceNum,
                allowBids,
                parseInt(auctionDuration), 
                toastId as string
            ) as boolean;
        } else {
            success = await updatePrice(selectedItem.serialNumber, priceNum, allowBids, toastId as string) as boolean;
        }
    
        if (success) { 
            setSelectedItem(null); 
            setListPrice(""); 
            setAllowBids(false);
        }
        setIsSubmitting(false);
    };

    const handleCancelListing = async (serialNumber: number, endTime: number, allowBids: boolean) => {
        setIsSubmitting(true);
        const toastId = toast.loading("Cancelling listing...");
        const success = await cancelListing(serialNumber, endTime, allowBids, toastId as string);
        if (success) setSelectedItem(null);
        setIsSubmitting(false);
    };

    const handleAcceptBid = async (item: ListItem, ) => {
        setIsSubmitting(true);
        const toastId = toast.loading("Accepting bid...");
        const success = await acceptBid(item, toastId as string);
        if (success) setSelectedItem(null);

        setIsSubmitting(false);
    };

    const formatAuctionEnd = (endTimeInSeconds: number) => {
        if (!endTimeInSeconds || endTimeInSeconds === 0) return { dateStr: "-", timeLeftStr: "-" };
    
        const endMs = endTimeInSeconds * 1000;
        const nowMs = Date.now();
        const diffMs = endMs - nowMs;
    
        const dateStr = new Date(endMs).toLocaleString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    
        if (diffMs <= 0) {
            return { dateStr, timeLeftStr: "Ended" };
        }
    
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
        const timeLeftStr = hours > 0 
            ? `${hours}h ${minutes}m left` 
            : `${minutes}m left`;
    
        return { dateStr, timeLeftStr };
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="relative p-8 rounded-2xl border border-cyan-500/30 bg-black/60 backdrop-blur-xl text-left overflow-hidden group">
                <div className="absolute inset-0 bg-linear-to-br from-cyan-500/5 via-transparent to-transparent opacity-50" />
                <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity duration-700">
                    <Image src={highScoreShip.icon || spaceships[0].icon} alt="ship" width={120} height={120} className="rotate-12 blur-[2px] group-hover:blur-0 transition-all" />
                </div>
                <div className="relative z-10 space-y-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[10px] text-cyan-500/50 uppercase font-mono tracking-widest">Commander ID</p>
                            <h3 className="text-cyan-400 font-bold font-mono truncate max-w-50">{accountId}</h3>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] text-yellow-500/60 uppercase font-mono">Personal Best</p>
                            <p className="text-yellow-400 font-black text-xl leading-none">{profileData.highScore.toLocaleString()}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-cyan-500/10 p-3 rounded-lg border border-cyan-500/10 backdrop-blur-sm">
                            <p className="text-[9px] text-cyan-500/60 uppercase">HBAR Balance</p>
                            <p className="text-white font-bold">{balance} ℏ</p>
                        </div>
                        <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                            <p className="text-[9px] text-gray-400 uppercase">Fleet Status</p>
                            <p className="text-white font-bold">{profileData.shipsCount} <span className="text-[10px] text-gray-500 font-normal">Active Units</span></p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <p className="text-[10px] text-cyan-500/50 uppercase font-mono tracking-widest border-b border-cyan-500/20 pb-1">Fleet Records</p>
                        <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
                            {mySpaceships.map((ship, idx) => {
                                const shipBest = userHighscores ? Math.max(...userHighscores.filter((h: any) => h.ship === ship.name && h.player === accountId).map((h: any) => h.score), 0) : 0; 
                                
                                return (
                                    <div key={idx} className="shrink-0 flex flex-col items-center gap-2 group/ship mt-1">
                                        <div className={`relative p-2 rounded-xl border ${ship.name === highScoreShip.name ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-white/10 bg-white/5'}`}>
                                            <Image src={ship.icon} alt={ship.name} width={45} height={45} className="object-contain group-hover/ship:scale-110 transition-transform" />
                                            {ship.name === highScoreShip.name && <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full shadow-[0_0_8px_#facc15]" />}
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[8px] text-gray-400 uppercase font-bold truncate w-14">{ship.name}</p>
                                            <p className="text-[9px] text-cyan-400 font-mono font-bold">{shipBest > 0 ? shipBest.toLocaleString() : '---'}</p>
                                        </div>
                                    </div>
                            )})}
                        </div> 
                    </div>
                </div>
            </div>

            {/* Quick Inventory Access */}
            <div 
                onClick={() => { setCurrentPage(1); setIsInventoryOpen(true); }} 
                className="relative p-6 rounded-2xl border border-cyan-500/30 bg-black/60 backdrop-blur-xl cursor-pointer hover:border-cyan-400 transition-all group/inventory"
            >
                {userListings.some(listing => (listing.highestBid ?? 0) > 0) && (
                    <div className="absolute -top-1 -right-1 flex h-3 w-3 z-20">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500 shadow-[0_0_8px_#facc15]"></span>
                    </div>
                )}

                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <p className="text-[10px] text-cyan-500/50 uppercase font-mono tracking-widest">On-Chain Assets</p>
                        {userListings.some(listing => (listing.highestBid ?? 0) > 0) && (
                            <span className="text-[7px] bg-cyan-500/20 text-cyan-400 px-1 rounded font-bold animate-pulse">NEW BIDS</span>
                        )}
                    </div>
                    <span className="text-[8px] text-cyan-500/30 group-hover/inventory:text-cyan-400 transition-colors uppercase font-mono">[ Open Inventory ]</span>
                </div>

                <div className="grid grid-cols-4 gap-4">
                    {ownedItems
                        .filter(item => !userListings.some(l => l.serialNumber === item.serialNumber))
                        .slice(0, 4)
                        .map((item, index) => (
                            <div key={index} className="relative aspect-square rounded-lg border border-white/5 bg-white/5 flex items-center justify-center overflow-hidden">
                                <Image src={item.image} alt="item" width={40} height={40} className="object-contain" unoptimized />
                                <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${rarityBgColors[item.rarity] || 'bg-gray-500'}`} />
                            </div>
                        ))}
                </div>
            </div>

            <AnimatePresence>
                {isInventoryOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md" onClick={() => !selectedItem && setIsInventoryOpen(false)}>
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-[#050505] border border-cyan-500/50 rounded-2xl p-8 w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.2)] flex flex-col md:flex-row gap-6" onClick={(e) => e.stopPropagation()}>
                            
                            <div className="flex-1 flex flex-col min-w-0">
                                <div className="flex justify-between items-center mb-6 border-b border-cyan-950 pb-4">
                                    <div className="flex gap-6">
                                        <button onClick={() => {setActiveTab('inventory'); setCurrentPage(1); setSelectedItem(null);}} className={`text-xl font-black tracking-tighter uppercase italic transition-all cursor-pointer ${activeTab === 'inventory' ? 'text-cyan-400' : 'text-gray-600 hover:text-cyan-800'}`}>Inventory</button>
                                        <button onClick={() => {setActiveTab('listings'); setCurrentPage(1); setSelectedItem(null);}} className={`text-xl font-black tracking-tighter uppercase italic transition-all cursor-pointer ${activeTab === 'listings' ? 'text-orange-400' : 'text-gray-600 hover:text-orange-800'}`}>My Listings</button>
                                    </div>
                                    <button onClick={() => setIsInventoryOpen(false)} className="text-cyan-500 hover:text-white font-mono text-xl cursor-pointer">[X]</button>
                                </div>

                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 overflow-y-auto pr-2 custom-scrollbar flex-1 content-start">
                                    {paginatedItems.map((item, idx) => {
                                        const isAuction = 'allowBids' in item ? item.allowBids : false;
                                        return (
                                            <div key={idx} onClick={() => setSelectedItem(item)} className={`flex flex-col items-center gap-2 p-2 rounded-xl border transition-all cursor-pointer ${selectedItem?.serialNumber === item.serialNumber ? 'bg-cyan-500/10 border-cyan-500' : 'border-transparent hover:bg-white/5'}`}>
                                                <div className="relative aspect-square w-full rounded-xl border border-white/10 bg-white/5 flex items-center justify-center p-2">
                                                    <Image src={item.image} alt="item" fill className="object-contain" unoptimized />
                                                    {activeTab === 'listings' && (
                                                        <div className={`absolute top-1 left-1 ${isAuction ? 'bg-blue-600' : 'bg-red-600'} text-[8px] px-1.5 py-0.5 rounded text-white font-black uppercase tracking-tighter`}>
                                                            {isAuction ? 'Bidding' : 'Fixed'}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-[9px] text-white font-bold uppercase truncate w-24">{item.name}</p>
                                                    <p className={`text-[8px] font-mono font-bold ${rarityColors[item.rarity] || 'text-cyan-500'}`}>{item.rarity}</p>
                                                    {activeTab === 'listings' && 'price' in item && (
                                                        <p className="text-[10px] font-mono text-yellow-500 mt-0.5">{item.price} ℏ</p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="flex justify-center mt-6 pt-4 border-t border-cyan-950">
                                    <Pagination count={totalPages} page={currentPage} onChange={(_, p) => setCurrentPage(p)} size="small" sx={{ '& .MuiPaginationItem-root': { color: 'white' }}} />
                                </div>
                            </div>

                            {/* Action Panel */}
                            {selectedItem && (
                                <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className={`w-full md:w-72 border rounded-xl p-6 flex flex-col gap-4 ${activeTab === 'inventory' ? 'bg-cyan-500/5 border-cyan-500/30' : 'bg-orange-500/5 border-orange-500/30'}`}>
                                    <h3 className="font-mono text-xs uppercase border-b border-white/10 pb-2">
                                        {activeTab === 'inventory' ? 'List Asset' : 'Manage Listing'}
                                    </h3>
                                    
                                    <div className="aspect-square w-24 mx-auto relative bg-black/40 rounded-lg border border-white/5">
                                        <Image src={selectedItem.image} alt="preview" fill className="object-contain p-2" unoptimized />
                                    </div>

                                    <div className="space-y-1 text-center md:text-left">
                                        <p className="text-white font-black uppercase text-sm truncate">{selectedItem.name}</p>
                                        <p className="text-[10px] text-white/40 font-mono">ID: {selectedItem.serialNumber}</p>
                                        <p className="text-[10px] text-white/40 font-mono">Rarity: <b className={`${rarityColors[selectedItem.rarity]}`}>{selectedItem.rarity}</b></p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] text-white/50 uppercase font-mono mb-1 block">
                                            {activeTab === 'inventory' 
                                                ? (allowBids ? 'Starting Price (HBAR)' : 'Fixed Price (HBAR)') 
                                                : ('allowBids' in selectedItem && selectedItem.allowBids ? 'Current Starting Price' : 'Update Price (HBAR)')
                                            }
                                        </label>
                                        <input 
                                            type="number" 
                                            value={listPrice} 
                                            onChange={(e) => setListPrice(e.target.value)} 
                                            disabled={activeTab === 'listings' && 'allowBids' in selectedItem && selectedItem.allowBids}
                                            placeholder={'price' in selectedItem ? String(selectedItem.price) : "0.00"} 
                                            className="w-full bg-black border border-white/20 rounded-lg px-3 py-2 text-white font-mono text-sm outline-hidden focus:border-cyan-500 disabled:opacity-50" 
                                        />

                                        {activeTab === 'listings' && 'allowBids' in selectedItem && selectedItem.allowBids && (
                                            <div className="space-y-3 pt-2 border-t border-white/5">
                                                <label className="text-[10px] text-white/50 uppercase font-mono block">
                                                    Auction Data
                                                </label>

                                                {(() => {
                                                    const endTime = 'endTime' in selectedItem ? selectedItem.endTime : 0;
                                                    const highestBid = 'highestBid' in selectedItem ? selectedItem.highestBid : 0;
                                                    const highestBidder = 'highestBidder' in selectedItem ? selectedItem.highestBidder : null;
                                                    
                                                    const { dateStr, timeLeftStr } = formatAuctionEnd(endTime);

                                                    return (
                                                        <div className="space-y-2">
                                                            <div className="bg-black/50 border border-purple-500/30 rounded-lg p-3 space-y-1.5">
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-[9px] text-gray-400 font-mono uppercase">Ends At:</span>
                                                                    <span className="text-[10px] text-white font-mono font-bold">{dateStr}</span>
                                                                </div>
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-[9px] text-gray-400 font-mono uppercase">Remaining:</span>
                                                                    <span className={`text-[10px] font-bold font-mono ${timeLeftStr === "Ended" ? 'text-red-500' : 'text-purple-400'}`}>
                                                                        {timeLeftStr}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-3 space-y-1.5">
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-[9px] text-cyan-500/60 font-mono uppercase">Highest Bid:</span>
                                                                    <span className="text-[11px] text-yellow-400 font-mono font-black">
                                                                        {highestBid > 0 ? `${highestBid} ℏ` : "No Bids"}
                                                                    </span>
                                                                </div>
                                                                {highestBidder && highestBid > 0 && (
                                                                    <div className="flex justify-between items-center border-t border-white/5 pt-1.5">
                                                                        <span className="text-[9px] text-gray-400 font-mono uppercase">Bidder:</span>
                                                                        <span className="text-[9px] text-white font-mono truncate max-w-25">
                                                                            {highestBidder}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {highestBid > 0 && (
                                                                <button 
                                                                    disabled={isSubmitting}
                                                                    onClick={() => handleAcceptBid(selectedItem)}
                                                                    className="w-full py-2.5 bg-green-500 text-black font-black uppercase text-[10px] rounded-lg cursor-pointer hover:bg-green-400 hover:shadow-[0_0_15px_rgba(34,197,94,0.4)] transition-all"
                                                                >
                                                                    {isSubmitting ? "Processing..." : "Accept Highest Bid"}
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })()}

                                                <p className="text-[8px] text-orange-400/70 italic mt-1 leading-tight">
                                                    *Accepting a bid will transfer the asset and end the auction immediately.
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {activeTab === 'inventory' && (
                                        <div className="space-y-3 pt-2 border-t border-white/5">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] text-white uppercase font-mono">Enable Bidding</span>
                                                <button 
                                                    onClick={() => setAllowBids(!allowBids)}
                                                    className={`w-10 h-5 rounded-full relative transition-colors ${allowBids ? 'bg-cyan-500' : 'bg-gray-700'}`}
                                                >
                                                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${allowBids ? 'left-6' : 'left-1'}`} />
                                                </button>
                                            </div>

                                            {allowBids && (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="space-y-2 overflow-hidden">
                                                    <label className="text-[10px] text-white/50 uppercase font-mono block">Duration</label>
                                                    <select 
                                                        value={auctionDuration}
                                                        onChange={(e) => setAuctionDuration(e.target.value)}
                                                        className="w-full bg-black border border-white/20 rounded-lg px-2 py-1.5 text-[11px] text-white font-mono outline-hidden"
                                                    >
                                                        <option value="3600">1 Hour</option>
                                                        <option value="86400">24 Hours</option>
                                                        <option value="259200">3 Days</option>
                                                        <option value="604800">7 Days</option>
                                                    </select>
                                                </motion.div>
                                            )}
                                        </div>
                                    )}

                                    <div className="mt-auto space-y-2">
                                        <button 
                                            disabled={isSubmitting || (activeTab === 'listings' && 'allowBids' in selectedItem && selectedItem.allowBids)} 
                                            onClick={handleAction} 
                                            className={`w-full py-3 font-black uppercase text-xs rounded-lg transition-all cursor-pointer disabled:hidden ${activeTab === 'inventory' ? 'bg-cyan-500 text-black hover:shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'bg-orange-500 text-black hover:shadow-[0_0_15px_rgba(249,115,22,0.4)]'}`}
                                        >
                                            {isSubmitting ? "Processing..." : activeTab === 'inventory' ? (allowBids ? "Start Auction" : "Confirm List") : "Update Price"}
                                        </button>
                                        
                                        {activeTab === 'listings' && 'allowBids' in selectedItem && selectedItem.allowBids && (
                                            <button onClick={() => handleCancelListing(selectedItem.serialNumber, selectedItem.endTime, selectedItem.allowBids)} className="w-full py-2 bg-red-500/10 text-red-500 border border-red-500/30 font-black uppercase text-[10px] rounded-lg cursor-pointer hover:bg-red-500 hover:text-white transition-all">
                                                Cancel Listing
                                            </button>
                                        )}
                                        <button onClick={() => setSelectedItem(null)} className="w-full text-gray-500 text-[10px] hover:text-white uppercase font-mono py-1 cursor-pointer transition-colors text-center block">
                                            [ Close Preview ]
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PilotProfile;
