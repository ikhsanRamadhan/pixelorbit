"use client";
import { motion } from 'motion/react';
import Image from "next/image";
import { Dispatch, SetStateAction, useCallback, useRef, useState, useEffect, useMemo } from 'react';
import Pagination from '@mui/material/Pagination';

import { MySpaceships } from '@/components/utils/Spaceships';
import { useHashinals } from './HashinalsProvider';
import { CollectedItem } from '@/components/utils/Items';
import { toast } from 'sonner';

interface gameoverProps {
    score: number;
    ship: MySpaceships;
    collectedItems: CollectedItem[];
    selectedItems: CollectedItem[];
    onRestart: () => void;
    onBack: () => void;
    setCollectedItems: Dispatch<SetStateAction<CollectedItem[]>>;
    setSelectedItems: Dispatch<SetStateAction<CollectedItem[]>>;
};

const GameOver = ({ score, ship, collectedItems, selectedItems, onRestart, onBack, setCollectedItems, setSelectedItems }: gameoverProps) => {
    const { userHighscores, submitHighscore, mintItems } = useHashinals();
    const [clickedItems, setClickedItems] = useState<{ [key: string]: boolean }>({});
    const [currentPage, setCurrentPage] = useState(1);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isMinting, setIsMinting] = useState(false);
    const [mintedInSession, setMintedInSession] = useState<number[]>([]);

    const itemsPerPage = 8;
    const selectedItemsRef = useRef(selectedItems);

    const currentShipRecord = useMemo(() => {
        const record = userHighscores.find((h: any) => h.ship === ship.name);
        return record ? record.score : 0;
    }, [userHighscores, ship.name]);

    const canMint = selectedItems.length > 0;

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = collectedItems.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(collectedItems.length / itemsPerPage);

    const handleSelectItem = useCallback((id: number, name: string) => {
        if (mintedInSession.includes(id)) return;
    
        setClickedItems(prev => {
            const newState = !prev[id];
            
            setSelectedItems(currentSelection => {
                if (newState) {
                    const itemToAdd = collectedItems.find(item => item.id === id);
                    if (!itemToAdd) return currentSelection;
                    return [...currentSelection.filter(i => i.id !== id), { ...itemToAdd, collected: true }];
                } else {
                    return currentSelection.filter(item => item.id !== id);
                }
            });
    
            return { ...prev, [id]: newState };
        });
    
        setCollectedItems(prevItems => 
            prevItems.map(item => item.id === id ? { ...item, collected: !clickedItems[id] } : item)
        );
    }, [clickedItems, collectedItems, mintedInSession, setCollectedItems, setSelectedItems]);

    const handleChangePage = (newPage: number) => {
        setCurrentPage(newPage);
    };

    const handlePressSubmit = async () => {
        setIsSubmitting(true);
        if (isSubmitted) {
            setIsSubmitting(false);
            return;
        }

        const submitted = await submitHighscore(score, ship.name);
        setIsSubmitted(submitted!);
        setIsSubmitting(false);
    };

    const handleMintItems = async () => {
        if (!canMint || isMinting) return;
        setIsMinting(true);
    
        const toastId = toast.loading("Minting items...");
        
        const successfulIds: number[] = [];
    
        try {
            for (const item of selectedItems) {
                const success = await mintItems(item, toastId as string);
                
                if (success) {
                    successfulIds.push(item.id);
                } else {
                    console.log(`User cancelled or failed: ${item.name}`);
                    
                    toast.error(`Failed to mint: ${item.name}`, {
                        duration: 3000,
                    });
                }
            }
    
            if (successfulIds.length > 0) {
                setMintedInSession(prev => [...prev, ...successfulIds]);
                setSelectedItems(prev => prev.filter(item => !successfulIds.includes(item.id)));
                
                setClickedItems(prev => {
                    const newClicked = { ...prev };
                    successfulIds.forEach(id => delete newClicked[id]);
                    return newClicked;
                });
    
                toast.success(`Successfully claimed ${successfulIds.length} items!`, { id: toastId });
            } else {
                toast.error("Minting process stopped/failed.", { id: toastId });
            }
        } catch (error) {
            console.error("Critical Minting Error:", error);
            toast.error("System error occurred!", { id: toastId });
        } finally {
            setIsMinting(false);
        }
    };

    useEffect(() => {
        selectedItemsRef.current = selectedItems;
    }, [selectedItems]);

    const getRarityStyles = (rarity: string, isClicked: boolean) => {
        const styles: Record<string, { active: string, inactive: string, solid: string }> = {
            Common: { active: "border-white bg-white/20", inactive: "border-white/60 bg-transparent", solid: "bg-gray-400" },
            Uncommon: { active: "border-green-500 bg-green-500/20", inactive: "border-green-500/60 bg-transparent", solid: "bg-green-500" },
            Rare: { active: "border-blue-500 bg-blue-500/20", inactive: "border-blue-500/60 bg-transparent", solid: "bg-blue-500" },
            Epic: { active: "border-purple-500 bg-purple-500/20", inactive: "border-purple-500/60 bg-transparent", solid: "bg-purple-500" },
            Legendary: { active: "border-red-500 bg-red-500/20", inactive: "border-red-500/60 bg-transparent", solid: "bg-red-500" },
        };
        return styles[rarity] || styles.Common;
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-50 flex flex-col items-center justify-center p-8 rounded-3xl border-2 border-red-500/50 bg-black/80 backdrop-blur-xl max-w-xl w-full text-center"
        >
            <div className="absolute -inset-1 bg-red-500/20 blur-2xl rounded-3xl -z-10" />
        
            <h1 className="text-5xl font-black text-red-500 italic tracking-tighter uppercase mb-2">
                Mission Failed
            </h1>
            <p className="text-cyan-400 font-mono text-sm mb-8 tracking-widest">SIGNAL LOST // SHIP DESTROYED</p>
        
            <div className="grid grid-cols-2 gap-4 w-full mb-8">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-[10px] text-gray-400 uppercase mb-1">Final Score</p>
                    <p className="text-2xl font-bold text-yellow-400">{score.toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-[10px] text-gray-400 uppercase mb-1">Active Ship</p>
                    <p className="text-lg font-bold text-white">{ship.name}</p>
                    {currentShipRecord > 0 && (
                        <p className="text-[9px] text-cyan-500 mt-1 uppercase">Best: {currentShipRecord.toLocaleString()}</p>
                    )}
                </div>
            </div>
    
            <div className="w-full mb-8 text-left">
                <p className="text-[10px] text-cyan-500/50 uppercase font-mono mb-3 tracking-widest">
                    Recovered Tech ({collectedItems.length})
                </p>

                <div className="grid grid-cols-4 gap-8 w-auto mx-auto justify-items-center p-8 bg-black/40 rounded-lg min-h-35">
                    {currentItems.length > 0 ? currentItems.map((item, idx) => {
                        const isRecentlyMinted = mintedInSession.includes(item.id);

                        const isDisabled = isRecentlyMinted || isMinting;

                        return (
                            <button 
                                key={item.id || idx} 
                                disabled={isDisabled}
                                onClick={() => handleSelectItem(item.id, item.name)}
                                className={`relative w-12 h-12 border rounded p-1 group flex items-center justify-center transition-all
                                    ${isDisabled ? 'opacity-40 cursor-not-allowed grayscale' : 'cursor-pointer'}
                                    ${clickedItems[item.id] 
                                        ? getRarityStyles(item.rarity, true).active 
                                        : getRarityStyles(item.rarity, false).inactive
                                    }
                                `}
                            >
                                <Image 
                                    src={typeof item.image === 'string' ? item.image : (item.image as any).src} 
                                    alt={item.name} 
                                    width={40} height={40} 
                                    className="object-contain"
                                    unoptimized
                                />
                                
                                {isRecentlyMinted && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-green-500/20 rounded">
                                        <span className="text-green-400 text-xs font-bold">✓</span>
                                    </div>
                                )}

                                <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 
                                    ${getRarityStyles(item.rarity, true).solid}
                                    text-black text-[10px] font-bold rounded 
                                    opacity-0 group-hover:opacity-100 transition-opacity 
                                    whitespace-nowrap pointer-events-none z-70 shadow-xl`}
                                >
                                    {isRecentlyMinted ? `${item.name} (Secured)` : item.name}
                                </div>
                            </button>
                        );
                    }) : (
                        <div className="col-span-4 flex items-center justify-center h-24">
                            <p className="text-xs text-gray-500 italic">No items recovered</p>
                        </div>
                    )}
                </div>

                {collectedItems.length > itemsPerPage && (
                    <div className='flex justify-center mt-4 w-full overflow-hidden'>
                        <Pagination 
                            count={totalPages} 
                            page={currentPage}
                            variant="outlined" 
                            shape="rounded" 
                            size="medium"
                            onChange={(_, newPage) => handleChangePage(newPage)}
                            sx={{
                                '& .MuiPaginationItem-root': {
                                    color: 'white',
                                    borderColor: 'rgba(255,255,255,0.2)',
                                    '&.Mui-selected': {
                                        backgroundColor: 'rgba(6, 182, 212, 0.2)',
                                        borderColor: '#06b6d4',
                                    }
                                },
                            }}
                        />
                    </div>
                )}
            </div>
        
            {/* Action Buttons */}
            <div className='flex flex-col gap-3 w-full'>
                <div className="flex gap-4 w-full">
                    {/* BUTTON SUBMIT SCORE */}
                    {score > 0 && score > currentShipRecord && (
                        <motion.button
                            disabled={isSubmitted || isSubmitting}
                            onClick={handlePressSubmit}
                            whileHover={!isSubmitted && !isSubmitting ? { scale: 1.02 } : {}}
                            whileTap={!isSubmitted && !isSubmitting ? { scale: 0.98 } : {}}
                            className={`flex-1 py-4 px-2 font-black rounded-xl uppercase tracking-tighter text-xs transition-all
                                ${(isSubmitted || isSubmitting) 
                                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                                    : 'bg-yellow-200 text-black shadow-[0_0_15px_rgba(255,255,0,0.3)] cursor-pointer hover:bg-yellow-100'}
                            `}
                        >
                            {isSubmitting ? "Transmitting..." : isSubmitted ? "Recorded" : `New Record!`}
                        </motion.button>
                    )}

                    <motion.button
                        disabled={!canMint || isMinting}
                        onClick={handleMintItems}
                        whileHover={canMint && !isMinting ? { scale: 1.02 } : {}}
                        whileTap={canMint && !isMinting ? { scale: 0.98 } : {}}
                        className={`flex-1 py-4 px-2 font-black rounded-xl uppercase tracking-tighter text-xs transition-all
                            ${(!canMint || isMinting)
                                ? 'bg-white/5 text-white/20 border border-white/10 cursor-not-allowed'
                                : 'bg-green-500 text-black shadow-[0_0_15px_rgba(34,197,94,0.4)] cursor-pointer hover:bg-green-400'}
                        `}
                    >
                        {isMinting ? "Minting..." : `Claim Tech (${selectedItems.length})`}
                    </motion.button>
                </div>

                <div className="flex gap-4 w-full">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onRestart}
                        className="flex-1 py-4 px-2 bg-cyan-500 text-black font-black rounded-xl uppercase tracking-tighter text-xs shadow-[0_0_15px_rgba(6,182,212,0.3)] cursor-pointer"
                    >
                        Re-Deploy
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onBack}
                        className="flex-1 py-4 px-2 bg-red-500 text-black font-black rounded-xl uppercase tracking-tighter text-xs shadow-[0_0_15px_rgba(239,68,68,0.3)] cursor-pointer"
                    >
                        Exit
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
}

export default GameOver;