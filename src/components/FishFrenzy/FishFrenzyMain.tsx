"use client";

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
// import { motion } from 'framer-motion';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

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
        modelPath: "/gameModels/11097_squid_v1.glb",
        scale: { x: 0.02, y: 0.02, z: 0.02 },
        speed: 0.036,
        sizeCategory: "medium-small"
    },
    {
        name: "Black Moor Goldfish",
        modelPath: "/gameModels/12990_Black_Moor_Goldfish_v1_l2.glb",
        scale: { x: 0.015, y: 0.015, z: 0.015 },
        speed: 0.025,
        sizeCategory: "small"
    },
    {
        name: "Hammerhead Shark",
        modelPath: "/gameModels/19412_Hammerhead_Shark_v2.glb",
        scale: { x: 0.04, y: 0.04, z: 0.04 },
        speed: 0.035,
        sizeCategory: "large"
    },
    {
        name: "Rainbow Trout",
        modelPath: "/gameModels/21859_Rainbow_Trout_v1.glb",
        scale: { x: 0.025, y: 0.025, z: 0.025 },
        speed: 0.01,
        sizeCategory: "medium"
    },
    {
        name: "Goblin Shark",
        modelPath: "/gameModels/21861_Goblin_Shark_v1.glb",
        scale: { x: 0.05, y: 0.05, z: 0.05 },
        speed: 0.02,
        sizeCategory: "extra-large"
    }
];

