"use client";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface Star {
    id: number;
    size: number;
    x: number;
    fallDuration: number;
    blinkDuration: number;
    delay: number;
};

export default function GameBackground() {
    const [stars, setStars] = useState<Star[]>([]);

    useEffect(() => {
        const generatedStars: Star[] = [...Array(150)].map((_, i) => ({
            id: i,
            size: Math.random() * 2 + 0.5,
            x: Math.random() * 100,
            fallDuration: Math.random() * 10 + 5,
            blinkDuration: Math.random() * 3 + 1,
            delay: Math.random() * -20,
        }));
        setStars(generatedStars);
    }, []);

    return (
        <div className="fixed inset-0 z-[-1] bg-[#02020a] overflow-hidden">
            {stars.map((star: Star) => (
                <motion.div
                    key={star.id}
                    className="absolute bg-white rounded-full"
                    style={{
                        width: star.size,
                        height: star.size,
                        left: `${star.x}%`,
                        boxShadow: star.size > 1.5 ? "0 0 5px white" : "none",
                    }}
                    animate={{
                        top: ["-5%", "105%"],
                        opacity: [0.2, 0.8, 0.2],
                    }}
                    transition={{
                        top: {
                            duration: star.fallDuration,
                            repeat: Infinity,
                            ease: "linear",
                            delay: star.delay
                        },
                        opacity: {
                            duration: star.blinkDuration,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }
                    }}
                />
            ))}
            <div className="absolute inset-0 bg-linear-to-b from-transparent via-purple-900/5 to-black/20" />
        </div>
    );
}