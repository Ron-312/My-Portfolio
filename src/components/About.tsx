"use client";

import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import SkillsVisualization from './SkillsVisualization';
import FishFrenzy from './FishFrenzy';

export default function About() {
    // Use useMemo to memoize the skills array
    const skills = useMemo(() => [
        { name: "LLMs / AI", icon: "🤖", color: "bg-purple-50 text-purple-600 border-purple-200" },
        { name: "SQL", icon: "🗃️", color: "bg-yellow-50 text-yellow-600 border-yellow-200" },
        { name: "Data Engineering", icon: "📊", color: "bg-indigo-50 text-indigo-600 border-indigo-200" },
        { name: "Cybersecurity", icon: "🔒", color: "bg-red-50 text-red-600 border-red-200" },
        { name: "Web Development", icon: "🌐", color: "bg-teal-50 text-teal-600 border-teal-200" },
        { name: "Machine Learning", icon: "📈", color: "bg-pink-50 text-pink-600 border-pink-200" },
    ], []);

    const [showGame, setShowGame] = useState(false);

    return (
        <section id="about" className="py-24 bg-gradient-to-b from-gray-50 to-white">
            <div className="container mx-auto px-4">
                {/* Improved section header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    viewport={{ once: true }}
                    className="relative mb-20"
                >
                    <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 w-24 h-24 bg-blue-50 rounded-full opacity-70 z-0"></div>
                    <h2 className="text-4xl font-bold text-center relative z-10">About Me</h2>
                    <div className="w-24 h-1 bg-blue-500 mx-auto mt-4 mb-6 rounded-full"></div>
                    {/* <p className="text-center text-gray-600 max-w-2xl mx-auto leading-relaxed text-lg">
                    Software engineer specializing in AI, cybersecurity, and data engineering. Passionate about creating impactful solutions, solving challenging problems, and continuously exploring innovative technologies.
                    </p> */}
                </motion.div>

                <div className="grid md:grid-cols-2 gap-16 items-center">
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                        viewport={{ once: true }}
                        className="order-2 md:order-1"
                    >
                        <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100 relative overflow-hidden mb-8">
                            {/* Background decorative element */}
                            <div className="absolute top-0 right-0 w-40 h-40 bg-blue-50 rounded-full -translate-y-1/2 translate-x-1/2 z-0"></div>

                            <div className="relative z-10">
                                <h3 className="text-2xl font-semibold mb-6 flex items-center">
                                    <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center mr-3">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                        </svg>
                                    </span>
                                    Who I Am
                                </h3>

                                <p className="mb-4 text-gray-700 leading-relaxed">
                                    I&apos;m Ron Hershkovitz, a software engineer dedicated to solving complex problems with innovative technology.
                                    My experience across AI, cybersecurity, and data engineering equips me to approach challenges comprehensively and creatively.
                                </p>

                                <p className="mb-6 text-gray-700 leading-relaxed">
                                    I specialize in developing LLM-powered automation, sentiment analysis tools, and building robust data systems.
                                    I&apos;m constantly exploring new technologies and finding ways to optimize real-world solutions.
                                </p>

                                <div className="mb-8">
                                    <h4 className="font-medium mb-4 flex items-center">
                                        <span className="bg-blue-100 text-blue-600 w-6 h-6 rounded-full flex items-center justify-center mr-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                            </svg>
                                        </span>
                                        Education
                                    </h4>
                                    <div className="ml-8 space-y-4">
                                        <div className="relative border-l-2 border-blue-200 pl-4 pb-4">
                                            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-500"></div>
                                            <h5 className="font-medium text-gray-900">Fullstack Web Coding Bootcamp</h5>
                                            <p className="text-sm text-gray-600">Coding Academy, 2020</p>
                                            <p className="text-sm text-gray-700 mt-1">640-hour intensive program in full-stack web development, covering JavaScript, React.js, Node.js, databases, and REST APIs</p>
                                        </div>
                                        <div className="relative border-l-2 border-blue-200 pl-4">
                                            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-500"></div>
                                            <h5 className="font-medium text-gray-900">B.A. Technologies & Visual Media (Music)</h5>
                                            <p className="text-sm text-gray-600">Bar Ilan University, 2017-2019</p>
                                            <p className="text-sm text-gray-700 mt-1">Developed software tools for live music performances using Max/MSP.</p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="font-medium mb-4 flex items-center">
                                        <span className="bg-blue-100 text-blue-600 w-6 h-6 rounded-full flex items-center justify-center mr-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                                            </svg>
                                        </span>
                                        Languages
                                    </h4>
                                    <div className="flex gap-3 ml-8">
                                        <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm border border-blue-100">Hebrew (Native)</span>
                                        <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm border border-blue-100">English (Fluent)</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Game Section - New Card */}
                        <motion.div
                            className="bg-white rounded-xl p-8 shadow-lg border border-gray-100 relative overflow-hidden mt-8"
                        >
                            <div className="absolute -top-4 -right-4 w-20 h-20 bg-green-50 rounded-full"></div>
                            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-blue-50 rounded-full"></div>

                            <div className="text-center relative z-10">
                                <h3 className="text-xl font-semibold mb-4">Take a Break</h3>

                                {!showGame ? (
                                    <button
                                        onClick={() => setShowGame(true)}
                                        className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg shadow-md hover:from-blue-600 hover:to-indigo-700 transition-all transform hover:scale-105 active:scale-95"
                                    >
                                        Wanna play a game? 🐠
                                    </button>
                                ) : (
                                    <div className="space-y-4">
                                        <FishFrenzy height="h-96" />
                                        <button
                                            onClick={() => setShowGame(false)}
                                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                                        >
                                            Close Game
                                        </button>
                                        <p className="text-sm text-gray-500 max-w-md mx-auto mt-2">
                                            Eat smaller fish to grow bigger! Use arrow keys or WASD to move.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                        viewport={{ once: true }}
                        className="order-1 md:order-2"
                    >
                        <div className="flex flex-col gap-8">
                            <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100 relative">
                                <h3 className="text-2xl font-semibold mb-6 flex items-center">
                                    <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center mr-3">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                                        </svg>
                                    </span>
                                    Technical Skills
                                </h3>

                                {/* Use the new component here */}
                                <SkillsVisualization skills={skills} height="h-72" />
                            </div>
                            {/* Regular skills grid */}
                            {/* <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {skills.map((skill, index) => (
                                        <motion.div
                                            key={skill.name}
                                            initial={{ opacity: 0, y: 20 }}
                                            whileInView={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.4, delay: index * 0.1 }}
                                            viewport={{ once: true }}
                                            className={`flex items-center p-3 rounded-lg border ${skill.color} break-words`}
                                            whileHover={{ y: -5, transition: { duration: 0.2 } }}
                                        >
                                            <span className="text-xl mr-2">{skill.icon}</span>
                                            <span className="text-sm font-medium">{skill.name}</span>
                                        </motion.div>
                                    ))}
                                </div> */}

                            {/* Improved problem solver card - removed hover animation */}
                            <motion.div
                                className="bg-white rounded-xl p-8 shadow-lg border border-gray-100 relative overflow-hidden"
                            >
                                {/* Decorative elements */}
                                <div className="absolute -top-4 -right-4 w-20 h-20 bg-blue-50 rounded-full"></div>
                                <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-indigo-50 rounded-full"></div>

                                <div className="flex items-start gap-4 relative z-10">
                                    <div className="mt-1 bg-gradient-to-br from-blue-400 to-indigo-500 p-3 rounded-lg text-white flex-shrink-0">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                        </svg>
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-semibold mb-2">Problem Solving Approach</h3>
                                        <ul className="space-y-2 text-gray-600">
                                            <li className="flex items-start">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                                <span>Building custom automation tools to simplify complex workflows.</span>
                                            </li>
                                            <li className="flex items-start">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                                <span>Leveraging AI and data analytics for actionable insights.</span>
                                            </li>
                                            <li className="flex items-start">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                                <span>Developing secure, scalable systems tailored to complex business requirements.</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </motion.div>


                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
