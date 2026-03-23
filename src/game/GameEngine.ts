import { Dispatch, SetStateAction } from "react";
import { CollectedItem, item, ItemDropData } from "@/components/utils/Items";
import { MySpaceships } from "@/components/utils/Spaceships";
import { BossData, AlienData, NextImageObject } from "@/components/utils/Enemy";

export interface Position {
    x: number;
    y: number;
};

// Interface for particle
export interface ParticleOptions {
    position: Position;
    velocity: { x: number; y: number };
    radius: number;
    color: string;
    fades: boolean;
};

// Interface for game
interface IGame {
    height: number;
    width: number;
    columns: number;
    rows: number;
    keys: string[];
    score: number;
    gameOver: boolean;
    enemySize: number;
    spriteUpdate: boolean;
    bossLives: number;
    items: Item[];
    player: {
        x: number;
        y: number;
        width: number;
        height: number;
        energy: number;
        cooldown: boolean;
        frameX: number;
        lives: number;
        maxLives: number;
        draw: (context: CanvasRenderingContext2D, ship?: MySpaceships) => void;
        collectItem: (item: IItem, setCollectedItems?: Dispatch<SetStateAction<CollectedItem[]>>) => void;
    };
    waves: Array<{ enemies: IEnemy[] }>;
    bossArray: IBoss[];
    bossProjectiles: BossProjectile[];
    projectilesPool: Projectile[];
    enemyProjectiles: EnemyProjectile[];
    checkCollision: (a: Collidable, b: Collidable) => boolean; 
    getProjectile: () => Projectile | null;
    chooseItemByDropRate: (bossName: string) => any;
    newWave: () => void;
    createParticles: (options: { object: Collidable; color: string; fades: boolean }) => void;
};

interface IEnemy {
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    hit: (damage: number) => void;
};

interface IBoss {
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    hit: (damage: number) => void;
};

// Separate interface for item
interface IItem {
    image: HTMLImageElement;
    name: string;
    rarity: string;
    metadata: string;
};

// Declare global variable
const setScores = (score: number) => (window as any).__gameSetScores?.(score);
const setHp = (hp: number) => (window as any).__gameSetHp?.(hp);
const setCollectedItems: Dispatch<SetStateAction<CollectedItem[]>> = 
    (value) => (window as any).__gameSetCollectedItems?.(value);
declare const canvas: HTMLCanvasElement;
declare const context: CanvasRenderingContext2D;
const getAliens = (): AlienData[] => (window as any).__gameAliens ?? [];
const getBosses = (): BossData[] => (window as any).__gameBosses ?? [];
const getItems = (): ItemDropData[] => (window as any).__gameItems ?? [];

// Interface for checkCollision
interface Collidable {
    x: number;
    y: number;
    width: number;
    height: number;
};

// Type for createParticles
type CreateParticlesFn = (options: { object: IEnemy | IBoss; color: string; fades: boolean }) => void;

// Global cache for image
const imageCache: Map<string, HTMLImageElement> = new Map();

function loadImage(src: string | NextImageObject): HTMLImageElement {
    const srcString = typeof src === "string" ? src : src.src;

    if (imageCache.has(srcString)) {
        return imageCache.get(srcString)!;
    }

    const img = new Image();
    img.src = srcString;
    imageCache.set(srcString, img);
    return img;
};

class Laser {
    protected game: IGame;
    x: number = 0;
    y: number = 0;
    width: number;
    height: number;
    damage: number;
    colorInside: string;
    colorOutside: string;
    private createParticles: CreateParticlesFn;

    constructor(
        game: IGame,
        width: number,
        damage: number,
        colorInside: string,
        colorOutside: string,
        createParticles: CreateParticlesFn
    ) {
        this.game = game;
        this.x = 0;
        this.y = 0;
        this.height = this.game.height - 50;
        this.width = width;
        this.damage = damage;
        this.colorInside = colorInside;
        this.colorOutside = colorOutside;
        this.createParticles = createParticles;
    }

    render(context: CanvasRenderingContext2D): void {
        this.x = this.game.player.x + this.game.player.width / 2 - this.width / 2;

        this.game.player.energy -= this.damage;

        context.save();
        context.fillStyle = this.colorInside;
        context.fillRect(this.x, this.y, this.width, this.height);
        context.fillStyle = this.colorOutside;
        context.fillRect(this.x + this.width * 0.2, this.y, this.width * 0.6, this.height);
        context.restore();

        if (this.game.spriteUpdate) {
            this.game.waves.forEach((wave) => {
                wave.enemies.forEach((enemy: IEnemy) => {
                    if (this.game.checkCollision(enemy, this)) {
                        enemy.hit(this.damage);
                        this.createParticles({
                            object: enemy,
                            color: enemy.color,
                            fades: true
                        });
                    }
                });
            });

            this.game.bossArray.forEach((boss: IBoss) => {
                if (this.game.checkCollision(boss, this)) {
                    boss.hit(this.damage);
                    this.createParticles({
                        object: boss,
                        color: boss.color,
                        fades: true
                    });
                }
            });
        }
    }
}

export class LaserConfig extends Laser {
    constructor(
        game: IGame,
        width: number,
        damage: number,
        colorInside: string,
        colorOutside: string,
        createParticles: CreateParticlesFn
    ) {
        super(game, width, damage, colorInside, colorOutside, createParticles);
    }

    render(context: CanvasRenderingContext2D): void {
        if (this.game.player.energy > 1 && !this.game.player.cooldown) {
            super.render(context);
        }
    }
}

