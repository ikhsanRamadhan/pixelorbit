export const rarityOrder: { [key: string]: number } = {
    Legendary: 1,
    Epic: 2,
    Rare: 3,
    Uncommon: 4,
    Common: 5
};

export const rarityColors: Record<string, string> = {
    Legendary: 'text-orange-500',
    Epic: 'text-purple-500',
    Rare: 'text-blue-400',
    Uncommon: 'text-green-400',
    Common: 'text-gray-400',
};

export interface item {
    name: string;
    image: string;
    rarity: string;
    metadata: string;
};

export interface ItemDropData extends item {
    dropRate: number;
};

export interface CollectedItem {
    id: number;
    name: string;
    image: HTMLImageElement;
    rarity: string;
    collected: boolean;
    metadata: string;
};

export interface Items {
    serialNumber: number;
    owner: string;
    name: string;
    rarity: keyof typeof rarityOrder;
    image: string;
    metadata: string;
};

export interface ListItem extends item {
    serialNumber: number;
    seller: string;
    price: number;
    isActive: boolean;
    allowBids: boolean;
    highestBid: number;
    highestBidder: string;
    endTime: number;
};

// Create an array of items
const items = [
    { 
        name: 'Base', 
        image: 'https://amethyst-implicit-silkworm-944.mypinata.cloud/ipfs/QmcreEXpatXqcc54b8NzARJyqmkzxW1RmMBvQ7jYvL9yaz', 
        metadata: 'https://amethyst-implicit-silkworm-944.mypinata.cloud/ipfs/bafkreiaz4svrta5ce3vnh3zrjir5ch72ihyuat2w2s75a5hjepvt2xzzvi', 
        rarity: 'Common', 
        dropRate: 20 
    },
    { 
        name: 'Burst', 
        image: 'https://amethyst-implicit-silkworm-944.mypinata.cloud/ipfs/Qmcm3gcExwoFnA4VGifqP6MUE8JijnayddXeDhSvtboWJ7', 
        metadata: 'https://amethyst-implicit-silkworm-944.mypinata.cloud/ipfs/bafkreialnbt5q22vqojdb636i5mitwi453q6srmzmtnbwmkqx4w7lfxija', 
        rarity: 'Common', 
        dropRate: 20 
    },
    { 
        name: 'Supercharged', 
        image: 'https://amethyst-implicit-silkworm-944.mypinata.cloud/ipfs/QmNV2qPchjt7UZM3fVHtdQpGm5cyLyCUzDpZnNDEzyUi9v', 
        metadata: 'https://amethyst-implicit-silkworm-944.mypinata.cloud/ipfs/bafkreia3twdchykf64lcc5xktzb4lovhxhc3nvscg7cbqdzxzpg7jkj4qq', 
        rarity: 'Common', 
        dropRate: 20 
    },
    { 
        name: 'Big Pulse', 
        image: 'https://amethyst-implicit-silkworm-944.mypinata.cloud/ipfs/QmXKvqAigvN9CYQJLiFiUSoskXR4KTYCBS5Z6i5PiPftVv', 
        metadata: 'https://amethyst-implicit-silkworm-944.mypinata.cloud/ipfs/bafkreib7wfsgfathtmqkpb5yh3x5hg2gmqoc2mflqs7kxopfv32zkiqlru', 
        rarity: 'Common', 
        dropRate: 20 
    },
    { 
        name: 'Front Shield', 
        image: 'https://amethyst-implicit-silkworm-944.mypinata.cloud/ipfs/QmRdWGGLjY6KtPR8u4b2YVSQC5n9cYK2bqL1jeLPaZjcZ4', 
        metadata: 'https://amethyst-implicit-silkworm-944.mypinata.cloud/ipfs/bafkreiaff6bns6uyo5kze55sxdeycae72b5jn27x52ea6u353jt7hpzqwa', 
        rarity: 'Common', 
        dropRate: 20 
    },
    { 
        name: 'Side Shield', 
        image: 'https://amethyst-implicit-silkworm-944.mypinata.cloud/ipfs/QmQkAQ5jU6K2K5aYNFdhjnxPNFs9Kohe84GhHdGzRWQFWB', 
        metadata: 'https://amethyst-implicit-silkworm-944.mypinata.cloud/ipfs/bafkreicbnsm2ovdxio4g3oya3brbp3nr7w6timbkmggcquyl2r4jonpufi', 
        rarity: 'Uncommon', 
        dropRate: 12 
    },
    { 
        name: 'Shield', 
        image: 'https://amethyst-implicit-silkworm-944.mypinata.cloud/ipfs/QmQFvpkKCPC1NyeutqvkEZU45XRcB5k1C1KJb7f3zpo2YD', 
        metadata: 'https://amethyst-implicit-silkworm-944.mypinata.cloud/ipfs/bafkreib2ipqubvq2zxxuvpn6oyaa3rphwd7ouuxl327irczwvb55npd6om', 
        rarity: 'Uncommon', 
        dropRate: 12 
    },
    { 
        name: 'Stars', 
        image: 'https://amethyst-implicit-silkworm-944.mypinata.cloud/ipfs/QmW3z6CFtd7xTro6qX3JDbJVUmFc3Q9FfnV6nTvHepG81V', 
        metadata: 'https://amethyst-implicit-silkworm-944.mypinata.cloud/ipfs/bafkreia5ba3xmpgykmwlflvvonrkmh2sijjsidqiwdpolw5imupgvt4wme', 
        rarity: 'Uncommon', 
        dropRate: 12 
    },
    { 
        name: 'Rocket', 
        image: 'https://amethyst-implicit-silkworm-944.mypinata.cloud/ipfs/QmQSdBAf4czpaEtRjTsGTPbH9uSYiKXaXbV9FiC2kFP56J', 
        metadata: 'https://amethyst-implicit-silkworm-944.mypinata.cloud/ipfs/bafkreienmjege32r6ts2l3nozalb2v2il4wak6x7jnrwzqpkqxx7cuamnq', 
        rarity: 'Rare', 
        dropRate: 6 
    },
    { 
        name: 'Auto Cannons', 
        image: 'https://amethyst-implicit-silkworm-944.mypinata.cloud/ipfs/QmQZxdMogqxCMnyHN4zdhzGj7LLrkxM2stTr859YfB8Shg', 
        metadata: 'https://amethyst-implicit-silkworm-944.mypinata.cloud/ipfs/bafkreih65erlgv6kp2z2z6civgokaj7f6e4s43ph4cmvijcq22gsowpx4u', 
        rarity: 'Rare', 
        dropRate: 6 
    },
    { 
        name: 'Space Gun 2000', 
        image: 'https://amethyst-implicit-silkworm-944.mypinata.cloud/ipfs/QmcsJXFjtAH3NrjJWaYcn9RBTqHsMMax5zd9hrfpp1ByQd', 
        metadata: 'https://amethyst-implicit-silkworm-944.mypinata.cloud/ipfs/bafkreiefsxeolasng6gh7ioy2swiqlm3iqbbqjj4iurd2vnjftarcpgszy', 
        rarity: 'Epic', 
        dropRate: 4 
    },
    { 
        name: 'Zapper', 
        image: 'https://amethyst-implicit-silkworm-944.mypinata.cloud/ipfs/QmQAJQFi5BVcvsq2XoJ7GAg9HzpV3oUz3BDBXy8V34LFrC', 
        metadata: 'https://amethyst-implicit-silkworm-944.mypinata.cloud/ipfs/bafkreig2kgnzbf3opbledvuqptv6tc6o7iyld4wqwx6ekqi3i2dkjj6tly', 
        rarity: 'Legendary', 
        dropRate: 2 
    },
];

export default items;
