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
            color: 0x3b82f6, // blue-500
            transparent: true,
            opacity: 0.7,
            wireframe: true,
        });
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        scene.add(sphere);

        // Add a glow effect
        const glowGeometry = new THREE.SphereGeometry(3.2, 32, 32);
        const glowMaterial = new THREE.MeshPhongMaterial({
            color: 0x3b82f6,
            transparent: true,
            opacity: 0.3,
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
            canvas.width = 128;
            canvas.height = 128;
            const context = canvas.getContext('2d');
            if (context) {
                context.font = '80px Arial';
                context.textAlign = 'center';
                context.textBaseline = 'middle';
                context.fillText(skill.icon, 64, 64);
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

            // Scale down the sprite
            sprite.scale.set(2, 2, 1);

            // Store animation data and skill info with the sprite
            sprite.userData = {
                angle: angle,
                radius: radius,
                offsetY: offsetY,
                rotationSpeed: 0.001 + Math.random() * 0.001,
                pulseSpeed: 0.01 + Math.random() * 0.01,
                pulsePhase: Math.random() * Math.PI * 2,
                skillName: skill.name,
                originalScale: 2
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
            spriteGlow.scale.set(3, 3, 1); // Larger than the original sprite
            spriteGlow.userData = { 
                isGlow: true,
                forSprite: sprite
            };
            
            scene.add(spriteGlow);
            iconParticles.push(spriteGlow);
        });

        // Create smaller particles for background effect
        const particleCount = 100;
        const particleGeometry = new THREE.BufferGeometry();
        const particlePositions = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            particlePositions[i3] = (Math.random() - 0.5) * 30;
            particlePositions[i3 + 1] = (Math.random() - 0.5) * 30;
            particlePositions[i3 + 2] = (Math.random() - 0.5) * 30;
        }

        particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

        const particleMaterial = new THREE.PointsMaterial({
            color: 0x3b82f6,
            size: 0.1,
            transparent: true,
            opacity: 0.8
        });

        const particles = new THREE.Points(particleGeometry, particleMaterial);
        scene.add(particles);

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

            // Rotate the background particles
            particles.rotation.y += 0.0005;
            particles.rotation.x += 0.0002;

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
                className={`w-full ${height} rounded-lg relative overflow-hidden bg-gradient-to-r from-blue-50 to-indigo-50 shadow-inner`}
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