export class Player {
    private game: IGame;
    width: number;
    height: number;
    x: number;
    y: number;
    speed: number;
    energy: number;
    maxEnergy: number;
    lives: number;
    maxLives: number;
    laser: LaserConfig | null = null;
    cooldown: boolean;
    collectedItems: CollectedItem[];
    itemCounter: number;
    widthPos: number;
    heightPos: number;
    frameX: number;
    maxFrame: number;
    image: HTMLImageElement;

    constructor(game: IGame, ship: MySpaceships) {
        this.game = game;
        this.width = ship.width;
        this.height = ship.height;
        this.x = this.game.width / 2 - this.width / 2;
        this.y = this.game.height - this.height;
        this.speed = 5;
        this.lives = ship.hp;
        this.maxLives = ship.hp;
        this.image = new Image();
        this.image.src = ship.images;
        this.widthPos = 256;
        this.heightPos = 256;
        this.frameX = 1;
        this.maxFrame = ship.maxFrame;
        this.energy = 25;
        this.maxEnergy = ship.maxEnergy;
        this.cooldown = false;
        this.collectedItems = [];
        this.itemCounter = 1;
    }

    draw(context: CanvasRenderingContext2D, ship?: MySpaceships): void {
        if (ship && this.game.keys.indexOf("Control") > -1) {
            if (!this.laser) {
                this.laser = new LaserConfig(
                    this.game,
                    ship.laserWidth,
                    ship.laserDamage,
                    ship.laserColor,
                    "white",
                    this.game.createParticles.bind(this.game)
                );
            }
            this.laser.render(context);
        } else {
            this.laser = null;
        }
    
        if (!this.image.complete || this.image.naturalWidth === 0) return;
        context.drawImage(
            this.image,
            this.frameX * this.widthPos, 0,
            this.widthPos, this.heightPos,
            this.x, this.y,
            this.width, this.height
        );
    }

    update(ship: MySpaceships): void {
        if (this.game.spriteUpdate && this.lives >= 1) {
            this.frameX = 0;
        }

        // Energy regen
        if (this.energy < this.maxEnergy) {
            this.energy = this.energy + (ship.energyRegen * 0.1);
        }

        if (this.energy < 1) {
            this.cooldown = true;
        } else if (this.energy > this.maxEnergy * 0.2) {
            this.cooldown = false;
        }

        // Movement
        if (this.game.keys.indexOf("ArrowLeft") > -1) {
            this.x -= this.speed;
        }

        if (this.game.keys.indexOf("ArrowRight") > -1) {
            this.x += this.speed;
        }

        // Boundaries
        if (this.x < 0) {
            this.x = 0;
        } else if (this.x > this.game.width - this.width) {
            this.x = this.game.width - this.width;
        }
    }

    shoot(ship: MySpaceships): void {
        if (ship.bullet === 2) {
            const projectile1 = this.game.getProjectile();
            const projectile2 = this.game.getProjectile();
            if (projectile1 && projectile2) {
                projectile1.start(this.x + this.width * 0.45, this.y + 30);
                projectile2.start(this.x + this.width * 0.65, this.y + 30);
            }
        } else if (ship.bullet === 3) {
            const projectile1 = this.game.getProjectile();
            const projectile2 = this.game.getProjectile();
            const projectile3 = this.game.getProjectile();
            if (projectile1 && projectile2 && projectile3) {
                projectile1.start(this.x + this.width * 0.30, this.y + 30);
                projectile2.start(this.x + this.width * 0.55, this.y + 30);
                projectile3.start(this.x + this.width * 0.80, this.y + 30);
            }
        } else {
            const projectile = this.game.getProjectile();
            if (projectile) {
                projectile.start(this.x + this.width * 0.55, this.y + 30);
            }
        }
    }

    collectItem(item: IItem, manualSetter?: Dispatch<SetStateAction<CollectedItem[]>>): void {
        const newItem: CollectedItem = {
            id: this.itemCounter++,
            name: item.name,
            image: item.image,
            rarity: item.rarity,
            metadata: item.metadata || '',
            collected: false,
        };
        this.game.score += 50;
        setScores(this.game.score);
        this.collectedItems.push(newItem);
    
        const setter = manualSetter || (window as any).__gameSetCollectedItems;
    
        if (setter) {
            setter((prev: CollectedItem[]) => [...prev, newItem]);
        }
    }
    restart(ship: MySpaceships, setCollectedItems: Dispatch<SetStateAction<CollectedItem[]>>): void {
        this.x = this.game.width / 2 - this.width / 2;
        this.y = this.game.height - this.height;
        this.lives = ship.hp;
        this.collectedItems = [];
        this.laser = null;
        setCollectedItems([]);
    }
}         

export class Particle {
    position: Position;
    velocity: { x: number; y: number };
    radius: number;
    color: string;
    fades: boolean;
    opacity: number;

    constructor({ position, velocity, radius, color, fades }: ParticleOptions) {
        this.position = position;
        this.velocity = velocity;
        this.radius = radius;
        this.color = color;
        this.opacity = 1;
        this.fades = fades;
    }

    draw(context: CanvasRenderingContext2D): void {
        context.save();
        context.globalAlpha = this.opacity;
        context.beginPath();
        context.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
        context.fillStyle = this.color;
        context.fill();
        context.closePath();
        context.restore();
    }

    update(): void {
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;

        if (this.fades) {
            this.opacity -= 0.01;
        }
    }
}

export class Projectile {
    width: number;
    height: number;
    x: number;
    y: number;
    speed: number;
    free: boolean;
    radius: number;

