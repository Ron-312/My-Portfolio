"use client";

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
// import { motion } from 'framer-motion';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

import JoystickControl from './JoystickControl';

// Add these constants at the top of your component
const COLLISION_MULTIPLIERS: { [key: string]: number } = {
    "Squid": 0.8,
    "Black Moor Goldfish": 0.9,
    "Hammerhead Shark": 1.2,
    "Rainbow Trout": 1.0,
    "Goblin Shark": 1.3,
    "Player": 0.8 // Player-specific multiplier
};

interface FishFrenzyProps {
    height?: string;
}

interface FullscreenElement extends HTMLDivElement {
    mozRequestFullScreen?: () => Promise<void>;
    webkitRequestFullscreen?: () => Promise<void>;
    msRequestFullscreen?: () => Promise<void>;
}

interface FullscreenDocument extends Document {
    mozCancelFullScreen?: () => Promise<void>;
    webkitExitFullscreen?: () => Promise<void>;
    msExitFullscreen?: () => Promise<void>;
}

const fishTypes = [
    {
        name: "Squid",
        modelPath: "/gameModels/11097_squid_v1.obj",
        scale: { x: 0.02, y: 0.02, z: 0.02 },
        speed: 0.05,
        sizeCategory: "medium-small"
    },
    {
        name: "Black Moor Goldfish",
        modelPath: "/gameModels/12990_Black_Moor_Goldfish_v1_l2.obj",
        scale: { x: 0.015, y: 0.015, z: 0.015 },
        speed: 0.025,
        sizeCategory: "small"
    },
    {
        name: "Hammerhead Shark",
        modelPath: "/gameModels/19412_Hammerhead_Shark_v2.obj",
        scale: { x: 0.04, y: 0.04, z: 0.04 },
        speed: 0.035,
        sizeCategory: "large"
    },
    {
        name: "Rainbow Trout",
        modelPath: "/gameModels/21859_Rainbow_Trout_v1.obj",
        scale: { x: 0.025, y: 0.025, z: 0.025 },
        speed: 0.01,
        sizeCategory: "medium"
    },
    {
        name: "Goblin Shark",
        modelPath: "/gameModels/21861_Goblin_Shark_v1.obj",
        scale: { x: 0.05, y: 0.05, z: 0.05 },
        speed: 0.02,
        sizeCategory: "extra-large"
    }
];

