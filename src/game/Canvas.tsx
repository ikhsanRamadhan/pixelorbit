"use client";
import { useEffect, useRef, useState } from 'react';
import { Dispatch, SetStateAction } from 'react';
import { motion, AnimatePresence } from "motion/react";

import { Game } from '@/game/GameEngine';
import GameBackground from '@/components/layout/GameBackground';
import { CollectedItem, ItemDropData } from "@/components/utils/Items";
import { MySpaceships } from "@/components/utils/Spaceships";
import { Alien, BossData } from "@/components/utils/Enemy";

interface CanvasProps {
    setScores: Dispatch<SetStateAction<number>>;
    mySpaceships: MySpaceships[];
    selectedShip: MySpaceships | null;
    aliens: Alien[];
    bosses: BossData[];
    items: ItemDropData[];
    setSelectedShip: Dispatch<SetStateAction<MySpaceships | null>>;
    setHp: Dispatch<SetStateAction<number | undefined>>;
    setCollectedItems: Dispatch<SetStateAction<CollectedItem[]>>;
    collectedItems: CollectedItem[];
    handleGameOver: () => void;
};

const Canvas: React.FC<CanvasProps> = (props) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const gameInstance = useRef<any | null>(null);
    const requestRef = useRef<number | undefined>(undefined);
    
    const [gameState, setGameState] = useState<'selecting' | 'counting' | 'playing'>('selecting');

    const availableShips = props.mySpaceships;

    useEffect(() => {
        if (gameState !== 'playing' || !props.selectedShip) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");
        if (!context) return;

        (window as any).canvas = canvas;
        (window as any).context = context;
        (window as any).ship = props.selectedShip;
        (window as any).__gameSetScores = props.setScores;
        (window as any).__gameSetHp = props.setHp;
        (window as any).__gameSetCollectedItems = props.setCollectedItems;
        (window as any).__gameAliens = props.aliens;
        (window as any).__gameBosses = props.bosses;
        (window as any).__gameItems = props.items;

        const handleResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            if (gameInstance.current) {
                gameInstance.current.width = canvas.width;
                gameInstance.current.height = canvas.height;
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        if (!gameInstance.current) {
            try {
                gameInstance.current = new Game(canvas, props.selectedShip);
                gameInstance.current.setupInput();
            } catch (err) {
                console.error("Failed to initialize Game Engine:", err);
            }
        }

        let lastTime = 0;
        const animate = (timeStamp: number) => {
            const deltaTime = timeStamp - lastTime;
            lastTime = timeStamp;

            context.clearRect(0, 0, canvas.width, canvas.height);
            if (gameInstance.current) {
                gameInstance.current.render(context, deltaTime);
            }
            requestRef.current = requestAnimationFrame(animate);
        };

        requestRef.current = requestAnimationFrame(animate);

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            window.removeEventListener('resize', handleResize);
            if (gameInstance.current) {
                gameInstance.current.cleanup();
                gameInstance.current = null;
            }
        };
    }, [gameState, props.selectedShip]);

    const handleSelectShip = (ship: MySpaceships) => {
        props.setSelectedShip(ship);
        setGameState('counting');
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#02020a] flex flex-col items-center justify-center overflow-hidden"
        >
            <GameBackground />

            {props.selectedShip && (
                <div className="absolute top-45 left-10 z-20 pointer-events-none">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 bg-cyan-500 rounded-full animate-ping" />
                        <span className="text-cyan-400 font-mono text-xs uppercase tracking-widest">Neural Link: Active</span>
                    </div>
                    <div className="text-cyan-500/40 font-mono text-[10px]">PILOT: {props.selectedShip.name}</div>
                </div>
            )}

            <button 
                onClick={props.handleGameOver}
                className={
                    `absolute ${gameState ===  'playing' ? 'top-20' : 'top-10'} right-5 z-60 px-4 py-2 border border-red-500/30 text-red-500 text-[10px] 
                    uppercase tracking-[0.3em] hover:bg-red-500/20 transition-all cursor-pointer bg-black/40 backdrop-blur-sm`
                }
            >
                [ Abort Mission ]
            </button>

            <AnimatePresence mode="wait">
                {gameState === 'selecting' && (
                    <motion.div 
                        key="selector"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute inset-0 z-55 flex flex-col items-center justify-center bg-black/80 backdrop-blur-xl p-10"
                    >
                        <h2 className="text-cyan-400 font-mono text-xl mb-8 tracking-[0.5em] uppercase">Select Your Craft</h2>
                        <div className="flex flex-wrap justify-center gap-6 max-w-5xl">
                            {props.mySpaceships && availableShips.map((ship, idx) => (
                                <motion.div
                                    key={idx}
                                    whileHover={{ scale: 1.05, borderColor: 'rgba(6, 182, 212, 0.5)' }}
                                    onClick={() => handleSelectShip(ship)}
                                    className="cursor-pointer bg-cyan-950/20 border border-cyan-500/20 p-4 rounded-lg flex flex-col items-center w-48 transition-colors group"
                                >
                                    <img src={ship.icon} alt={ship.name} className="w-24 h-24 object-contain mb-4 group-hover:drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
                                    <div className="text-cyan-400 font-mono text-sm mb-1">{ship.name}</div>
                                    <div className="text-cyan-500/50 font-mono text-[10px]">HP: {ship.hp} | EN: {ship.maxEnergy}</div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {gameState === 'counting' && (
                    <motion.div 
                        key="countdown"
                        exit={{ opacity: 0, scale: 2 }}
                        className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-md"
                    >
                        <CountdownTimer onComplete={() => setGameState('playing')} />
                    </motion.div>
                )}
            </AnimatePresence>

            <div className={`relative w-full h-full ${gameState !== 'playing' ? 'hidden' : 'block'}`}>
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 block cursor-crosshair z-10"
                    style={{ touchAction: 'none' }}
                />
            </div>

            <div className="pointer-events-none absolute inset-0 z-40 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,118,0.03))] bg-size-[100%_3px,3px_100%]" />
        </motion.div>
    );
};

const CountdownTimer = ({ onComplete }: { onComplete: () => void }) => {
    const [count, setCount] = useState(3);
    
    useEffect(() => {
        if (count > 0) {
            const timer = setTimeout(() => setCount(count - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            onComplete();
        }
    }, [count, onComplete]);

    return (
        <motion.div 
            key={count}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-cyan-400 text-8xl font-black italic font-mono"
        >
            {count > 0 ? count : "LAUNCH"}
        </motion.div>
    );
};

export default Canvas;