    constructor() {
        this.width = 10;
        this.height = 10;
        this.x = 0;
        this.y = 0;
        this.speed = 10;
        this.free = true;
        this.radius = 4;
    }

    start(x: number, y: number): void {
        this.x = x - this.width / 2;
        this.y = y;
        this.free = false;
    }

    reset(): void {
        this.free = true;
    }

    draw(context: CanvasRenderingContext2D, ship: MySpaceships): void {
        if (!this.free) {
            context.save();
            context.beginPath();
            context.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            context.fillStyle = ship.laserColor;
            context.fill();
            context.closePath();
            context.restore();
        }
    }

    update(): void {
        if (!this.free) {
            this.y -= this.speed;

            if (this.y < -this.height) {
                this.reset();
            }
        }
    }
}

export class EnemyProjectile {
    position: Position;
    velocity: Position;
    width: number;
    height: number;

    constructor({ position, velocity }: { position: Position; velocity: Position }) {
        this.position = position;
        this.velocity = velocity;
        this.width = 3;
        this.height = 10;
    }

    draw(context: CanvasRenderingContext2D): void {
        context.save();
        context.fillStyle = "red";
        context.fillRect(this.position.x, this.position.y, this.width, this.height);
        context.restore();
    }

    update(): void {
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
    }
}

export class BossProjectile {
    position: Position;
    velocity: Position;
    width: number;
    height: number;

    constructor({ position, velocity }: { position: Position; velocity: Position }) {
        this.position = position;
        this.velocity = velocity;
        this.width = 8;
        this.height = 10;
    }

    draw(context: CanvasRenderingContext2D): void {
        context.save();
        context.fillStyle = "red";
        context.beginPath();
        context.arc(
            this.position.x + this.width / 2,
            this.position.y + this.height / 2,
            Math.min(this.width, this.height) / 2,
            0,
            Math.PI * 2
        );
        context.closePath();
        context.fill();
        context.restore();
    }

    update(): void {
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
    }
}

export class Enemy {
    protected game: IGame;
    width: number;
    height: number;
    x: number;
    y: number;
    positionX: number;
    positionY: number;
    frameX: number;
    widthPos: number;
    heightPos: number;
    markedForDeletion: boolean;
    lives: number;
    image: HTMLImageElement;
    color: string;
    maxFrame: number;
    maxLives: number;

    constructor(game: IGame, positionX: number, positionY: number) {
        this.game = game;
        this.width = this.game.enemySize;
        this.height = this.game.enemySize;
        this.x = 0;
        this.y = 0;
        this.positionX = positionX;
        this.positionY = positionY;
        this.frameX = 1;
        this.widthPos = 256;
        this.heightPos = 256;
        this.markedForDeletion = false;

        // Default values
        this.lives = 1;
        this.maxLives = 1;
        this.image = new Image();
        this.color = "white";
        this.maxFrame = 5;
    }

    draw(context: CanvasRenderingContext2D): void {
        if (!this.image.complete || this.image.naturalWidth === 0) return;
        context.drawImage(
            this.image,
            this.frameX * this.widthPos, 0,
            this.widthPos, this.heightPos,
            this.x, this.y,
            this.width, this.height
        );
    }    

    update(x: number, y: number, context: CanvasRenderingContext2D): void {
        if (this.game.spriteUpdate && this.lives >= 1) {
            this.frameX = 0;
        }

        this.x = x + this.positionX;
        this.y = y + this.positionY;

        // Check collision enemies - projectiles
        this.game.projectilesPool.forEach((projectile: Projectile) => {
            if (!projectile.free && this.game.checkCollision(this, projectile)) {
                this.hit(1);
                projectile.reset();
                this.game.createParticles({
                    object: this,
                    color: this.color,
                    fades: true
                });
            }
        });

        // Check enemy destroyed
        if (this.lives < 1 && this.game.spriteUpdate) {
            this.frameX++;
            if (this.frameX > this.maxFrame) {
                this.markedForDeletion = true;
                this.game.score += this.maxLives * 10;
                setScores(this.game.score);
            }
        }

        // Check collision enemy bullets - player
        this.game.enemyProjectiles.forEach((enemyProjectile: EnemyProjectile, index: number) => {
            if (
                enemyProjectile.position.y + enemyProjectile.height >= this.game.player.y &&
                enemyProjectile.position.x + enemyProjectile.width >= this.game.player.x &&
                enemyProjectile.position.x <= this.game.player.x + this.game.player.width
            ) {
                this.game.enemyProjectiles.splice(index, 1);
                this.game.player.lives -= 1;

                this.game.createParticles({
                    object: this.game.player,
                    color: "white",
                    fades: true
                });

                this.game.player.frameX = 1;
                this.game.player.draw(context);

                if (this.game.player.lives < 1) {
                    this.game.gameOver = true;
                }
            }
        });

        // Check collision enemies - player
        if (this.game.checkCollision(this, this.game.player)) {
            this.frameX++;
            if (this.frameX > this.maxFrame) {
                this.markedForDeletion = true;
            }

            this.game.player.lives -= this.lives;

            this.game.createParticles({
                object: this.game.player,
                color: "white",
                fades: true
            });

            this.game.player.frameX = 1;
            this.game.player.draw(context);

            if (this.game.player.lives < 1) {
                this.game.gameOver = true;
            }
        }
    }

    shoot(enemyProjectiles: EnemyProjectile[]): void {
        enemyProjectiles.push(new EnemyProjectile({
            position: {
                x: this.x + this.width / 2,
                y: this.y + this.height
            },
            velocity: {
                x: 0,
                y: 5
            }
        }));
    }