export default function FishFrenzy({ height = "h-96" }: FishFrenzyProps) {
    const gameRef = useRef<HTMLDivElement>(null);
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [gameStarted, setGameStarted] = useState(false);
    const [playerSize, setPlayerSize] = useState(2.5);
    const [highScore, setHighScore] = useState(0);
    const keysPressed = useRef<Record<string, boolean>>({});
    const [loading, setLoading] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Add this function to handle fullscreen toggle
    const toggleFullscreen = () => {
        const gameElement = gameRef.current as FullscreenElement | null;
        if (!gameElement) return;

        if (!isFullscreen) {
            // Enter fullscreen
            if (gameElement.requestFullscreen) {
                gameElement.requestFullscreen();
            } else if (gameElement.mozRequestFullScreen) {
                gameElement.mozRequestFullScreen();
            } else if (gameElement.webkitRequestFullscreen) {
                gameElement.webkitRequestFullscreen();
            } else if (gameElement.msRequestFullscreen) {
                gameElement.msRequestFullscreen();
            }
            setIsFullscreen(true);
        } else {
            // Exit fullscreen
            const doc = document as FullscreenDocument;
            if (doc.exitFullscreen) {
                doc.exitFullscreen();
            } else if (doc.mozCancelFullScreen) {
                doc.mozCancelFullScreen();
            } else if (doc.webkitExitFullscreen) {
                doc.webkitExitFullscreen();
            } else if (doc.msExitFullscreen) {
                doc.msExitFullscreen();
            }
            setIsFullscreen(false);
        }
    };

    // Add this effect to detect fullscreen changes from browser UI
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
            document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
        };
    }, []);

    useEffect(() => {
        if (!gameRef.current || !gameStarted) return;

        const invulnerableUntil = Date.now() + 3000; // 3 seconds of immunity

        setLoading(true);
        const currentRef = gameRef.current;

        let animationFrameId: number;
        let isGameOver = false;
        let playerFish: THREE.Group;
        let playerFishModel: THREE.Group | null = null;
        const fishList: { object: THREE.Object3D, speed: number, direction: THREE.Vector3, type: string, size: string, exactSize: number }[] = [];
        const playerSpeed = 0.05;
        let playerScore = 0;
        let currentPlayerSize = playerSize;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0077be);

        const camera = new THREE.PerspectiveCamera(
            75,
            currentRef.clientWidth / currentRef.clientHeight,
            0.1,
            1000
        );

        camera.position.set(0, 2, 10);
        camera.lookAt(0, 0, 0);
        camera.up.set(0, 1, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(currentRef.clientWidth, currentRef.clientHeight);
        currentRef.appendChild(renderer.domElement);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(0, 1, 1);
        scene.add(directionalLight);

        const topLight = new THREE.DirectionalLight(0xffffff, 0.5);
        topLight.position.set(0, 10, 0);
        scene.add(topLight);

        const frontLight = new THREE.DirectionalLight(0xffffff, 0.5);
        frontLight.position.set(0, 0, 10);
        scene.add(frontLight);

        const particleCount = 1000;
        const particleGeometry = new THREE.BufferGeometry();
        const particlePositions = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            particlePositions[i * 3] = (Math.random() - 0.5) * 100;
            particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 100;
            particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 100;
        }

        particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

        const particleMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.05,
            transparent: true,
            opacity: 0.6
        });

        const particles = new THREE.Points(particleGeometry, particleMaterial);
        scene.add(particles);

        scene.fog = new THREE.FogExp2(0x0077be, 0.02);

        const floorGeometry = new THREE.PlaneGeometry(100, 100, 20, 20); // Reduced from 200x200
        const floorMaterial = new THREE.MeshPhongMaterial({
            color: 0x006994,
            wireframe: false,
            side: THREE.DoubleSide
        });
        const oceanFloor = new THREE.Mesh(floorGeometry, floorMaterial);
        oceanFloor.rotation.x = Math.PI / 2;
        oceanFloor.position.y = -10;
        scene.add(oceanFloor);

        // Add underwater plants/coral for the larger environment
        function addUnderwaterEnvironment() {
            // Create some coral/plants on the ocean floor
            for (let i = 0; i < 30; i++) {
                const coral = new THREE.Group();

                // Create coral base
                const baseGeometry = new THREE.CylinderGeometry(0.2, 0.5, 1.5, 8);
                const baseMaterial = new THREE.MeshPhongMaterial({
                    color: new THREE.Color().setHSL(Math.random() * 0.2 + 0.5, 0.8, 0.5),
                    shininess: 30
                });
                const base = new THREE.Mesh(baseGeometry, baseMaterial);
                base.position.y = 0.75;
                coral.add(base);

                // Add branches to coral
                const branchCount = Math.floor(Math.random() * 3) + 2;
                for (let j = 0; j < branchCount; j++) {
                    const branchGeometry = new THREE.ConeGeometry(0.2, 1.5, 8);
                    const branchMaterial = new THREE.MeshPhongMaterial({
                        color: new THREE.Color().setHSL(Math.random() * 0.2 + 0.5, 0.9, 0.6),
                        shininess: 30
                    });
                    const branch = new THREE.Mesh(branchGeometry, branchMaterial);

                    // Position branches at angles from the center
                    const angle = (j / branchCount) * Math.PI * 2;
                    const radius = 0.3;
                    branch.position.set(
                        Math.cos(angle) * radius,
                        1.5,
                        Math.sin(angle) * radius
                    );

                    // Angle branches outward
                    branch.rotation.x = Math.random() * 0.5 - 0.25;
                    branch.rotation.z = Math.random() * 0.5 - 0.25;

                    coral.add(branch);
                }

                // Position coral randomly on ocean floor
                coral.position.set(
                    Math.random() * 80 - 40,  // Reduced from 160-80
                    -9.8, // Keep same height (just above ocean floor)
                    Math.random() * 80 - 40   // Reduced from 160-80
                );

                // Random rotation and scale
                coral.rotation.y = Math.random() * Math.PI * 2;
                const scale = 1 + Math.random() * 2;
                coral.scale.set(scale, scale, scale);

                scene.add(coral);
            }
        }

        // Call this function after you've created the ocean floor
        addUnderwaterEnvironment();

        function loadPlayerFish(size: number): Promise<THREE.Group> {
            return new Promise((resolve, reject) => {
                const objLoader = new OBJLoader();

                interface LoaderProgress {
                    loaded: number;
                    total: number;
                }

                objLoader.load(
                    '/gameModels/13007_Blue-Green_Reef_Chromis_v2_l3.obj',
                    (object: THREE.Group) => {
                        // Add this code to apply material to the player fish
                        object.traverse((child: THREE.Object3D) => {
                            if (child instanceof THREE.Mesh) {
                                // Give player fish a distinctive blue/teal color
                                child.material = new THREE.MeshPhongMaterial({
                                    color: 0x2cc8de,  // Bright teal blue
                                    shininess: 100,
                                    specular: 0x333333,
                                    emissive: 0x114455,  // Slight glow
                                    emissiveIntensity: 0.2
                                });
                            }
                        });

                        const scaleFactor: number = size * 0.1;
                        object.scale.set(scaleFactor, scaleFactor, scaleFactor);
                        // object.rotation.y = Math.PI;

                        if (!playerFishModel) {
                            playerFishModel = object.clone();
                        }

                        resolve(object);
                    },
                    (xhr: LoaderProgress) => {
                        console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
                    },
                    (error: unknown) => {
                        console.error('Error loading fish model:', error);
                        reject(error);
                    }
                );
            });
        }

        loadPlayerFish(currentPlayerSize)
            .then((model) => {
                playerFish = model;

                playerFish.position.set(0, 0, 0);
                playerFish.rotation.set(Math.PI / 2, 0, 0);

                // const axesHelper = new THREE.AxesHelper(5);
                // playerFish.add(axesHelper);

                scene.add(playerFish);
                setLoading(false);

                setTimeout(() => {
                    spawnFish(30); // Initial spawn of 30 fish for a more populated world
                    animate();
                }, 100);
            })
            .catch(() => {
            });

        function createFish(fishType: typeof fishTypes[0]) {
            const loader = new OBJLoader();
            let exactSize: number;
            switch (fishType.sizeCategory) {
                case "small": exactSize = 0.5 + Math.random() * 0.3; break; // 0.5-1.0
                case "medium-small": exactSize = 1.0 + Math.random() * 0.3; break; // 1.0-1.5
                case "medium": exactSize = 1.5 + Math.random() * 0.3; break; // 1.5-2.0
                case "large": exactSize = 2.0 + Math.random() * 0.5; break; // 2.0-2.8
                case "extra-large": exactSize = 2.8 + Math.random() * 1.0; break; // 2.8-4.0
                default: exactSize = 1.0;
            }

            loader.load(fishType.modelPath, (object) => {
                // Scale fish according to type
                object.scale.set(
                    fishType.scale.x * exactSize,
                    fishType.scale.y * exactSize,
                    fishType.scale.z * exactSize
                );

                // Determine fish spawn position
                let x: number = 0;
                let y: number = 0;
                let z: number = 0;
                let tooCloseToPlayer = true;
                const minDistanceFromPlayer = fishList.length === 0 ? 20 : 10; // Increased for initial spawn

                // Keep generating positions until we find one far enough from player
                while (tooCloseToPlayer) {
                    x = Math.random() * 80 - 40; // Reduced from 160-80
                    y = Math.random() * 20 - 10; // Reduced from 40-20
                    z = Math.random() * 80 - 40; // Reduced from 160-80

                    // Calculate distance to player
                    if (playerFish) {
                        const distToPlayer = new THREE.Vector3(x, y, z)
                            .distanceTo(playerFish.position);

                        if (distToPlayer > minDistanceFromPlayer) {
                            tooCloseToPlayer = false;
                        }
                    } else {
                        // If playerFish doesn't exist yet, any position is fine
                        tooCloseToPlayer = false;
                    }
                }

                object.position.set(x, y, z);

                // Rotate so that the fish’s nose (originally -Y) points to -Z.
                // +90° around the X axis transforms -Y to -Z.
                // Adding a random Y rotation for variety.
                object.rotation.set(
                    Math.PI / 2,              // Rotate 90° around X axis
                    Math.random() * Math.PI * 2, // Random rotation around Y axis
                    0
                );

                // Color based on whether the fish is edible or dangerous
                object.traverse((child: THREE.Object3D) => {
                    if (child instanceof THREE.Mesh) {
                        let color: THREE.Color;

                        if (exactSize < currentPlayerSize) {
                            // Edible fish - green/blue hues
                            color = new THREE.Color().setHSL(
                                0.3 + Math.random() * 0.3, // Green to blue hue
                                0.7,
                                0.5
                            );
                        } else {
                            // Dangerous fish - red/orange/yellow hues
                            color = new THREE.Color().setHSL(
                                Math.random() * 0.15, // Red to yellow hue
                                0.8,
                                0.5
                            );
                        }

                        child.material = new THREE.MeshPhongMaterial({
                            color: color,
                            shininess: 80,
                            specular: 0x222222
                        });
                    }
                });

                scene.add(object);

                fishList.push({
                    object: object,
                    speed: fishType.speed * (0.7 + Math.random() * 0.6), // More varied speeds
                    direction: new THREE.Vector3(
                        Math.random() - 0.5,
                        Math.random() - 0.5,
                        Math.random() - 0.5
                    ).normalize(),
                    type: fishType.name,
                    size: fishType.sizeCategory,
                    exactSize: exactSize // Store the precise size
                });
            });
        }

        // Adjust the spawnFish function to spawn fewer dangerous fish at start
        function spawnFish(count = 10) {
            // For initial spawn, make mostly safe fish
            const isInitialSpawn = fishList.length === 0;

            // Change the ratio of edible vs dangerous fish
            const edibleFishCount = isInitialSpawn ? Math.ceil(count * 0.9) : Math.ceil(count * 0.7);
            const dangerousFishCount = count - edibleFishCount;

            // Spawn fish that are smaller than player (edible)
            for (let i = 0; i < edibleFishCount; i++) {
                // Filter fish types that would be smaller than player size
                const edibleTypes = fishTypes.filter(type => {
                    let approxSize = 0;
                    switch (type.sizeCategory) {
                        case "small": approxSize = 1.0; break;
                        case "medium-small": approxSize = 1.5; break;
                        case "medium": approxSize = 2.0; break;
                        case "large": approxSize = 2.8; break;
                        case "extra-large": approxSize = 4.0; break;
                        default: approxSize = 1.5;
                    }
                    // If player is at least 95% as big as the maximum fish size in this category
                    return currentPlayerSize >= (approxSize * 0.95);
                });

                // If we have edible fish types available, create one
                if (edibleTypes.length > 0) {
                    const randomType = edibleTypes[Math.floor(Math.random() * edibleTypes.length)];
                    createFish(randomType);
                } else {
                    // If player is too small to eat anything, create smallest fish type
                    const smallestType = fishTypes.find(type => type.sizeCategory === "small");
                    if (smallestType) createFish(smallestType);
                }
            }

            // Spawn fish that are larger than player (dangerous)
            for (let i = 0; i < dangerousFishCount; i++) {
                // Filter fish types that would be larger than player size
                const dangerousTypes = fishTypes.filter(type => {
                    let approxSize = 0;
                    switch (type.sizeCategory) {
                        case "small": approxSize = 0.5; break;
                        case "medium-small": approxSize = 1.0; break;
                        case "medium": approxSize = 1.5; break;
                        case "large": approxSize = 2.0; break;
                        case "extra-large": approxSize = 2.8; break;
                        default: approxSize = 1.5;
                    }
                    // Larger than player by at least 10%
                    return approxSize > (currentPlayerSize * 1.1);
                });

                // If we have dangerous fish types available, create one
                if (dangerousTypes.length > 0) {
                    const randomType = dangerousTypes[Math.floor(Math.random() * dangerousTypes.length)];
                    createFish(randomType);
                } else {
                    // If player is too large, create largest fish type
                    const largestType = fishTypes.find(type => type.sizeCategory === "extra-large");
                    if (largestType) createFish(largestType);
                }
            }
        }

        // When player grows, update its collision radius immediately
        function growPlayer(growthAmount: number) {
            currentPlayerSize += growthAmount;
            setPlayerSize(currentPlayerSize);

            // Update visual scale
            const newScaleFactor = currentPlayerSize * 0.2;
            playerFish.scale.set(newScaleFactor, newScaleFactor, newScaleFactor);

            // No need to explicitly update collision radius as it's calculated dynamically in checkCollision
            console.log(`Player grew to size ${currentPlayerSize} with collision radius ${currentPlayerSize * COLLISION_MULTIPLIERS["Player"]}`);
        }

        let frameCount = 0; // Frame counter for collision checks

        function checkCollision() {
            if (!playerFish) return;

            // Increment frame counter and only check collisions every other frame
            frameCount++;
            if (frameCount % 2 !== 0) return;

            // Add this immunity check
            if (Date.now() < invulnerableUntil) {
                // Make player flash during immunity
                playerFish.visible = Math.floor(Date.now() / 100) % 2 === 0;
                return; // Skip collision detection during immunity
            } else {
                playerFish.visible = true; // Ensure player is visible after immunity
            }

            // Calculate player's collision radius more efficiently
            const playerRadius = currentPlayerSize * 0.2 * COLLISION_MULTIPLIERS["Player"];
            const playerPos = playerFish.position.clone();

            // Only check for collisions within a reasonable distance
            const maxCheckDistance = 10 + currentPlayerSize * 2;

            // Optional debug visualization
            // debugVisualizeSphere(playerPos, playerRadius, 0x00ff00);

            // Loop over the fish list (backwards so removal is safe)
            for (let i = fishList.length - 1; i >= 0; i--) {
                const fish = fishList[i].object;
                const fishPos = fish.position.clone();

                // Quick distance check before doing full calculations
                const quickDistance = playerPos.distanceTo(fishPos);
                if (quickDistance > maxCheckDistance) {
                    continue; // Skip distant fish for performance
                }

                const fishData = fishList[i];
                const fishType = fishData.type;

                // Calculate fish's collision radius for collision detection ONLY
                const fishRadius = fishData.exactSize * 0.2 * (COLLISION_MULTIPLIERS[fishType] || 0.8);

                // Optional debug visualization
                // debugVisualizeSphere(fishPos, fishRadius, 0xff0000);

                const distance = quickDistance; // We already calculated this
                const collisionThreshold = playerRadius + fishRadius;

                if (distance < collisionThreshold) {
                    // Reduce log spam in production
                    if (process.env.NODE_ENV !== 'production') {
                        console.log(`Collision detected! Player size: ${currentPlayerSize}, Fish size: ${fishData.exactSize}`);
                    }

                    // Use direct size comparison for who-eats-whom logic
                    if (currentPlayerSize > fishData.exactSize * 1.1) {
                        // Player eats fish (player is at least 10% larger)
                        scene.remove(fish);
                        fishList.splice(i, 1);

                        // Rest of eating code remains the same...
                        const sizeBonus = fishData.exactSize > currentPlayerSize * 0.8 ? 2 : 1;
                        playerScore += Math.round((fishData.exactSize * 10) * sizeBonus);
                        setScore(playerScore);

                        createEatingEffect(fishPos, fishData.exactSize > currentPlayerSize * 0.8 ? 0x800080 : 0x32cd32);

                        const growthAmount = 0.05 + (fishData.exactSize / currentPlayerSize) * 0.05;
                        growPlayer(growthAmount);

                        if (fishList.length < 30) { // Reduced from 40 for better performance
                            spawnFish(3);
                        }
                    } else if (fishData.exactSize > currentPlayerSize * 1.1) {
                        // Fish eats player (fish is at least 10% larger)
                        createEatingEffect(playerPos, 0xff6347);
                        endGame();
                    } else {
                        // Sizes are within 10% of each other - just bump

                        // Optional: Add a slight repulsion effect
                        const repulsionForce = 0.2;
                        const repulsionDirection = playerPos.clone().sub(fishPos).normalize();
                        playerFish.position.add(repulsionDirection.multiplyScalar(repulsionForce));

                        // Also push the other fish away slightly
                        fish.position.add(repulsionDirection.clone().negate().multiplyScalar(repulsionForce * 0.5));
                    }
                }
            }
        }

        function createEatingEffect(position: THREE.Vector3, color: number) {
            const particleCount = 2000; // Doubled from 2000
            const particleGeometry = new THREE.BufferGeometry();
            const particlePositions = new Float32Array(particleCount * 3);

            for (let i = 0; i < particleCount; i++) {
                particlePositions[i * 3] = position.x;
                particlePositions[i * 3 + 1] = position.y;
                particlePositions[i * 3 + 2] = position.z;
            }

            particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

            const particleMaterial = new THREE.PointsMaterial({
                color: color,
                size: 0.1,
                transparent: true,
                opacity: 0.8
            });

            const particles = new THREE.Points(particleGeometry, particleMaterial);
            scene.add(particles);

            const velocities: THREE.Vector3[] = [];
            for (let i = 0; i < particleCount; i++) {
                velocities.push(new THREE.Vector3(
                    (Math.random() - 0.5) * 0.2,
                    (Math.random() - 0.5) * 0.2,
                    (Math.random() - 0.5) * 0.2
                ));
            }

            let frame = 0;
            const maxFrames = 60;

            function animateParticles() {
                frame++;

                const positions = particles.geometry.attributes.position.array;
                for (let i = 0; i < particleCount; i++) {
                    const idx = i * 3;
                    positions[idx] += velocities[i].x;
                    positions[idx + 1] += velocities[i].y;
                    positions[idx + 2] += velocities[i].z;

                    velocities[i].y -= 0.001;
                }

                particles.geometry.attributes.position.needsUpdate = true;
                particleMaterial.opacity = 0.8 * (1 - frame / maxFrames);

                if (frame < maxFrames) {
                    requestAnimationFrame(animateParticles);
                } else {
                    scene.remove(particles);
                }
            }

            animateParticles();
        }

        function endGame() {
            isGameOver = true;
            setGameOver(true);
            if (playerScore > highScore) {
                setHighScore(playerScore);
            }
            cancelAnimationFrame(animationFrameId);
        }

        // Increase these values for faster rotation
        const rotationAcceleration = 0.02; // Increased from 0.01

        function animate() {
            // If game is over, do nothing
            if (isGameOver) return;

            // Request the next frame
            animationFrameId = requestAnimationFrame(animate);

            // -------------------- ROTATION: Yaw (Left/Right) --------------------
            // Make sure fish rotation order allows separate yaw/pitch adjustments
            if (!playerFish.rotation.order) {
                playerFish.rotation.order = 'XYZ';
            }

            // For yaw (left/right) around the desired axis (assume you want to rotate about the blue axis)
            if (keysPressed.current['d']) {
                const yawAngle = rotationAcceleration;
                // For example, if you want to use the fish's local blue axis,
                // determine that axis properly (here, you may need to define it manually based on your model).
                const yawAxis = new THREE.Vector3(0, 0, 1); // adjust if necessary
                const qYaw = new THREE.Quaternion().setFromAxisAngle(yawAxis, yawAngle);
                playerFish.quaternion.multiply(qYaw);
            } else if (keysPressed.current['a']) {
                const yawAngle = -rotationAcceleration;
                const yawAxis = new THREE.Vector3(0, 0, 1);
                const qYaw = new THREE.Quaternion().setFromAxisAngle(yawAxis, yawAngle);
                playerFish.quaternion.multiply(qYaw);
            }

            // For pitch (up/down) around the appropriate local axis (e.g. local X)
            if (keysPressed.current['w']) {
                const pitchAngle = rotationAcceleration;
                const pitchAxis = new THREE.Vector3(1, 0, 0); // adjust if needed
                const qPitch = new THREE.Quaternion().setFromAxisAngle(pitchAxis, pitchAngle);
                playerFish.quaternion.multiply(qPitch);
            } else if (keysPressed.current['s']) {
                const pitchAngle = -rotationAcceleration;
                const pitchAxis = new THREE.Vector3(1, 0, 0);
                const qPitch = new THREE.Quaternion().setFromAxisAngle(pitchAxis, pitchAngle);
                playerFish.quaternion.multiply(qPitch);
            }

            // -------------------- FORWARD MOTION (always moving) ----------------
            // Optionally, you can let the user "sprint" by holding Shift
            const isSprinting = keysPressed.current['shift'];
            const currentForwardSpeed = isSprinting ? playerSpeed * 1.3 : playerSpeed;

            // Calculate a forward direction vector from the fish’s current quaternion
            const forward = new THREE.Vector3(0, -1, 0);
            forward.applyQuaternion(playerFish.quaternion);
            forward.normalize();

            // Slowly keep fish level for the first 100 frames, if desired
            // if (frameCount < 100) {
            //     forward.y = Math.max(-0.05, forward.y);
            //     frameCount++;
            // }

            // Move the fish forward
            playerFish.position.add(forward.clone().multiplyScalar(currentForwardSpeed));

            // -------------------- SWIMMING IDLE MOTION --------------------------
            // Add a gentle bob and slight roll when not actively rotating
            // // (This is purely aesthetic; skip if you don’t want it.)
            // if (Math.abs(yawVelocity) < 0.001 && Math.abs(pitchVelocity) < 0.001) {
            //     playerFish.position.y += Math.sin(Date.now() * 0.002) * 0.01;
            //     playerFish.rotation.z = Math.sin(Date.now() * 0.001) * 0.05;
            // }

            // -------------------- THIRD-PERSON CAMERA LOGIC ---------------------
            // Position camera behind the fish
            const cameraDistance = 4 + currentPlayerSize;
            const cameraHeight = 2.5 + currentPlayerSize * 0.4;

            // "backward" direction is just the negative of forward
            const backward = forward.clone().negate();

            // Ideal camera position behind and slightly above the fish
            const idealCameraPos = playerFish.position.clone()
                .add(backward.multiplyScalar(cameraDistance))
                .add(new THREE.Vector3(0.7, cameraHeight, 0));

            // Smoothly interpolate camera position for a smooth follow
            camera.position.lerp(idealCameraPos, 0.05);

            // Make camera look toward where the fish is headed
            const lookAheadDistance = 3 + currentPlayerSize;
            const lookTarget = playerFish.position.clone().add(forward.clone().multiplyScalar(lookAheadDistance));
            camera.lookAt(lookTarget);

            // In your animate function, modify the enemy fish movement section:

            // -------------------- ENEMY FISH MOVEMENT ---------------------------
            for (let i = 0; i < fishList.length; i++) {
                const fish = fishList[i];
                const fishObj = fish.object;

                // Calculate base movement vector from the fish's direction and speed
                const movement = fish.direction.clone().multiplyScalar(fish.speed);

                // Add an oscillatory offset for a natural swimming effect:
                const time = Date.now() * 0.001; // time in seconds
                const oscillationAmplitude = 0.05; // adjust amplitude for gentler or stronger motion

                // For example, add a slight side-to-side oscillation to the x-axis:
                movement.x += Math.sin(time + i) * oscillationAmplitude;
                // Optionally, add a vertical bobbing on the y-axis:
                movement.y += Math.cos(time + i) * (oscillationAmplitude * 0.5);

                // Update the fish's position with the combined movement
                fishObj.position.add(movement);

                // Bounce off boundaries, but with ASYMMETRIC y-bounds to respect ocean floor:
                const boundsX = 30;
                const boundsZ = 30;
                const maxY = 10;     // Maximum height
                const minY = -9;     // Minimum height (just above ocean floor at -10)

                if (Math.abs(fishObj.position.x) > boundsX) {
                    fish.direction.x *= -1;
                    // Push back within bounds
                    fishObj.position.x = Math.sign(fishObj.position.x) * boundsX;
                }

                // Asymmetric Y bounds (ceiling vs floor)
                if (fishObj.position.y > maxY) {
                    fish.direction.y *= -1;
                    fishObj.position.y = maxY;
                } else if (fishObj.position.y < minY) {
                    fish.direction.y *= -1;
                    fishObj.position.y = minY;

                    // Add a small upward impulse when hitting the floor
                    fish.direction.y = Math.abs(fish.direction.y);
                }

                if (Math.abs(fishObj.position.z) > boundsZ) {
                    fish.direction.z *= -1;
                    // Push back within bounds
                    fishObj.position.z = Math.sign(fishObj.position.z) * boundsZ;
                }

                // Let the fish face its movement direction:
                // Compute a target position based on its current direction:
                const targetPos = fishObj.position.clone().add(fish.direction);
                fishObj.lookAt(targetPos);

                // Optionally, add a slight roll to simulate a swimming motion:
                fishObj.rotation.z = Math.sin(time + i) * 0.1;
            }

            // -------------------- COLLISIONS ---------------------------
            // (Assumes you have a checkCollision function)
            checkCollision();

            // -------------------- SPAWN NEW FISH OCCASIONALLY ----------
            if (Date.now() % 2000 < 20) {
                spawnFish(3);
            }

            // -------------------- PARTICLES MOTION ----------------------
            particles.rotation.y += 0.0001;

            // -------------------- RENDER THE SCENE ----------------------
            renderer.render(scene, camera);
        }

        const handleResize = () => {
            if (!currentRef) return;

            const width = currentRef.clientWidth;
            const height = currentRef.clientHeight;

            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);

            if (currentRef && renderer) {
                currentRef.removeChild(renderer.domElement);
            }
        };
    }, [gameStarted]);


    useEffect(() => {
        if (!gameRef.current || !gameStarted) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Convert key to lowercase to handle CapsLock
            const key = e.key.toLowerCase();
            keysPressed.current[key] = true;

            // Add alias for Shift key and arrow keys
            if (e.key === 'Shift') {
                keysPressed.current['shift'] = true;
            }

            // Also handle arrow keys with standard names
            if (e.key === 'ArrowUp') keysPressed.current['w'] = true;
            if (e.key === 'ArrowDown') keysPressed.current['s'] = true;
            if (e.key === 'ArrowLeft') keysPressed.current['a'] = true;
            if (e.key === 'ArrowRight') keysPressed.current['d'] = true;
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            // Convert key to lowercase to handle CapsLock
            const key = e.key.toLowerCase();
            keysPressed.current[key] = false;

            // Add alias for Shift key and arrow keys
            if (e.key === 'Shift') {
                keysPressed.current['shift'] = false;
            }

            // Also handle arrow keys
            if (e.key === 'ArrowUp') keysPressed.current['w'] = false;
            if (e.key === 'ArrowDown') keysPressed.current['s'] = false;
            if (e.key === 'ArrowLeft') keysPressed.current['a'] = false;
            if (e.key === 'ArrowRight') keysPressed.current['d'] = false;
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [gameStarted]);


    const resetGame = () => {
        setScore(0);
        setGameOver(false);
        setPlayerSize(2.5);
        setGameStarted(false);

        setTimeout(() => {
            setGameStarted(true);
        }, 50);
    };

    return (
        <div className="relative w-full">
            <div
                ref={gameRef}
                className={`w-full ${height} bg-blue-900 rounded-lg overflow-hidden relative`}
            >
                {/* 👇 Move all UI elements INSIDE the gameRef div! */}
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-50" style={{ pointerEvents: 'auto' }}>
                        <div className="bg-white rounded-lg p-4 flex flex-col items-center">
                            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                            <p className="text-sm text-gray-700">Loading fish model...</p>
                        </div>
                    </div>
                )}

                {gameStarted && !gameOver && !loading && (
                    <>
                        {/* Score and game info - stays visible in fullscreen */}
                        <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded-lg z-50" style={{ pointerEvents: 'none' }}>
                            <div className="text-sm">Score: {score}</div>
                            <div className="text-xs">Size: {playerSize.toFixed(1)}</div>
                            <div className="text-xs mt-1 text-green-400">Green fish are edible</div>
                            <div className="text-xs text-red-400">Red fish are dangerous</div>
                        </div>

                        {/* Fullscreen toggle button */}
                        <button
                            onClick={toggleFullscreen}
                            className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-lg hover:bg-black/70 transition-colors z-50"
                            style={{ pointerEvents: 'auto' }}
                            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                        >
                            {isFullscreen ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path>
                                </svg>
                            )}
                        </button>
                    </>
                )}

                {gameOver && (
                    <div
                        className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-50"
                        style={{ pointerEvents: 'auto' }}
                    >
                        <h2 className="text-3xl font-bold text-red-500 mb-2">Game Over</h2>
                        <p className="text-white mb-1">Your Score: {score}</p>
                        <p className="text-white mb-4">High Score: {highScore}</p>
                        <button
                            onClick={resetGame}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
                        >
                            Play Again
                        </button>

                        {isFullscreen && (
                            <button
                                onClick={toggleFullscreen}
                                className="mt-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center"
                            >
                                <svg className="mr-2" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
                                </svg>
                                Exit Fullscreen
                            </button>
                        )}
                    </div>
                )}

                {!gameStarted && (
                    <div
                        className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-center z-50"
                        style={{ pointerEvents: 'auto' }}
                    >
                        <h2 className="text-3xl font-bold text-blue-400 mb-2">Fish Frenzy</h2>
                        <p className="text-white max-w-md mb-4 px-4">
                            Swim around using arrow keys or WASD. Eat smaller fish to grow,
                            but watch out for larger predators!
                        </p>
                        <button
                            onClick={() => setGameStarted(true)}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
                        >
                            Start Game
                        </button>
                    </div>
                )}
                {/* Touch */}
                <JoystickControl
                    keysPressed={keysPressed}
                    gameStarted={gameStarted}
                    gameOver={gameOver}
                    loading={loading}
                />
            </div>

            {!isFullscreen && (
                <div className="mt-4 text-sm text-gray-600">
                    <p className="font-medium">Controls:</p>
                    <p>Arrow Keys or WASD to move. Hold Shift to swim faster! Eat smaller fish, avoid bigger ones!</p>
                </div>
            )}
        </div>
    );
}