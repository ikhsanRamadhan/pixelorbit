'use client';
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import Image from "next/image";
import { Ship, ShipData } from "@/components/utils/Spaceships";
import { useHashinals } from "@/components/layout/HashinalsProvider";
import { toast }  from 'sonner';

interface FeatureCardProps {
    title: string;
    data: Ship[];
    delay: number;
};

function FeatureCardSpaceships({ title, data, delay }: FeatureCardProps) {
    const { mySpaceships, fetchUserSpaceships, mintSpaceship } = useHashinals();
    const [isMarketOpen, setIsMarketOpen] = useState(false);

    const handlePurchase = async (ship: ShipData) => {
        const toastId = toast.loading("Minting Spaceship...");
        await mintSpaceship(ship, toastId as string);
        fetchUserSpaceships();
    };

    return (
        <>
            {/* MINI PREVIEW CARD */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay, duration: 0.8 }}
                onClick={() => setIsMarketOpen(true)}
                className="relative p-6 rounded-xl border border-cyan-500/30 bg-black/40 backdrop-blur-md group hover:border-cyan-400 cursor-pointer transition-all duration-300 h-full flex flex-col overflow-hidden"
            >
                <div className="absolute inset-0 bg-linear-to-b from-transparent via-cyan-500/5 to-transparent -translate-y-full group-hover:translate-y-full transition-transform duration-2000 ease-in-out" />

                <div className="absolute top-2 right-3 text-[8px] text-cyan-500/40 font-mono tracking-tighter">
                    SHIPS_DEALERSHIP_V1.0
                </div>
                
                <h3 className="text-cyan-400 font-bold uppercase tracking-[0.2em] text-center mb-6 text-sm">
                    {title}
                </h3>
                
                <div className="grow flex justify-around items-center gap-2 py-4">
                    {data.slice(0, 4).map((ship, idx) => (
                        <motion.div 
                            key={idx}
                            animate={{ y: [0, -10, 0] }} 
                            transition={{ 
                                duration: 4, 
                                repeat: Infinity, 
                                delay: idx * 0.7, 
                                ease: "easeInOut" 
                            }}
                            className="relative w-16 h-16 md:w-20 md:h-20"
                        >
                            <Image
                                src={ship.icon}
                                alt={ship.name}
                                fill
                                className="object-contain filter drop-shadow-[0_0_8px_rgba(34,211,238,0.4)] group-hover:drop-shadow-[0_0_15px_rgba(34,211,238,0.7)]"
                                unoptimized
                            />
                        </motion.div>
                    ))}
                </div>

                <div className="text-center mt-2">
                    <span className="text-[9px] text-cyan-500/60 font-mono animate-pulse">
                        [ ACCESS SHIP DEALERSHIP ]
                    </span>
                </div>

                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-linear-to-r from-transparent via-cyan-500 to-transparent opacity-50" />
            </motion.div>

            {/* FULL MARKETPLACE OVERLAY */}
            <AnimatePresence>
                {isMarketOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
                        onClick={
                            () => {
                                setIsMarketOpen(false)
                                toast.dismiss();
                            }
                        }
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-[#050505] border border-cyan-500/50 rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-[0_0_50px_rgba(6,182,212,0.2)]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-8 border-b border-cyan-950 pb-4">
                                <h2 className="text-2xl font-black text-cyan-400 tracking-tighter uppercase italic">
                                    Available Fleet <span className="text-white text-sm ml-2">({data.length} Units)</span>
                                </h2>
                                <button 
                                    onClick={
                                        () => {
                                            setIsMarketOpen(false)
                                            toast.dismiss();
                                        }
                                    }
                                    className="text-cyan-500 hover:text-white transition-colors font-mono text-xl cursor-pointer"
                                >
                                    [X]
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {data.map((ship, idx) => (
                                    <div key={idx} className="bg-white/5 rounded-lg p-4 border border-white/10 hover:border-cyan-500/40 transition-all group">
                                        <div className="flex gap-4">
                                            <div className="w-24 h-24 relative shrink-0 bg-black/40 rounded border border-cyan-900">
                                                <motion.div 
                                                    key={idx}
                                                    animate={{ y: [0, -10, 0] }} 
                                                    transition={{ 
                                                        duration: 4, 
                                                        repeat: Infinity, 
                                                        delay: idx * 0.7, 
                                                        ease: "easeInOut"
                                                    }}
                                                    className="w-24 h-24 relative"
                                                >
                                                    <Image src={ship.icon} alt={ship.name} fill className="object-contain p-2" unoptimized />
                                                </motion.div>
                                            </div>
                                            <div className="grow">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="text-lg font-bold text-white uppercase tracking-tight leading-none">{ship.name}</h4>
                                                        {/* Visual Bullet Capacity */}
                                                        <div className="flex gap-1 mt-1">
                                                            {Array.from({ length: 5 }).map((_, i) => (
                                                                <div 
                                                                    key={i} 
                                                                    className={`w-1.5 h-3 rounded-sm transform -skew-x-12 transition-colors duration-500 ${
                                                                        i < ship.bullet 
                                                                        ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]' 
                                                                        : 'bg-white/10'
                                                                    }`}
                                                                />
                                                            ))}
                                                            <span className="text-[8px] text-cyan-500/50 font-mono ml-1 self-end uppercase">
                                                                Ammo Cap.
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {mySpaceships.some(mySHip => mySHip.name === ship.name) || ship.price === 0 ? 
                                                        <span className="text-cyan-400 font-mono font-bold text-sm bg-cyan-400/10 px-2 py-1 rounded border border-cyan-400/20">Owned</span> :
                                                        <span className="text-yellow-400 font-mono font-bold text-sm">{ship.price} HBAR</span>
                                                    }
                                                </div>
                                                
                                                {/* STATS BAR */}
                                                <div className="mt-4 space-y-1.5 bg-black/20 p-2 rounded-lg border border-white/5">
                                                    <StatBar label="Health" value={ship.hp} max={10} color="bg-red-500" />
                                                    <StatBar label="Energy" value={ship.maxEnergy} max={300} color="bg-cyan-500" />
                                                    <StatBar label="Damage" value={ship.laserDamage} max={5} color="bg-yellow-400" />
                                                </div>
                                                
                                                {!(mySpaceships.some(mySHip => mySHip.name === ship.name) || ship.price === 0) && (
                                                    <button
                                                        onClick={() => handlePurchase(ship)}
                                                        className="w-full mt-4 py-2 bg-cyan-600 hover:bg-cyan-400 text-black font-black uppercase text-[10px] rounded transition-all tracking-widest cursor-pointer active:scale-95 shadow-lg shadow-cyan-900/20"
                                                    >
                                                        Purchase NFT
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

// Sub-Component to render a stat bar
function StatBar({ label, value, max, color }: { label: string, value: number, max: number, color: string }) {
    const percentage = (value / max) * 100;
    return (
        <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/60 font-mono w-10 uppercase">{label}</span>
            <div className="grow h-1 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    className={`h-full ${color}`} 
                />
            </div>
        </div>
    );
}

export default FeatureCardSpaceships;