    hit(damage: number): void {
        this.lives -= damage;
        if (this.lives >= 1) {
            this.frameX = 1;
        }
    }
}

class Alien1 extends Enemy {
    constructor(game: IGame, positionX: number, positionY: number) {
        super(game, positionX, positionY);
        const aliens = getAliens();
        this.image = new Image();
        this.image = loadImage(aliens[0].image);
        this.lives = aliens[0].hp;
        this.maxLives = this.lives;
        this.color = aliens[0].color;
        this.maxFrame = aliens[0].maxFrame;
    }
}

class Alien2 extends Enemy {
    constructor(game: IGame, positionX: number, positionY: number) {
        super(game, positionX, positionY);
        const aliens = getAliens(); 
        this.image = new Image();
        this.image = loadImage(aliens[1].image);
        this.lives = aliens[1].hp;
        this.maxLives = this.lives;
        this.color = aliens[1].color;
        this.maxFrame = aliens[1].maxFrame;
    }
}

class Alien3 extends Enemy {
    constructor(game: IGame, positionX: number, positionY: number) {
        super(game, positionX, positionY);
        const aliens = getAliens(); 
        this.image = new Image();
        this.image = loadImage(aliens[2].image);
        this.lives = aliens[2].hp;
        this.maxLives = this.lives;
        this.color = aliens[2].color;
        this.maxFrame = aliens[2].maxFrame;
    }
}

class Alien4 extends Enemy {
    constructor(game: IGame, positionX: number, positionY: number) {
        super(game, positionX, positionY);
        const aliens = getAliens(); 
        this.image = new Image();
        this.image = loadImage(aliens[3].image);
        this.lives = aliens[3].hp;
        this.maxLives = this.lives;
        this.color = aliens[3].color;
        this.maxFrame = aliens[3].maxFrame;
    }
}

class Alien5 extends Enemy {
    constructor(game: IGame, positionX: number, positionY: number) {
        super(game, positionX, positionY);
        const aliens = getAliens(); 
        this.image = new Image();
        this.image = loadImage(aliens[4].image);
        this.lives = aliens[4].hp;
        this.maxLives = this.lives;
        this.color = aliens[4].color;
        this.maxFrame = aliens[4].maxFrame;
    }
}

class Alien6 extends Enemy {
    constructor(game: IGame, positionX: number, positionY: number) {
        super(game, positionX, positionY);
        const aliens = getAliens(); 
        this.image = new Image();
        this.image = loadImage(aliens[5].image);
        this.lives = aliens[5].hp;
        this.maxLives = this.lives;
        this.color = aliens[5].color;
        this.maxFrame = aliens[5].maxFrame;
    }
}

class Boss {
    protected game: IGame;
    width: number;
    height: number;
    x: number;
    y: number;
    speedX: number;
    speedY: number;
    markedForDeletion: boolean;
    frameX: number;
    lives: number;
    maxLives: number;
    maxFrame: number;
    color: string;
    image: HTMLImageElement;
    widthPos: number;
    heightPos: number;
    name: string;

    constructor(game: IGame, bossLives: number) {
        this.game = game;
        this.width = 140;
        this.height = 140;
        this.x = this.game.width / 2 - this.width / 2;
        this.y = -this.height;
        this.speedX = Math.random() < 0.5 ? -1 : 1;
        this.speedY = 0;
        this.markedForDeletion = false;
        this.frameX = 1;
        this.lives = bossLives;
        this.maxLives = this.lives;
        this.maxFrame = 13;
        this.color = "#000";
        this.image = new Image();
        this.widthPos = 140;
        this.heightPos = 140;
        this.name = "";
    }

    draw(context: CanvasRenderingContext2D): void {
        if (!this.image.complete || this.image.naturalWidth === 0) return;
        context.drawImage(
            this.image,
            this.frameX * this.widthPos, 0,
            this.widthPos, this.heightPos,
            this.x, this.y,
            this.width, this.height
        );

        if (this.lives >= 1) {
            context.save();
            context.textAlign = "center";
            context.font = "20px Arial";
            context.shadowOffsetX = 3;
            context.shadowOffsetY = 3;
            context.shadowColor = "black";
            context.fillText(Math.floor(this.lives).toString(), this.x + this.width / 2, this.y + 40);
            context.restore();
        }
    }

