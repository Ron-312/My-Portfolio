"use client";

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface Skill {
    name: string;
    icon: string;
    color: string;
}

interface SkillsVisualizationProps {
    skills: Skill[];
    height?: string;
}

export default function SkillsVisualization({ skills, height = "h-64" }: SkillsVisualizationProps) {
    const threeRef = useRef<HTMLDivElement>(null);
    const [hoveredSkill, setHoveredSkill] = useState<string | null>(null);

    useEffect(() => {
        if (!threeRef.current) return;

        // Store the ref in a variable to use in cleanup
        const currentRef = threeRef.current;

        // Scene setup
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, currentRef.clientWidth / currentRef.clientHeight, 0.1, 1000);
        camera.position.z = 15;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(currentRef.clientWidth, currentRef.clientHeight);
        renderer.setClearColor(0x000000, 0); // transparent background
        renderer.setPixelRatio(window.devicePixelRatio); // Set higher pixel ratio for sharpness
        currentRef.appendChild(renderer.domElement);

        // Add OrbitControls for interactive rotation
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.rotateSpeed = 0.7;
        controls.enableZoom = false; // Disable zooming for simplicity
        controls.autoRotate = true;  // Auto-rotate for ambient motion
        controls.autoRotateSpeed = 0.5; // Slow auto-rotation

        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 5, 5);
        scene.add(directionalLight);

        const sphereGeometry = new THREE.SphereGeometry(3, 32, 32);
        const sphereMaterial = new THREE.MeshPhongMaterial({
            color: 0x93c5fd, // Changed from 0x3b82f6 (blue-500) to 0x93c5fd (blue-300)
            transparent: true,
            opacity: 0.5, // Reduced from 0.7 to make it lighter
            wireframe: true,
        });
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        scene.add(sphere);

        // Add a glow effect
        const glowGeometry = new THREE.SphereGeometry(3.2, 32, 32);
        const glowMaterial = new THREE.MeshPhongMaterial({
            color: 0x93c5fd, // Match the lighter blue
            transparent: true,
            opacity: 0.2, // Slightly reduced to balance with the main sphere
            side: THREE.BackSide,
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        scene.add(glow);

        // Create orbiting skill planets
        const iconParticles: THREE.Object3D[] = [];
        const skillMap = new Map<THREE.Object3D, Skill>();

        // Create sprites for each skill
        skills.forEach((skill, index) => {
            // Create canvas for emoji texture
            const canvas = document.createElement('canvas');
            canvas.width = 160; // Increased from 128
            canvas.height = 160; // Increased from 128
            const context = canvas.getContext('2d');
            if (context) {
                context.font = '100px Arial'; // Increased from 80px
                context.textAlign = 'center';
                context.textBaseline = 'middle';
                context.fillText(skill.icon, 80, 80); // Center coordinates updated for larger canvas
            }

            // Create texture and sprite material
            const texture = new THREE.CanvasTexture(canvas);
            const spriteMaterial = new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
            });

            const sprite = new THREE.Sprite(spriteMaterial);

            // Position in orbital pattern
            const angle = (index / skills.length) * Math.PI * 2;
            const radius = 7;
            const offsetY = (index % 2) * 2 - 1; // Alternate up and down

            // Initial position
            sprite.position.x = Math.cos(angle) * radius;
            sprite.position.y = offsetY + Math.sin(angle) * radius * 0.5;
            sprite.position.z = Math.sin(angle) * radius;

            // Scale up the sprite
            sprite.scale.set(2.5, 2.5, 1); // Increased from 2, 2, 1

            // Store animation data and skill info with the sprite
            sprite.userData = {
                angle: angle,
                radius: radius,
                offsetY: offsetY,
                rotationSpeed: 0.001 + Math.random() * 0.001,
                pulseSpeed: 0.01 + Math.random() * 0.01,
                pulsePhase: Math.random() * Math.PI * 2,
                skillName: skill.name,
                originalScale: 2.5 // Increased from 2
            };

            // Map the sprite to its skill for easy lookup
            skillMap.set(sprite, skill);

            iconParticles.push(sprite);
            scene.add(sprite);

            // Create a glow effect for the sprite (initially invisible)
            const spriteGlowMaterial = new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                opacity: 0,
                color: 0xffff00 // Yellow glow
            });
            
            const spriteGlow = new THREE.Sprite(spriteGlowMaterial);
            spriteGlow.position.copy(sprite.position);
            spriteGlow.scale.set(3.8, 3.8, 1); // Increased from 3, 3, 1
            spriteGlow.userData = { 
                isGlow: true,
                forSprite: sprite
            };
            
            scene.add(spriteGlow);
            iconParticles.push(spriteGlow);
        });

        // Create a more sophisticated starfield background
        const createStarfield = () => {
            const starCount = 500; // Increase from 100
            const starGeometry = new THREE.BufferGeometry();
            const starPositions = new Float32Array(starCount * 3);
            const starSizes = new Float32Array(starCount);
            const starColors = new Float32Array(starCount * 3);
            
            for (let i = 0; i < starCount; i++) {
                const i3 = i * 3;
                const radius = 15 + Math.random() * 20;
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);
                
                starPositions[i3] = radius * Math.sin(phi) * Math.cos(theta);
                starPositions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
                starPositions[i3 + 2] = radius * Math.cos(phi);
                
                starSizes[i] = 0.05 + Math.random() * Math.random() * 0.15;
                
                const colorChoice = Math.random();
                if (colorChoice < 0.6) {
                    starColors[i3] = 0.8 + Math.random() * 0.2;
                    starColors[i3 + 1] = 0.8 + Math.random() * 0.2;
                    starColors[i3 + 2] = 1.0;
                } else if (colorChoice < 0.85) {
                    starColors[i3] = 0.3 + Math.random() * 0.3;
                    starColors[i3 + 1] = 0.4 + Math.random() * 0.3;
                    starColors[i3 + 2] = 0.9 + Math.random() * 0.1;
                } else {
                    starColors[i3] = 0.8 + Math.random() * 0.2;
                    starColors[i3 + 1] = 0.4 + Math.random() * 0.2;
                    starColors[i3 + 2] = 0.9 + Math.random() * 0.1;
                }
            }
            
            starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
            starGeometry.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));
            starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
            
            const starMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    pixelRatio: { value: renderer.getPixelRatio() }
                },
                vertexShader: `
                    attribute float size;
                    attribute vec3 color;
                    varying vec3 vColor;
                    uniform float pixelRatio;
                    
                    void main() {
                        vColor = color;
                        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                        gl_PointSize = size * pixelRatio * (300.0 / -mvPosition.z);
                        gl_Position = projectionMatrix * mvPosition;
                    }
                `,
                fragmentShader: `
                    varying vec3 vColor;
                    
                    void main() {
                        vec2 center = gl_PointCoord - 0.5;
                        float dist = length(center);
                        float alpha = 1.0 - smoothstep(0.2, 0.5, dist);
                        
                        if (alpha < 0.05) discard;
                        gl_FragColor = vec4(vColor, alpha);
                    }
                `,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            
            const stars = new THREE.Points(starGeometry, starMaterial);
            scene.add(stars);
            return stars;
        };

        const starfield = createStarfield();

        // Add a subtle nebula effect in the background
        const createNebula = () => {
            const nebulaGeometry = new THREE.BufferGeometry();
            const nebulaCount = 100;
            const nebulaPositions = new Float32Array(nebulaCount * 3);
            const nebulaSizes = new Float32Array(nebulaCount);
            const nebulaColors = new Float32Array(nebulaCount * 3);
            
            for (let i = 0; i < nebulaCount; i++) {
                const i3 = i * 3;
                const radius = 12 + Math.random() * 8;
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);
                
                nebulaPositions[i3] = radius * Math.sin(phi) * Math.cos(theta);
                nebulaPositions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
                nebulaPositions[i3 + 2] = radius * Math.cos(phi);
                
                nebulaSizes[i] = 1.0 + Math.random() * 2.0;
                
                const blueVariation = Math.random();
                nebulaColors[i3] = 0.2 + blueVariation * 0.2;
                nebulaColors[i3 + 1] = 0.2 + blueVariation * 0.3;
                nebulaColors[i3 + 2] = 0.5 + blueVariation * 0.5;
            }
            
            nebulaGeometry.setAttribute('position', new THREE.BufferAttribute(nebulaPositions, 3));
            nebulaGeometry.setAttribute('size', new THREE.BufferAttribute(nebulaSizes, 1));
            nebulaGeometry.setAttribute('color', new THREE.BufferAttribute(nebulaColors, 3));
            
            const nebulaMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    pixelRatio: { value: renderer.getPixelRatio() },
                    time: { value: 0 }
                },
                vertexShader: `
                    attribute float size;
                    attribute vec3 color;
                    varying vec3 vColor;
                    uniform float pixelRatio;
                    uniform float time;
                    
                    void main() {
                        vColor = color;
                        
                        vec3 pos = position;
                        pos.x += sin(time * 0.1 + position.z * 0.5) * 0.3;
                        pos.y += cos(time * 0.1 + position.x * 0.5) * 0.3;
                        
                        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                        gl_PointSize = size * pixelRatio * (100.0 / -mvPosition.z);
                        gl_Position = projectionMatrix * mvPosition;
                    }
                `,
                fragmentShader: `
                    varying vec3 vColor;
                    
                    void main() {
                        vec2 center = gl_PointCoord - 0.5;
                        float dist = length(center);
                        float alpha = 0.15 * (1.0 - smoothstep(0.3, 0.5, dist));
                        
                        if (alpha < 0.01) discard;
                        gl_FragColor = vec4(vColor, alpha);
                    }
                `,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            
            const nebula = new THREE.Points(nebulaGeometry, nebulaMaterial);
            scene.add(nebula);
            return nebula;
        };

        const nebula = createNebula();

        // Set up raycasting for hover effects
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        let hoveredObject: THREE.Object3D | null = null;

        // Mouse move event handler
        const onMouseMove = (event: MouseEvent) => {
            // Calculate mouse position in normalized device coordinates
            const rect = currentRef.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        };

        currentRef.addEventListener('mousemove', onMouseMove);

        // Animation
        const clock = new THREE.Clock();

        const animate = (): void => {
            requestAnimationFrame(animate);
            
            // Update controls
            controls.update();

            const elapsedTime = clock.getElapsedTime();

            // Rotate the main sphere slowly
            sphere.rotation.y += 0.005;
            glow.rotation.y += 0.003;

            // Make the sphere pulse
            const pulseFactor = Math.sin(elapsedTime * 0.5) * 0.05 + 1;
            sphere.scale.set(pulseFactor, pulseFactor, pulseFactor);
            glow.scale.set(pulseFactor, pulseFactor, pulseFactor);

            // Animate each orbiting icon
            iconParticles.forEach((object) => {
                // Skip glow objects, they'll follow their parent sprites
                if (object.userData && object.userData.isGlow) {
                    const parentSprite = object.userData.forSprite;
                    if (parentSprite) {
                        object.position.copy(parentSprite.position);
                    }
                    return;
                }

                const data = object.userData;
                if (!data) return;

                // Update angle for orbit
                data.angle += data.rotationSpeed;

                // Calculate new position
                object.position.x = Math.cos(data.angle) * data.radius;
                object.position.y = data.offsetY + Math.sin(data.angle) * data.radius * 0.5;
                object.position.z = Math.sin(data.angle) * data.radius;

                // Make the sprite pulse
                const pulseFactor = Math.sin(elapsedTime * data.pulseSpeed + data.pulsePhase) * 0.1 + 1;
                object.scale.set(data.originalScale * pulseFactor, data.originalScale * pulseFactor, 1);
            });

            // Animate nebula
            if (nebula && nebula.material instanceof THREE.ShaderMaterial) {
                nebula.material.uniforms.time.value = elapsedTime;
                nebula.rotation.y += 0.0001; // Very slow rotation
            }

            // Animate starfield
            if (starfield) {
                starfield.rotation.y += 0.0002;
            }

            // Check for hover intersections
            raycaster.setFromCamera(mouse, camera);
            
            // Only check for intersections with actual sprites (not glow effects)
            const actualSprites = iconParticles.filter(obj => !obj.userData?.isGlow);
            const intersects = raycaster.intersectObjects(actualSprites);

            // Handle hover states
            if (intersects.length > 0) {
                const intersectedObject = intersects[0].object;
                
                if (hoveredObject !== intersectedObject) {
                    // Reset previous hover
                    if (hoveredObject) {
                        const prevGlow = iconParticles.find(obj => 
                            obj.userData?.isGlow && obj.userData.forSprite === hoveredObject
                        );
                        if (prevGlow && prevGlow instanceof THREE.Sprite) {
                            prevGlow.material.opacity = 0;
                        }
                        // Add this line to restore the original sprite visibility
                        if (hoveredObject instanceof THREE.Sprite) {
                            hoveredObject.visible = true;
                        }
                        setHoveredSkill(null);
                    }
                    
                    // Set new hover
                    hoveredObject = intersectedObject;
                    const newGlow = iconParticles.find(obj => 
                        obj.userData?.isGlow && obj.userData.forSprite === hoveredObject
                    );
                    if (newGlow && newGlow instanceof THREE.Sprite) {
                        newGlow.material.opacity = 0.7;
                    }
                    
                    // Add this line to hide the original sprite when hovered
                    if (hoveredObject instanceof THREE.Sprite) {
                        hoveredObject.visible = false;
                    }
                    
                    // Update hoveredSkill state
                    const skillName = hoveredObject.userData?.skillName;
                    if (skillName) {
                        setHoveredSkill(skillName);
                    }
                    
                    // Change cursor
                    currentRef.style.cursor = 'pointer';
                }
            } else if (hoveredObject) {
                // Reset hover state when not hovering
                const prevGlow = iconParticles.find(obj => 
                    obj.userData?.isGlow && obj.userData.forSprite === hoveredObject
                );
                if (prevGlow && prevGlow instanceof THREE.Sprite) {
                    prevGlow.material.opacity = 0;
                }
                // Add this line to restore the original sprite visibility
                if (hoveredObject instanceof THREE.Sprite) {
                    hoveredObject.visible = true;
                }
                hoveredObject = null;
                setHoveredSkill(null);
                currentRef.style.cursor = 'grab';
            }

            renderer.render(scene, camera);
        };

        animate();

        // Handle resize
        const handleResize = () => {
            if (!currentRef) return;
            const width = currentRef.clientWidth;
            const height = currentRef.clientHeight;

            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
        };

        window.addEventListener('resize', handleResize);

        // Cleanup function
        return () => {
            window.removeEventListener('resize', handleResize);
            currentRef.removeEventListener('mousemove', onMouseMove);
            if (currentRef && renderer) {
                scene.clear();
                renderer.dispose();
                if (currentRef.contains(renderer.domElement)) {
                    currentRef.removeChild(renderer.domElement);
                }
            }
        };
    }, [skills]);

    return (
        <div className="relative">
            <div
                className={`w-full ${height} rounded-lg relative overflow-hidden bg-gradient-to-br from-blue-900/10 via-indigo-900/10 to-purple-900/10 shadow-inner`}
                ref={threeRef}
            >
                <div className="absolute bottom-2 left-2 text-xs font-medium text-blue-700 bg-white/70 px-2 py-1 rounded">
                    Interactive 3D Skills Visualization
                </div>
            </div>
            
            {/* Show the name of the hovered skill */}
            {hoveredSkill && (
                <div className="absolute top-4 right-4 bg-white/90 px-3 py-2 rounded-lg shadow-md text-sm font-medium text-blue-700 animate-fade-in">
                    {hoveredSkill}
                </div>
            )}
        </div>
    );
}