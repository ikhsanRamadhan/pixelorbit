'use client';
import { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Pagination } from "@mui/material";
import { useHashinals } from "@/components/layout/HashinalsProvider";
import { useWalletStore } from "@/components/store/wallet-store";

function LeaderboardTable({ delay }: { delay: number }) {
    const { leaderboard, totalUser } = useHashinals();
    const { accountId, isConnected } = useWalletStore();
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [page, setPage] = useState(1);
    const rowsPerPage = 15;

    const paginatedData = useMemo(() => {
        const startIndex = (page - 1) * rowsPerPage;
        return leaderboard.slice(startIndex, startIndex + rowsPerPage);
    }, [leaderboard, page]);

    const handleChangePage = (event: React.ChangeEvent<unknown>, value: number) => {
        setPage(value);
        if (tableContainerRef.current) {
            tableContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const userRank = useMemo(() => {
        if (!accountId || leaderboard.length === 0) return null;
        const index = leaderboard.findIndex(user => user.player === accountId);
        return index !== -1 ? index + 1 : null;
    }, [leaderboard, accountId]);

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay, duration: 0.8 }}
                onClick={() => setIsExpanded(true)}
                className="relative p-6 rounded-xl border border-cyan-500/20 bg-black/60 backdrop-blur-xl flex flex-col overflow-hidden transition-all duration-500 cursor-pointer hover:border-cyan-400 group h-full shadow-lg hover:shadow-cyan-500/10"
            >
                <div className="absolute inset-0 bg-linear-to-b from-transparent via-cyan-500/5 to-transparent -translate-y-full group-hover:translate-y-full transition-transform duration-2000 ease-in-out" />
                
                <div className="flex justify-between items-start mb-6 z-10">
                    <div>
                        <h3 className="text-cyan-400 font-black uppercase tracking-[0.25em] text-xs">
                            Global Rankings
                        </h3>
                        <p className="text-[9px] text-cyan-500/40 font-mono italic">Sector: Hedera_Testnet</p>
                    </div>
                    <div className="w-8 h-8 rounded border border-cyan-500/30 flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors">
                        <span className="text-cyan-400 text-xs">📊</span>
                    </div>
                </div>

                <div className="grow flex flex-col gap-4 z-10">
                    {leaderboard.slice(0, 5).map((user, idx) => {
                        const isCurrentUser = user.player === accountId;
                        
                        return (
                            <div key={idx} className="group space-y-1">
                                <div className="flex justify-between items-center text-[10px] font-mono">
                                    
                                    <div className="flex items-center gap-6 w-32">
                                        <span className={idx === 0 ? "text-yellow-400 font-bold" : "text-cyan-500/60"}>
                                            {String(idx + 1).padStart(2, '0')}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-cyan-100 group-hover:text-white transition-colors">
                                                {user.player.slice(0, 5)}...{user.player.slice(-3)}
                                            </span>
                                            {isCurrentUser && (
                                                <span className="text-[7px] bg-cyan-500 text-black px-1 font-black rounded-sm leading-tight">
                                                    YOU
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <span className="text-cyan-400 text-[9px] uppercase tracking-tighter truncate max-w-15">
                                        {user.ship}
                                    </span>

                                    <span className="text-cyan-400 font-bold tracking-tighter w-16 text-right">
                                        {user.score.toLocaleString()}
                                    </span>
                                </div>

                                <div className="w-full h-px bg-cyan-500/20 group-hover:bg-cyan-500/40 transition-colors" />
                            </div>
                        );
                    })}
                </div>

                <div className="mt-6 flex items-center justify-between z-10">
                    <div className="flex -space-x-2">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="w-4 h-4 rounded-full border border-black bg-cyan-900 flex items-center justify-center text-[6px] text-cyan-300">
                                P
                            </div>
                        ))}
                        <span className="pl-4 text-[9px] text-cyan-500/40 self-center">+{totalUser} Online</span>
                    </div>
                    <span className="text-[9px] text-cyan-500/60 font-mono group-hover:text-cyan-400 transition-colors uppercase tracking-widest">
                        Expand [↗]
                    </span>
                </div>

                <div className="absolute bottom-0 left-0 w-full h-px bg-cyan-500 opacity-20 group-hover:opacity-100 transition-opacity" />
            </motion.div>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl"
                        onClick={() => setIsExpanded(false)}
                    >
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-[#050505] border border-cyan-500/30 rounded-2xl p-6 w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl shadow-cyan-500/10"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-6 border-b border-cyan-950 pb-4 shrink-0">
                                <div>
                                    <h2 className="text-xl font-black text-cyan-400 tracking-tighter uppercase italic">
                                        PIXELORBIT Global Leaderboard
                                    </h2>
                                    <p className="text-[10px] text-cyan-500/40 font-mono">Real-time data synchronization active</p>
                                </div>
                                <button onClick={() => setIsExpanded(false)} className="text-cyan-500 hover:text-white transition-colors font-mono text-xl cursor-pointer">[X]</button>
                            </div>

                            <div ref={tableContainerRef} className="overflow-y-auto grow pr-2 custom-scrollbar font-mono text-xs">
                                <table className="w-full text-left border-separate border-spacing-y-1.5">
                                    <thead className="sticky top-0 bg-[#050505] z-10 text-[10px] text-cyan-500/50 uppercase">
                                        <tr>
                                            <th className="pb-3 pl-4">Rank</th>
                                            <th className="pb-3">Commander</th>
                                            <th className="pb-3">Ship</th>
                                            <th className="pb-3 text-right pr-4">Score</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedData.map((user, idx) => {
                                            const globalRank = (page - 1) * rowsPerPage + idx + 1;
                                            const isCurrentUser = user.player === accountId;

                                            return (
                                                <tr
                                                    key={idx}
                                                    className={`group transition-all duration-300 ${
                                                    idx % 2 === 0 
                                                        ? "bg-white/3" 
                                                        : "bg-transparent"
                                                    } hover:bg-cyan-500/10`}
                                                >
                                                    <td className="py-3 pl-4 rounded-l border-y border-l border-cyan-500/10 text-cyan-500/80">
                                                        #{globalRank}
                                                    </td>

                                                    <td className="py-3 border-y border-cyan-500/10">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-cyan-100 group-hover:text-white transition-colors">
                                                            {user.player.length > 10
                                                                ? `${user.player.slice(0, 5)}...${user.player.slice(-3)}`
                                                                : user.player}
                                                        </span>
                                                        {isCurrentUser && (
                                                            <span className="text-[7px] bg-cyan-500 text-black px-1.5 py-0.5 font-black rounded-sm leading-none animate-pulse">
                                                                YOU
                                                            </span>
                                                        )}
                                                    </div>
                                                    </td>

                                                    {/* SHIP */}
                                                    <td className="py-3 border-y border-cyan-500/10">
                                                        <span className="text-cyan-500/40 text-[9px] uppercase tracking-wider font-bold group-hover:text-cyan-300 transition-colors">
                                                            {user.ship}
                                                        </span>
                                                    </td>

                                                    {/* SCORE */}
                                                    <td className="py-3 pr-4 text-right rounded-r border-y border-r border-cyan-500/10">
                                                        <span className="text-white font-bold tracking-tighter tabular-nums">
                                                            {user.score.toLocaleString()}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-6 flex flex-col md:flex-row justify-between items-center gap-4 border-t border-cyan-950 pt-4 shrink-0">
                                <div className="text-[10px] text-cyan-400 flex flex-col items-s">
                                    {isConnected && userRank ? `CURRENT STATUS: RANKED #${userRank}` : 'CURRENT STATUS: UNRANKED'}
                                    <span className="text-[10px] text-cyan-500/40 font-mono uppercase">
                                        TOTAL PILOTS: {totalUser}
                                    </span> 
                                </div>
                                <Pagination 
                                    count={Math.ceil(leaderboard.length / rowsPerPage)} 
                                    page={page} 
                                    onChange={handleChangePage}
                                    size="small"
                                    sx={{
                                        '& .MuiPaginationItem-root': { color: '#22d3ee', borderColor: 'rgba(34,211,238,0.2)', fontSize: '10px' },
                                        '& .Mui-selected': { backgroundColor: 'rgba(34,211,238,0.1) !important' }
                                    }}
                                />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

export default LeaderboardTable;