    update(context: CanvasRenderingContext2D): void {
        this.speedY = 0;

        if (this.game.spriteUpdate && this.lives >= 1) {
            this.frameX = 0;
        }

        if (this.y < 0) {
            this.y += 4;
        }

        if ((this.x < 0 || this.x > this.game.width - this.width) && this.lives >= 1) {
            this.speedX *= -1;
            this.speedY = this.height / 4;
        }

        this.x += this.speedX;
        this.y += this.speedY;

        // Collision detection boss - projectile
        this.game.projectilesPool.forEach((projectile: Projectile) => {
            if (this.game.checkCollision(this, projectile) && !projectile.free && this.lives >= 1 && this.y >= 0) {
                this.hit(1);
                projectile.reset();
                this.game.createParticles({
                    object: this,
                    color: this.color,
                    fades: true
                });
            }
        });

        // Check collision boss bullets - player
        this.game.bossProjectiles.forEach((bossProjectile: BossProjectile, index: number) => {
            if (
                bossProjectile.position.y + bossProjectile.height >= this.game.player.y &&
                bossProjectile.position.x + bossProjectile.width >= this.game.player.x &&
                bossProjectile.position.x <= this.game.player.x + this.game.player.width
            ) {
                this.game.bossProjectiles.splice(index, 1);
                this.game.player.lives -= 1;

                this.game.createParticles({
                    object: this.game.player,
                    color: "white",
                    fades: true
                });

                this.game.player.frameX = 1;
                this.game.player.draw(context);

                if (this.game.player.lives < 1) {
                    this.game.gameOver = true;
                }
            }
        });

        // Collision detection boss - player
        if (this.game.checkCollision(this, this.game.player) && this.lives >= 1) {
            this.frameX++;
            if (this.frameX > this.maxFrame) {
                this.markedForDeletion = true;
            }

            this.game.player.lives -= this.lives;

            this.game.createParticles({
                object: this.game.player,
                color: "white",
                fades: true
            });

            this.game.player.frameX = 1;
            this.game.player.draw(context);

            if (this.game.player.lives < 1) {
                this.game.gameOver = true;
            }
        }

        // Boss destroyed
        if (this.lives < 1 && this.game.spriteUpdate) {
            this.frameX++;

            if (this.frameX > this.maxFrame) {
                this.markedForDeletion = true;
                this.game.score += this.maxLives * 10;
                this.game.bossLives += 10;
                setScores(this.game.score);

                if (this.game.player.lives < this.game.player.maxLives) {
                    this.game.player.lives++;
                }

                // Drop an item
                const droppedItemData = this.game.chooseItemByDropRate(this.name);
                const droppedItem = new Item(this.game, this.x + this.width / 2, this.y + this.height / 2, droppedItemData);
                this.game.items.push(droppedItem);

                if (!this.game.gameOver) {
                    this.game.newWave();
                }
            }
        }
    }

    shoot(bossProjectiles: BossProjectile[]): void {
        const randomValue = Math.random();

        if (this.name === "Boss3") {
            if (randomValue < 0.7) {
                this.createProjectiles(bossProjectiles, this.width / 4, 45, 4);
            } else {
                this.createProjectiles(bossProjectiles, this.width / 6, 35, 6);
            }
        } else if (this.name === "Boss2") {
            if (randomValue < 0.7) {
                this.createProjectiles(bossProjectiles, this.width / 3, 50, 3);
            } else {
                this.createProjectiles(bossProjectiles, this.width / 5, 40, 5);
            }
        } else {
            if (randomValue < 0.7) {
                this.createProjectiles(bossProjectiles, this.width / 2, 55, 2);
            } else {
                this.createProjectiles(bossProjectiles, this.width / 4, 45, 4);
            }
        }
    }

    createProjectiles(
        bossProjectiles: BossProjectile[],
        positionFactor: number,
        offset: number,
        count: number
    ): void {
        for (let i = 0; i < count; i++) {
            let velocity: Position = { x: 0, y: 5 };

            if (count >= 3) {
                const angle = 30 * (Math.PI / 180);
                if (i === 0 || (count === 5 && i === 1) || (count === 6 && i <= 1)) {
                    velocity = { x: -5 * Math.sin(angle), y: 5 * Math.cos(angle) };
                } else if (i === count - 1 || (count === 5 && i === count - 2) || (count === 6 && i >= count - 2)) {
                    velocity = { x: 5 * Math.sin(angle), y: 5 * Math.cos(angle) };
                }
            }

            bossProjectiles.push(new BossProjectile({
                position: {
                    x: this.x + positionFactor - offset + (i * offset),
                    y: this.y + this.height
                },
                velocity
            }));
        }
    }

    hit(damage: number): void {
        this.lives -= damage;
        if (this.lives >= 1) {
            this.frameX = 1;
        }
    }
}

class Boss1 extends Boss {
    constructor(game: IGame, bossLives: number) {
        super(game, bossLives);
        const bosses = getBosses();
        this.name = bosses[0].name;
        this.width = bosses[0].width;
        this.height = bosses[0].height;
        this.widthPos = bosses[0].widthPos;
        this.heightPos = bosses[0].heightPos;
        this.image = new Image();
        this.image = loadImage(bosses[0].image);
        this.color = bosses[0].color;
        this.maxFrame = bosses[0].maxFrame;
    }
}

class Boss2 extends Boss {
    constructor(game: IGame, bossLives: number) {
        super(game, bossLives);
        const bosses = getBosses();
        this.name = bosses[1].name;
        this.width = bosses[1].width;
        this.height = bosses[1].height;
        this.widthPos = bosses[1].widthPos;
        this.heightPos = bosses[1].heightPos;
        this.image = new Image();
        this.image = loadImage(bosses[1].image);
        this.color = bosses[1].color;
        this.maxFrame = bosses[1].maxFrame;
    }
}

class Boss3 extends Boss {
    constructor(game: IGame, bossLives: number) {
        super(game, bossLives);
        const bosses = getBosses();
        this.name = bosses[2].name;
        this.width = bosses[2].width;
        this.height = bosses[2].height;
        this.widthPos = bosses[2].widthPos;
        this.heightPos = bosses[2].heightPos;
        this.image = new Image();
        this.image = loadImage(bosses[2].image);
        this.color = bosses[2].color;
        this.maxFrame = bosses[2].maxFrame;
    }
}

class Item {
    private game: IGame;
    width: number;
    height: number;
    x: number;
    y: number;
    image: HTMLImageElement;
    name: string;
    rarity: string;
    metadata: string;
    speed: number;
    markedForDeletion: boolean;

    constructor(game: IGame, x: number, y: number, itemData: item) {
        this.game = game;
        this.width = 30;
        this.height = 30;
        this.x = x;
        this.y = y;
        this.image = new Image();
        this.image.src = itemData.image;
        this.name = itemData.name;
        this.rarity = itemData.rarity;
        this.metadata = itemData.metadata;
        this.speed = 2;
        this.markedForDeletion = false;
    }

