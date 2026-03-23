"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface Star {
    id: number;
    size: number;
    x: number;
    y: number;
    duration: number;
    delay: number;
}

export default function SpaceBackground() {
    const [stars, setStars] = useState<Star[]>([]);

    useEffect(() => {
        const totalStars = 250; 
        
        const generatedStars = [...Array(totalStars)].map((_, i) => ({
            id: i,
            size: Math.random() < 0.8 ? Math.random() * 1 + 0.5 : Math.random() * 2 + 1,
            x: Math.random() * 100,
            y: Math.random() * 100,
            duration: Math.random() * 4 + 2,
            delay: Math.random() * 5,
        }));
        
        setStars(generatedStars);
    }, []);

    if (stars.length === 0) {
        return <div className="fixed inset-0 z-[-1] bg-[#02020a]" />;
    }

    return (
        <div className="fixed inset-0 z-[-1] bg-[#02020a] overflow-hidden select-none">
            {stars.map((star) => (
                <motion.div
                    key={star.id}
                    className="absolute bg-white rounded-full"
                    style={{
                        width: star.size,
                        height: star.size,
                        left: `${star.x}%`,
                        top: `${star.y}%`,
                        boxShadow: star.size > 1.5 ? "0 0 8px 1px white" : "none",
                    }}
                    animate={{
                        opacity: [0.1, 0.7, 0.1],
                        scale: star.size > 1.5 ? [1, 1.2, 1] : [1, 1, 1],
                    }}
                    transition={{
                        duration: star.duration,
                        repeat: Infinity,
                        delay: star.delay,
                        ease: "easeInOut",
                    }}
                />
            ))}
            
            <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-160 h-160 bg-purple-900/10 blur-[120px] rounded-full" />
            <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-140 h-140 bg-blue-900/10 blur-[100px] rounded-full" />
        </div>
    );
}