// ────────────────────────────────────────────────────────────────
// Set up one GLTFLoader with DRACO compression
const draco = new DRACOLoader();
// point this at the folder containing draco_decoder.js / wasm files
draco.setDecoderPath('/draco/');

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(draco);
// ────────────────────────────────────────────────────────────────

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

    const tempVector = new THREE.Vector3();
    const fishPool: THREE.Group[] = [];

    const fishMaterials = {
        edible: {} as Record<string, THREE.MeshPhongMaterial>,
        dangerous: {} as Record<string, THREE.MeshPhongMaterial>,
    };
    const tempPosition = new THREE.Vector3();

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

    // Add this function to handle fullscreen toggle
    const toggleFullscreen = () => {
        const gameElement = gameRef.current as FullscreenElement | null;
        if (!gameElement) return;

        // — iOS fallback: just toggle state, since requestFullscreen is ignored —
        if (isIOS) {
            setIsFullscreen(prev => !prev);
            return;
        }

        // — non-iOS: use the native Fullscreen API —
        if (!isFullscreen) {
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
        const isMobile = window.innerWidth < 600;

        setLoading(true);
        const currentRef = gameRef.current;

        let animationFrameId: number;
        let isGameOver = false;
        let playerFish: THREE.Group;
        let playerFishModel: THREE.Group | null = null;
        const fishList: { object: THREE.Object3D, speed: number, direction: THREE.Vector3, type: string, size: string, exactSize: number }[] = [];
        const playerSpeed = 0.07;
        let playerScore = 0;
        let currentPlayerSize = playerSize;

        let gridFrame = 0;
        const CELL_SIZE = 8;  // tweak up/down to balance bucket density


        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0077be);

        const clock = new THREE.Clock();    // for measuring real time
        const logicStep = 1 / 30;               // 30 updates per second (≈33 ms)
        let logicAccum = 0;                    // “time debt” accumulator

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
        renderer.setPixelRatio(isMobile ? 1 : Math.min(window.devicePixelRatio, 1.2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
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

        const particleCount = isMobile ? 200 : 1000;
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

        if (!isMobile) scene.fog = new THREE.FogExp2(0x0077be, 0.02);

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


        let treeCoralGeo: THREE.BufferGeometry;
        let treeCoralMat: THREE.Material;

        let enviroCoralGeo: THREE.BufferGeometry;
        let enviroCoralMat: THREE.Material;


        const loadTreeCoral = new Promise<void>((resolve, reject) => {
            gltfLoader.load(
                '/gameModels/21488_Tree_Coral_v2_NEW.glb',
                (gltf) => {
                    const mesh = gltf.scene.children.find(
                        (c): c is THREE.Mesh => c instanceof THREE.Mesh
                    );
                    if (!mesh) {
                        return reject(new Error('Tree coral mesh not found'));
                    }
                    treeCoralGeo = mesh.geometry.clone();
                    treeCoralGeo.applyMatrix4(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
                    treeCoralGeo.applyMatrix4(
                        new THREE.Matrix4().makeRotationZ(Math.PI)
                    );
                    const mat = mesh.material;
                    treeCoralMat = Array.isArray(mat) ? mat[0] : mat;

                    // ←—— Call resolve() here so Promise.all can complete!
                    resolve();
                },
                undefined,
                (err) => {
                    console.error('Tree coral load failed:', err);
                    reject(err);
                }
            );
        });


        const loadEnviroCoral = new Promise<void>((resolve, reject) => {
            gltfLoader.load(
                '/gameModels/underwater_enviro_coral.glb',
                (gltf) => {
                    const mesh = gltf.scene.children.find(
                        (c): c is THREE.Mesh => c instanceof THREE.Mesh
                    );
                    if (!mesh) {
                        return reject(new Error('Enviro coral mesh not found'));
                    }
                    enviroCoralGeo = mesh.geometry;
                    const mat = mesh.material;
                    enviroCoralMat = Array.isArray(mat) ? mat[0] : mat;
                    resolve();
                },
                undefined,
                (err) => {
                    console.error('Env coral load failed:', err);
                    reject(err);
                }
            );
        });


        // Add underwater plants/coral for the larger environment
        function addUnderwaterEnvironment() {
            // wait until both are loaded
            if (!treeCoralGeo || !treeCoralMat || !enviroCoralGeo || !enviroCoralMat) return;

            const treeCount = 15;
            const envCount = 15;

            // ——— Create two InstancedMeshes ———
            const treeInst = new THREE.InstancedMesh(treeCoralGeo, treeCoralMat, treeCount);
            const envInst = new THREE.InstancedMesh(enviroCoralGeo, enviroCoralMat, envCount);

            treeInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
            envInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

            // dummy for building matrices
            const dummy = new THREE.Object3D();

            // ——— Position “tree” corals ———
            for (let i = 0; i < treeCount; i++) {
                dummy.position.set(
                    Math.random() * 80 - 40,
                    -9.8,
                    Math.random() * 80 - 40
                );
                dummy.rotation.y = Math.random() * Math.PI * 2;
                const s = 0.8 + Math.random() * 1.2;
                dummy.scale.set(s, s, s);
                dummy.updateMatrix();
                treeInst.setMatrixAt(i, dummy.matrix);
            }

            // ——— Position “environment” corals ———
            for (let i = 0; i < envCount; i++) {
                dummy.position.set(
                    Math.random() * 80 - 40,
                    -9.8,
                    Math.random() * 80 - 40
                );
                dummy.rotation.y = Math.random() * Math.PI * 2;
                const s = 0.8 + Math.random() * 1.2;
                dummy.scale.set(s, s, s);
                dummy.updateMatrix();
                envInst.setMatrixAt(i, dummy.matrix);
            }

            treeInst.instanceMatrix.needsUpdate = true;
            envInst.instanceMatrix.needsUpdate = true;

            // add both to scene in one go
            scene.add(treeInst, envInst);
        }


        // Call this function after you've created the ocean floor
        Promise.all([loadTreeCoral, loadEnviroCoral])
            .then(() => {
                addUnderwaterEnvironment();
            })
            .catch((err) => {
                console.error('Failed to load one or more coral models:', err);
            });

        function loadPlayerFish(size: number): Promise<THREE.Group> {
            return new Promise((resolve, reject) => {

                // interface LoaderProgress {
                //     loaded: number;
                //     total: number;
                // }
                gltfLoader.load(
                    '/gameModels/13007_Blue-Green_Reef_Chromis_v2_l3.glb',
                    (gltf) => {
                        // 1) Grab the scene Group out of the GLB
                        const object = gltf.scene;

                        // 2) Your existing material + scale logic (unchanged)
                        object.traverse((child: THREE.Object3D) => {
                            if (child instanceof THREE.Mesh) {
                                child.material = new THREE.MeshPhongMaterial({
                                    color: 0x2cc8de,     // Bright teal blue
                                    shininess: 100,
                                    specular: 0x333333,
                                    emissive: 0x114455,  // Slight glow
                                    emissiveIntensity: 0.2
                                });
                            }
                        });

                        const scaleFactor: number = size * 0.1;
                        object.scale.set(scaleFactor, scaleFactor, scaleFactor);

                        // 3) Cache the model for reuse
                        if (!playerFishModel) {
                            playerFishModel = object.clone();
                        }

                        // 4) Resolve the promise with your THREE.Group
                        resolve(object);
                    },
                    (progressEvent) => {
                        // Optional progress logging
                        if (progressEvent.total) {
                            const pct = Math.floor((progressEvent.loaded / progressEvent.total) * 100);
                            console.log(`${pct}% loaded`);
                        }
                    },
                    (error) => {
                        console.error('Error loading player GLB model:', error);
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
            // 1. Check if we can reuse a fish from the pool
            if (fishPool.length > 0) {
                const recycledFish = fishPool.pop()!;

                // Calculate size
                let exactSize: number;
                switch (fishType.sizeCategory) {
                    case "small": exactSize = 0.5 + Math.random() * 0.3; break;
                    case "medium-small": exactSize = 1.0 + Math.random() * 0.3; break;
                    case "medium": exactSize = 1.5 + Math.random() * 0.3; break;
                    case "large": exactSize = 2.0 + Math.random() * 0.5; break;
                    case "extra-large": exactSize = 2.8 + Math.random() * 1.0; break;
                    default: exactSize = 1.0;
                }

                // Reset scale (reuse fish but with new size)
                recycledFish.scale.set(
                    fishType.scale.x * exactSize,
                    fishType.scale.y * exactSize,
                    fishType.scale.z * exactSize
                );

                // Find position
                let x = 0, y = 0, z = 0;
                const minDistance = fishList.length === 0 ? 20 : 10;

                // Maximum 5 attempts to find a suitable position (avoids infinite loops)
                for (let attempts = 0; attempts < 5; attempts++) {
                    x = Math.random() * 80 - 40;
                    y = Math.random() * 20 - 10;
                    z = Math.random() * 80 - 40;

                    if (!playerFish) break; // No player, any position is fine

                    // Use temp vector to avoid creating new objects
                    tempPosition.set(x, y, z);
                    const distance = tempPosition.distanceTo(playerFish.position);

                    if (distance > minDistance) break;

                    // Last attempt - use position anyway but push it farther
                    if (attempts === 4) {
                        const dirFromPlayer = tempPosition.sub(playerFish.position).normalize();
                        tempPosition.addScaledVector(dirFromPlayer, minDistance);
                        x = tempPosition.x;
                        y = tempPosition.y;
                        z = tempPosition.z;
                    }
                }

                recycledFish.position.set(x, y, z);
                recycledFish.rotation.set(
                    Math.PI / 2,
                    Math.random() * Math.PI * 2,
                    0
                );

                // Reuse or create material based on edible/dangerous
                const materialType = exactSize < currentPlayerSize ? 'edible' : 'dangerous';
                const hue = materialType === 'edible'
                    ? 0.3 + Math.random() * 0.3  // green/blue
                    : Math.random() * 0.15;      // red/orange

                // Create a material key based on approximate hue (limit to 5 variations)
                const materialKey = `${materialType}_${Math.floor(hue * 10)}`;

                // Reuse existing material or create new one (limit total materials)
                if (!fishMaterials[materialType][materialKey]) {
                    if (Object.keys(fishMaterials[materialType]).length >= 5) {
                        // Reuse an existing material if we have too many
                        const existingKey = Object.keys(fishMaterials[materialType])[0];
                        fishMaterials[materialType][materialKey] = fishMaterials[materialType][existingKey];
                    } else {
                        // Create new material
                        fishMaterials[materialType][materialKey] = new THREE.MeshPhongMaterial({
                            color: new THREE.Color().setHSL(hue, 0.7, 0.5),
                            shininess: 50, // Reduced shininess 
                            specular: 0x111111 // Reduced specular
                        });
                    }
                }

                // Apply material to all mesh parts
                recycledFish.traverse((child: THREE.Object3D) => {
                    if (child instanceof THREE.Mesh) {
                        child.material = fishMaterials[materialType][materialKey];
                    }
                });

                // Make visible and add back to scene
                recycledFish.visible = true;
                scene.add(recycledFish);

                // Add to fish list
                fishList.push({
                    object: recycledFish,
                    speed: fishType.speed * (0.7 + Math.random() * 0.6),
                    direction: new THREE.Vector3(
                        Math.random() - 0.5,
                        Math.random() - 0.5,
                        Math.random() - 0.5
                    ).normalize(),
                    type: fishType.name,
                    size: fishType.sizeCategory,
                    exactSize: exactSize
                });

                return; // Done with recycled fish
            }

            // 2. If no recycled fish available, load a new one (existing code but with reduced complexity)
            let exactSize: number;
            switch (fishType.sizeCategory) {
                case "small": exactSize = 0.5 + Math.random() * 0.3; break;
                case "medium-small": exactSize = 1.0 + Math.random() * 0.3; break;
                case "medium": exactSize = 1.5 + Math.random() * 0.3; break;
                case "large": exactSize = 2.0 + Math.random() * 0.5; break;
                case "extra-large": exactSize = 2.8 + Math.random() * 1.0; break;
                default: exactSize = 1.0;
            }

            // Use a simplified loading approach for new fish
            gltfLoader.load(
                fishType.modelPath,
                (gltf) => {
                    // 1) grab your fish model
                    const object = gltf.scene;

                    // 2) scale
                    object.scale.set(
                        fishType.scale.x * exactSize,
                        fishType.scale.y * exactSize,
                        fishType.scale.z * exactSize
                    );

                    // 3) position logic (unchanged)
                    let x = Math.random() * 80 - 40;
                    let y = Math.random() * 20 - 10;
                    let z = Math.random() * 80 - 40;
                    if (playerFish) {
                        tempPosition.set(x, y, z);
                        const distance = tempPosition.distanceTo(playerFish.position);
                        if (distance < 10) {
                            const dir = tempPosition.sub(playerFish.position).normalize();
                            tempPosition.addScaledVector(dir, 10);
                            x = tempPosition.x; y = tempPosition.y; z = tempPosition.z;
                        }
                    }
                    object.position.set(x, y, z);
                    object.rotation.set(Math.PI / 2, Math.random() * Math.PI * 2, 0);

                    // 4) material logic (unchanged)
                    const materialType = exactSize < currentPlayerSize ? 'edible' : 'dangerous';
                    const hue = materialType === 'edible'
                        ? 0.3 + Math.random() * 0.3
                        : Math.random() * 0.15;
                    const key = `${materialType}_${Math.floor(hue * 10)}`;
                    if (!fishMaterials[materialType][key]) {
                        if (Object.keys(fishMaterials[materialType]).length >= 5) {
                            fishMaterials[materialType][key] =
                                fishMaterials[materialType][Object.keys(fishMaterials[materialType])[0]];
                        } else {
                            fishMaterials[materialType][key] = new THREE.MeshPhongMaterial({
                                color: new THREE.Color().setHSL(hue, 0.7, 0.5),
                                shininess: 50,
                                specular: 0x111111
                            });
                        }
                    }
                    object.traverse(child => {
                        if (child instanceof THREE.Mesh) {
                            child.material = fishMaterials[materialType][key];
                        }
                    });

                    // 5) add to scene & list
                    scene.add(object);
                    fishList.push({
                        object,
                        speed: fishType.speed * (0.7 + Math.random() * 0.6),
                        direction: new THREE.Vector3(
                            Math.random() - 0.5,
                            Math.random() - 0.5,
                            Math.random() - 0.5
                        ).normalize(),
                        type: fishType.name,
                        size: fishType.sizeCategory,
                        exactSize
                    });
                },
                undefined,
                (error) => {
                    console.error('Error loading fish GLB model:', error);
                }
            );
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
            if (frameCount % 3 !== 0) return;

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
            const playerPos = tempVector.copy(playerFish.position);

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

                        // Add to pool instead of destroying
                        if (fishPool.length < 10) { // Limit pool size
                            fishPool.push(fish as THREE.Group);
                        }

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
            const particleCount = 500; // Doubled from 2000
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
            const maxFrames = 30;

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

        // ─────── Broad-phase collision grid ───────
        const GRID = new Map<string, number[]>(); // cellKey → array of fishList indices

        function gridKey(v: THREE.Vector3, cellSize: number) {
            const x = Math.floor(v.x / cellSize);
            const y = Math.floor(v.y / cellSize);
            const z = Math.floor(v.z / cellSize);
            return `${x}|${y}|${z}`;
        }

        /** Rebuilds the grid buckets. Call this every 10 frames or on spawn/remove. */
        function rebuildGrid(cellSize = 8) {
            GRID.clear();
            fishList.forEach((fish, idx) => {
                const key = gridKey(fish.object.position, cellSize);
                const bucket = GRID.get(key) ?? [];
                bucket.push(idx);
                GRID.set(key, bucket);
            });
        }

        // put this just once, outside updateFish(), next to yaw/pitch
        const BASE_Q = new THREE.Quaternion()
            .setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);

        let yaw = 0;     // around Z (+ = turn left, − = turn right)
        let pitch = 0;   // around X (+ = nose up,  − = nose down)

        function updateFish() {
            // ───────────────── GRID UPDATE ─────────────────
            gridFrame++;
            if (gridFrame % 10 === 0) rebuildGrid(CELL_SIZE);

            // ───────────────── INPUT → YAW/PITCH ─────────────────
            const step = rotationAcceleration;
            if (keysPressed.current['d']) yaw += step;
            if (keysPressed.current['a']) yaw -= step;
            if (keysPressed.current['w']) pitch += step;
            if (keysPressed.current['s']) pitch -= step;

            // clamp pitch a bit so you can always look forward/down
            const maxPitch = Math.PI / 2 - 0.05;
            pitch = Math.max(-maxPitch, Math.min(maxPitch, pitch));

            // ───────────────── BUILD CLEAN ORIENTATION ─────────────────
            //   1. start with your fixed +90° X rotation (BASE_Q)
            //   2. yaw around Z
            //   3. pitch around X   (order Z → X so there’s never roll)
            const qYaw = new THREE.Quaternion()
                .setFromAxisAngle(new THREE.Vector3(0, 0, 1), yaw);
            const qPitch = new THREE.Quaternion()
                .setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitch);

            playerFish.quaternion.copy(BASE_Q)      // reset to baseline
                .multiply(qYaw)       // yaw
                .multiply(qPitch);    // then pitch

            // ───────────────── MOVE FORWARD ─────────────────
            const isSprint = keysPressed.current['shift'];
            const speed = isSprint ? playerSpeed * 1.3 : playerSpeed;

            const forward = new THREE.Vector3(0, -1, 0)
                .applyQuaternion(playerFish.quaternion)
                .normalize();
            playerFish.position.addScaledVector(forward, speed);

            // floor clamp
            if (playerFish.position.y < -9) playerFish.position.y = -9;

            // ───────────────── CAMERA FOLLOW ─────────────────
            const camDist = 4 + currentPlayerSize;
            const camHeight = 2.5 + currentPlayerSize * 0.4;
            camera.position.lerp(
                playerFish.position.clone()
                    .add(forward.clone().negate().multiplyScalar(camDist))
                    .add(new THREE.Vector3(0.7, camHeight, 0)),
                0.05
            );
            camera.lookAt(
                playerFish.position.clone()
                    .add(forward.clone().multiplyScalar(3 + currentPlayerSize))
            );

            // ───────────────── ENEMY FISH, COLLISIONS, SPAWN, ETC. ─────────────────
            const time = Date.now() * 0.001;
            for (let i = 0; i < fishList.length; i++) {
                const f = fishList[i];
                const move = f.direction.clone().multiplyScalar(f.speed);
                move.x += Math.sin(time + i) * 0.05;
                move.y += Math.cos(time + i) * 0.025;
                f.object.position.add(move);

                // walls
                if (Math.abs(f.object.position.x) > 30) {
                    f.direction.x *= -1; f.object.position.x = Math.sign(f.object.position.x) * 30;
                }
                if (f.object.position.y > 10) {
                    f.direction.y *= -1; f.object.position.y = 10;
                } else if (f.object.position.y < -9) {
                    f.direction.y = Math.abs(f.direction.y); f.object.position.y = -9;
                }
                if (Math.abs(f.object.position.z) > 30) {
                    f.direction.z *= -1; f.object.position.z = Math.sign(f.object.position.z) * 30;
                }

                // face swim direction
                f.object.lookAt(f.object.position.clone().add(f.direction));
                f.object.rotation.z = Math.sin(time + i) * 0.1;
            }

            checkCollision();
            if (Date.now() % 2000 < 20) spawnFish(3);
            particles.rotation.y += 0.0001;
        }


        function animate() {
            if (isGameOver) return;
            animationFrameId = requestAnimationFrame(animate);

            const dt = clock.getDelta();
            logicAccum += dt;

            // catch up simulation in fixed slices
            while (logicAccum >= logicStep) {
                updateFish();
                logicAccum -= logicStep;
            }

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
                className={`
                w-full ${height} bg-blue-900 rounded-lg overflow-hidden relative
                ${isIOS && isFullscreen ? 'fixed inset-0 w-screen h-screen z-50' : ''}
        `}
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