    update(): void {
        this.y += this.speed;

        if (this.y > this.game.height) {
            this.markedForDeletion = true;
        }

        // Check collision with the player
        if (this.game.checkCollision(this, this.game.player)) {
            this.markedForDeletion = true;
            const setter = (window as any).__gameSetCollectedItems;
            this.game.player.collectItem(this, setter);
        }
    }

    draw(context: CanvasRenderingContext2D): void {
        context.drawImage(this.image, this.x, this.y, this.width, this.height);
    }
}

class Wave {
    private game: IGame;
    width: number;
    height: number;
    x: number;
    y: number;
    speedX: number;
    speedY: number;
    enemies: Enemy[];
    nextWaveTrigger: boolean;
    markedForDeletion: boolean;

    constructor(game: IGame) {
        this.game = game;
        this.width = this.game.columns * this.game.enemySize;
        this.height = this.game.rows * this.game.enemySize;
        this.x = this.game.width / 2 - this.width / 2;
        this.y = -this.height;
        this.speedX = (Math.random() < 0.5 ? -1 : 1) * 0.5;
        this.speedY = 0;
        this.enemies = [];
        this.nextWaveTrigger = false;
        this.markedForDeletion = false;
        this.create();
    }

    render(context: CanvasRenderingContext2D): void {
        if (this.y < 0) {
            this.y += 5;
        }

        this.speedY = 0;
        this.x += this.speedX;

        if (this.x < 0 || this.x > this.game.width - this.width) {
            this.speedX *= -1;
            this.speedY = this.game.enemySize / 4;
        }

        this.x += this.speedX;
        this.y += this.speedY;


        this.enemies.forEach((enemy: Enemy) => {
            enemy.update(this.x, this.y, context);
            enemy.draw(context);
        
            // Only shoot if the enemy is alive and has entered the screen
            if (enemy.lives >= 1 && enemy.y > 0 && Math.random() < 0.0002) {
                enemy.shoot(this.game.enemyProjectiles);
            }
        });

        this.enemies = this.enemies.filter((enemy: Enemy) => !enemy.markedForDeletion);

        if (this.enemies.length <= 0) {
            this.markedForDeletion = true;
        }
    }

    create(): void {
        for (let y = 0; y < this.game.rows; y++) {
            for (let x = 0; x < this.game.columns; x++) {
                const enemyX = x * this.game.enemySize;
                const enemyY = y * this.game.enemySize;

                const alienTypes = [
                    { type: Alien6, threshold: 0.1 },
                    { type: Alien5, threshold: 0.2 },
                    { type: Alien4, threshold: 0.3 },
                    { type: Alien3, threshold: 0.4 },
                    { type: Alien2, threshold: 0.6 },
                    { type: Alien1, threshold: 1.0 }
                ];

                const randomValue = Math.random();
                for (const alien of alienTypes) {
                    if (randomValue < alien.threshold) {
                        this.enemies.push(new alien.type(this.game, enemyX, enemyY));
                        break;
                    }
                }
            }
        }
    }
}

export class Game {
    canvas: HTMLCanvasElement;
    width: number;
    height: number;
    keys: string[];
    player: Player;
    items: Item[];
    projectilesPool: Projectile[];
    numberOfProjectiles: number;
    fired: boolean;
    columns: number;
    rows: number;
    enemySize: number;
    enemyProjectiles: EnemyProjectile[];
    waves: Wave[];
    waveCount: number;
    spriteUpdate: boolean;
    spriteTimer: number;
    spriteInterval: number;
    score: number;
    gameOver: boolean;
    bossLives: number;
    bossArray: Boss[];
    bossProjectiles: BossProjectile[];
    ship: MySpaceships;
    particles: Particle[] = [];

    constructor(canvas: HTMLCanvasElement, ship: MySpaceships) {
        this.canvas = canvas;
        this.ship = ship;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.keys = [];
        this.player = new Player(this, ship);
        this.items = [];

        this.projectilesPool = [];
        this.numberOfProjectiles = 10;
        this.createProjectiles();
        this.fired = false;

        this.columns = 3;
        this.rows = 5;
        this.enemySize = 80;
        this.enemyProjectiles = [];

        this.waves = [];
        this.waveCount = 1;

        this.spriteUpdate = false;
        this.spriteTimer = 0;
        this.spriteInterval = 100;

        this.score = 0;
        this.gameOver = false;

        this.bossLives = 20;
        this.bossArray = [];
        this.bossProjectiles = [];
        this.restart();
        
        this.preloadImages();
    }

    setupInput(): void {
        window.addEventListener("keydown", this.handleKeyDown);
        window.addEventListener("keyup", this.handleKeyUp);
    }


    cleanup(): void {
        window.removeEventListener("keydown", this.handleKeyDown);
        window.removeEventListener("keyup", this.handleKeyUp);
    }

    private handleKeyDown = (e: KeyboardEvent): void => {
        if (e.key === " " && !this.fired) this.player.shoot(this.ship);
        this.fired = true;
        if (this.keys.indexOf(e.key) === -1) this.keys.push(e.key);
        if (e.key === "r" && this.gameOver) this.restart();
    }

    private handleKeyUp = (e: KeyboardEvent): void => {
        this.fired = false;
        const index = this.keys.indexOf(e.key);
        if (index > -1) this.keys.splice(index, 1);
    }

