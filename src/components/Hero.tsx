"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import { TypeAnimation } from 'react-type-animation';
import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function Hero() {
    // Use state to hold the generated values
    const [bubbles, setBubbles] = useState<Array<{
        width: number;
        height: number;
        left: string;
        top: string;
        duration: number;
    }>>([]);

    // Generate random values only on the client after initial render
    useEffect(() => {
        const newBubbles = Array(3).fill(0).map((_, i) => ({
            width: Math.random() * 100 + 50,
            height: Math.random() * 100 + 50,
            left: `${Math.random() * 80 + 10}%`,
            top: `${Math.random() * 80 + 10}%`,
            duration: 3 + i
        }));
        setBubbles(newBubbles);
    }, []);

    return (
        <section id="home" className="min-h-screen flex items-center pt-16 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute inset-0 -z-10">
                <div className="absolute top-20 right-20 w-64 h-64 bg-blue-100 rounded-full blur-3xl opacity-70"></div>
                <div className="absolute bottom-20 left-20 w-72 h-72 bg-purple-100 rounded-full blur-3xl opacity-70"></div>

                {/* Only render bubbles when they've been generated client-side */}
                {bubbles.map((bubble, i) => (
                    <motion.div
                        key={i}
                        className="absolute bg-blue-300/20 rounded-full"
                        style={{
                            width: bubble.width,
                            height: bubble.height,
                            left: bubble.left,
                            top: bubble.top,
                        }}
                        animate={{
                            y: [0, -10, 0],
                            x: [0, 5, 0],
                            scale: [1, 1.05, 1],
                        }}
                        transition={{
                            duration: bubble.duration,
                            repeat: Infinity,
                            repeatType: "reverse",
                        }}
                    />
                ))}
            </div>

            <div className="container mx-auto px-4">
                <div className="flex flex-col md:flex-row items-center">
                    <div className="md:w-2/3">
                        <motion.h1
                            className="text-5xl md:text-7xl font-bold mb-6"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            Hi, I'm <span className="text-blue-500">Ron Hershkovitz</span>
                        </motion.h1>
                        <motion.div
                            className="text-2xl md:text-3xl text-gray-700 mb-8 h-16"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                        >
                            <TypeAnimation
                                sequence={[
                                    'Software Engineer',
                                    2000,
                                    'AI Specialist',
                                    2000,
                                    'Cybersecurity Expert',
                                    2000,
                                    'Data Engineer',
                                    2000,
                                ]}
                                wrapper="h2"
                                speed={50}
                                repeat={Infinity}
                            />
                        </motion.div>

                        <motion.p
                            className="text-lg max-w-2xl mb-8 text-gray-600"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                        >
                            Software engineer with expertise in AI, cybersecurity, and data engineering.
                            Experienced in leading technical teams and developing LLM-powered automation,
                            sentiment analysis, and large-scale data systems.
                        </motion.p>

                        <motion.div
                            className="flex gap-4"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                        >
                            <Link href="#portfolio">
                                <button className="bg-blue-500 text-white px-6 py-3 rounded-md hover:bg-blue-600 transition-colors">
                                    View My Projects
                                </button>
                            </Link>
                            <Link href="#contact">
                                <button className="border border-blue-500 text-blue-500 px-6 py-3 rounded-md hover:bg-blue-50 transition-colors">
                                    Contact Me
                                </button>
                            </Link>
                        </motion.div>

                        <motion.div
                            className="flex gap-6 mt-8"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.4 }}
                        >
                            <a href="https://github.com/Ron-312" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-blue-500 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                </svg>
                            </a>
                            <a href="mailto:ron9hm1@gmail.com" className="text-gray-600 hover:text-blue-500 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M0 3v18h24v-18h-24zm21.518 2l-9.518 7.713-9.518-7.713h19.036zm-19.518 14v-11.817l10 8.104 10-8.104v11.817h-20z" />
                                </svg>
                            </a>
                            <a href="tel:0546787479" className="text-gray-600 hover:text-blue-500 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M20 22.621l-3.521-6.795c-.008.004-1.974.97-2.064 1.011-2.24 1.086-6.799-7.82-4.609-8.994l2.083-1.026-3.493-6.817-2.106 1.039c-7.202 3.755 4.233 25.982 11.6 22.615.121-.055 2.102-1.029 2.11-1.033z" />
                                </svg>
                            </a>
                        </motion.div>

                        <motion.div
                            className="flex flex-wrap gap-2 mt-8 max-w-xl"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.5 }}
                        >
                            {['Python', 'TypeScript', 'LLMs', 'SQL', 'Data Engineering', 'Cybersecurity'].map((skill, index) => (
                                <motion.span
                                    key={skill}
                                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.6 + (index * 0.1) }}
                                    whileHover={{ scale: 1.05, backgroundColor: '#EBF4FF' }}
                                >
                                    {skill}
                                </motion.span>
                            ))}
                        </motion.div>
                    </div>

                    <div className="md:block md:w-1/3">
                        <motion.div
                            className="relative w-80 h-80 mx-auto group"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5, delay: 0.4 }}
                            whileHover={{ rotate: [0, 2, 0] }}
                        >
                            {/* Decorative elements */}
                            <div className="absolute -top-4 -right-4 w-20 h-20 bg-blue-500/20 rounded-full group-hover:scale-110 transition-transform duration-300"></div>
                            <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-purple-500/20 rounded-full group-hover:scale-110 transition-transform duration-300"></div>

                            {/* Image frame */}
                            {/* First background layer - gradient with blur */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-xl opacity-70 rotate-3 group-hover:opacity-80 transition-all duration-300 blur-[3px] overflow-hidden">
                                <Image
                                    src="/images/ron-profile.jpg"
                                    alt="Ron Hershkovitz"
                                    width={320}
                                    height={320}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 filter brightness-110"
                                    onError={(e) => {
                                        console.error("Image failed to load");
                                        // Fallback handled by Next.js
                                    }}
                                />
                            </div>

                            {/* Second background layer - white with blur */}
                            <div className="absolute inset-0 bg-white rounded-xl rotate-6 group-hover:rotate-5 transition-transform duration-300 blur-[2px] overflow-hidden">
                                <Image
                                    src="/images/ron-profile.jpg"
                                    alt="Ron Hershkovitz"
                                    width={320}
                                    height={320}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 filter brightness-105"
                                    onError={(e) => {
                                        console.error("Image failed to load");
                                        // Fallback handled by Next.js
                                    }}
                                />
                            </div>
                            <div className="absolute inset-0 bg-white rounded-xl overflow-hidden border-2 border-gray-100 shadow-xl">
                                <Image
                                    src="/images/ron-profile.jpg"
                                    alt="Ron Hershkovitz"
                                    width={320}
                                    height={320}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    onError={(e) => {
                                        console.error("Image failed to load");
                                        // Fallback handled by Next.js
                                    }}
                                />
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    );
}