    private preloadImages(): void {
        const aliens = getAliens();
        const bosses = getBosses();
        // Preload all alien images
        aliens.forEach((alien: AlienData) => loadImage(alien.image));

        // Preload all boss images
        bosses.forEach((boss: BossData) => loadImage(boss.image));

        // Preload player/ship images
        loadImage(this.ship.images);
    }

    private drawDiamond(
        context: CanvasRenderingContext2D,
        x: number,
        y: number,
        size: number,
        color: string = "white"
    ): void {
        context.beginPath();
        context.moveTo(x, y - size);
        context.lineTo(x + size, y);
        context.lineTo(x, y + size);
        context.lineTo(x - size, y);
        context.closePath();
        context.fillStyle = color;
        context.fill();
    }

    render(context: CanvasRenderingContext2D, deltaTime: number): void {
        if (this.spriteTimer > this.spriteInterval) {
            this.spriteUpdate = true;
            this.spriteTimer = 0;
        } else {
            this.spriteUpdate = false;
            this.spriteTimer += deltaTime;
        }

        if (!this.gameOver && this.player.lives >= 1) {
            setHp(this.player.lives);
            this.player.frameX = 0;
            this.drawStatus(context);

            this.projectilesPool.forEach((projectile: Projectile) => {
                projectile.update();
                projectile.draw(context, this.ship);
            });

            this.enemyProjectiles = this.enemyProjectiles.filter((enemyProjectile: EnemyProjectile) => {
                return enemyProjectile.position.y + enemyProjectile.height < this.canvas.height;
            });

            this.enemyProjectiles.forEach((enemyProjectile: EnemyProjectile) => {
                enemyProjectile.update();
                enemyProjectile.draw(context);
            });

            this.bossProjectiles = this.bossProjectiles.filter((bossProjectile: BossProjectile) => {
                return bossProjectile.position.y + bossProjectile.height < this.canvas.height;
            });

            this.bossProjectiles.forEach((bossProjectile: BossProjectile) => {
                bossProjectile.update();
                bossProjectile.draw(context);
            });

            this.items = this.items.filter((item: Item) => !item.markedForDeletion);

            this.items.forEach((item: Item) => {
                item.update();
                item.draw(context);
            });

            this.player.draw(context, this.ship);
            this.player.update(this.ship);

            this.bossArray.forEach((boss: Boss) => {
                boss.draw(context);
                boss.update(context);
            
                // Only soot if boss is alive and not out of bounds
                if (boss.lives >= 1 && boss.y >= 0 && Math.random() < 0.01) {
                    boss.shoot(this.bossProjectiles);
                }
            });

            this.bossArray = this.bossArray.filter((boss: Boss) => !boss.markedForDeletion);

            this.waves.forEach((wave: Wave) => {
                wave.render(context);

                if (wave.enemies.length < 1 && !wave.nextWaveTrigger && !this.gameOver) {
                    this.newWave();
                    wave.nextWaveTrigger = true;
                }
            });

            this.particles
                .filter((particle: Particle) => {
                    if (particle.position.y - particle.radius >= this.height) {
                        particle.position.x = Math.random() * this.width;
                        particle.position.y = -particle.radius;
                    }
                    return particle.opacity > 0;
                })
                .forEach((particle: Particle) => {
                    particle.draw(context);
                    particle.update();
                });

            // Delete particles
            for (let i = this.particles.length - 1; i >= 0; i--) {
                if (this.particles[i].opacity <= 0) {
                    this.particles.splice(i, 1);
                }
            }
        } else {
            this.player.frameX++;

            if (this.player.frameX > this.player.maxFrame) {
                setScores(this.score);
                setHp(0);
            }

            this.player.draw(context, this.ship);
        }
    }

    createParticles({ object, color, fades }: {
        object: Collidable;
        color: string;
        fades: boolean;
    }): void {
        for (let i = 0; i < 15; i++) {
            this.particles.push(new Particle({
                position: {
                    x: object.x + object.width / 2,
                    y: object.y + object.height / 2
                },
                velocity: {
                    x: (Math.random() - 0.5) * 2,
                    y: (Math.random() - 0.5) * 2
                },
                radius: Math.random() * 3,
                color: color || "red",
                fades
            }));
        }
    }

    createProjectiles(): void {
        for (let i = 0; i < this.numberOfProjectiles; i++) {
            this.projectilesPool.push(new Projectile());
        }
    }

    getProjectile(): Projectile | null {
        for (let i = 0; i < this.projectilesPool.length; i++) {
            if (this.projectilesPool[i].free) {
                this.projectilesPool[i].free = false;
                return this.projectilesPool[i];
            }
        }
        return null;
    }

    checkCollision(a: Collidable, b: Collidable): boolean {
        return (
            a.x < b.x + b.width &&
            a.x + a.width > b.x &&
            a.y < b.y + b.height &&
            a.y + a.height > b.y
        );
    }

    drawStatus(context: CanvasRenderingContext2D): void {
        context.save();

        const primaryColor = "#22d3ee";
        const secondaryColor = "#facc15";
        const dangerColor = "#ef4444";
        const glassBg = "rgba(0, 0, 0, 0.6)";
        
        context.fillStyle = glassBg;
        context.beginPath();
        context.roundRect(15, 15, 240, 140, 12);
        context.fill();
        context.strokeStyle = "rgba(34, 211, 238, 0.4)";
        context.lineWidth = 2;
        context.stroke();
    
        context.shadowBlur = 8;
        context.shadowColor = primaryColor;
        context.font = "bold 16px 'Courier New', monospace";
        context.fillStyle = "white";
        context.textAlign = "left";
        context.fillText(`SCORE: ${this.score.toLocaleString()}`, 30, 45);
        
        context.fillStyle = primaryColor;
        context.fillText(`WAVE : ${this.waveCount}`, 30, 70);
    
        const barWidth = 210;
        const barHeight = 14;
        const barX = 30;
        const barY = 105;
    
        context.shadowBlur = 0;
        context.font = "10px Arial";
        context.fillStyle = "rgba(255,255,255,0.8)";
        context.fillText(this.player.cooldown ? "RECHARGING..." : "LASER ENERGY", barX, barY - 8);
    
        context.fillStyle = "rgba(255, 255, 255, 0.15)";
        context.beginPath();
        context.roundRect(barX, barY, barWidth, barHeight, 4);
        context.fill();
    
        const energyRatio = Math.max(0, Math.min(1, this.player.energy / this.player.maxEnergy));
        const currentBarWidth = barWidth * energyRatio;
    
        if (currentBarWidth > 0) {
            context.save();
            context.beginPath();
            context.roundRect(barX, barY, currentBarWidth, barHeight, 4);
            
            const gradient = context.createLinearGradient(barX, 0, barX + barWidth, 0);
            if (this.player.cooldown) {
                gradient.addColorStop(0, "#7f1d1d");
                gradient.addColorStop(1, dangerColor);
                context.shadowColor = dangerColor;
            } else {
                gradient.addColorStop(0, "#a16207");
                gradient.addColorStop(1, secondaryColor);
                context.shadowColor = secondaryColor;
            }
            
            context.shadowBlur = 12;
            context.fillStyle = gradient;
            context.fill();
            context.restore();
        }
    
        context.textAlign = "right";
        context.font = "bold 14px 'Courier New', monospace";
        context.fillStyle = "white";
        context.fillText("SHIP INTEGRITY", this.width - 20, 40);
        
        for (let i = 0; i < this.player.maxLives; i++) {
            const isLost = i >= this.player.lives;
            this.drawDiamond(
                context, 
                (this.width - 30) - (i * 25), 
                60, 
                8, 
                isLost ? "rgba(255,255,255,0.15)" : primaryColor
            );
        }

        const itemBoxSize = 35;
        const spacing = 8;
        const itemsPerRow = 6;
        
        this.player.collectedItems.forEach((item, index) => {
            const row = Math.floor(index / itemsPerRow);
            const col = index % itemsPerRow;
            const x = 20 + col * (itemBoxSize + spacing);
            const y = this.height - 60 - row * (itemBoxSize + spacing);
            let rarityColor = "rgba(255,255,255,0.2)";
            if (item.rarity === "Legendary") rarityColor = "#f59e0b";
            else if (item.rarity === "Epic") rarityColor = "#a855f7";
            else if (item.rarity === "Rare") rarityColor = "#3b82f6";
    
            context.lineWidth = 1;
            context.strokeStyle = rarityColor;
            context.strokeRect(x, y, itemBoxSize, itemBoxSize);
            
            context.fillStyle = "rgba(0,0,0,0.4)";
            context.fillRect(x, y, itemBoxSize, itemBoxSize);
            
            if (item.image) {
                context.drawImage(item.image, x + 3, y + 3, itemBoxSize - 6, itemBoxSize - 6);
            }
        });
    
        context.restore();
    }

    newWave(): void {
        this.waveCount++;
        if (this.waveCount % 4 === 0) {
            const bossTypes = [
                { type: Boss3, threshold: 0.1, multiplier: 1.5 },
                { type: Boss2, threshold: 0.3, multiplier: 1.0 },
                { type: Boss1, threshold: 1.0, multiplier: 0.5 }
            ];

            const randomValue = Math.random();
            for (const boss of bossTypes) {
                if (randomValue < boss.threshold) {
                    const newBossLives = this.bossLives * boss.multiplier;
                    this.bossArray.push(new boss.type(this, newBossLives));
                    break;
                }
            }
        } else {
            if (Math.random() < 0.5 && this.columns * this.enemySize < this.width * 0.8) {
                this.columns++;
            } else if (this.rows * this.enemySize < this.height * 0.08) {
                this.rows++;
            }

            this.waves.push(new Wave(this));
        }

        this.waves = this.waves.filter((wave: Wave) => !wave.markedForDeletion);
    }

    chooseItemByDropRate(bossType: string): ItemDropData | undefined {
        const items = getItems();
        let cumulativeRate = 0;
        const adjustedItems = items.map((item: ItemDropData) => {
            let adjustedRate = item.dropRate;
            if (bossType === "Boss1") {
                adjustedRate *= 0.5;
            } else if (bossType === "Boss2") {
                adjustedRate *= 1;
            } else if (bossType === "Boss3") {
                adjustedRate *= 2;
            }

            adjustedRate *= (1 + (this.waveCount * 0.1));
            return { ...item, dropRate: adjustedRate };
        });

        const totalRate = adjustedItems.reduce((acc, item) => acc + item.dropRate, 0);
        const random = Math.random() * totalRate;

        for (const item of adjustedItems) {
            cumulativeRate += item.dropRate;
            if (random <= cumulativeRate) {
                return item;
            }
        }

        return undefined;
    }

    restart(): void {
        this.player.restart(this.ship, setCollectedItems);
        this.columns = 2;
        this.rows = 2;
        this.waves = [];
        this.bossArray = [];
        this.waveCount = 1;
        this.waves.push(new Wave(this));
        this.score = 0;
        setScores(0);
        setCollectedItems([]);
        this.gameOver = false;
    }
}