"use client";

import { motion } from 'framer-motion';

export default function Portfolio() {
    // const [hoveredProject, setHoveredProject] = useState<number | null>(null);

    const projects = [
        {
            id: 1,
            title: "Browsing Agent with LLM Integration",
            description: "AI-powered browsing agent that autonomously navigates and interacts with web pages, with improvements to open-source LLM-driven web exploration.",
            image: "/placeholder.jpg",
            tags: ["Python", "JavaScript", "LLMs", "Web Scraping", "Puppeteer"],
            link: "#",
            color: "from-blue-500 to-indigo-600"
        },
        {
            id: 2,
            title: "Stock Prediction Models",
            description: "Multiple supervised learning models for stock price movement classification with GPU acceleration, custom time series validation, and NLP-derived sentiment analysis.",
            image: "/placeholder.jpg",
            tags: ["Python", "Machine Learning", "cuML", "NLP", "GPU Acceleration"],
            link: "#",
            color: "from-teal-500 to-green-600"
        }
    ];

    // Function to generate icons based on tags
    const getTagIcon = (tag: string) => {
        switch (tag) {
            case 'Python':
                return '🐍';
            case 'JavaScript':
            case 'TypeScript':
                return '🔷';
            case 'LLMs':
                return '🤖';
            case 'Web Scraping':
                return '🕸️';
            case 'Machine Learning':
                return '📈';
            case 'SQL':
                return '🗃️';
            case 'Data Engineering':
                return '📊';
            case 'Business Intelligence':
                return '📑';
            case 'UI/UX':
                return '🎨';
            case 'GPU Acceleration':
                return '⚡';
            case 'NLP':
                return '💬';
            case 'Puppeteer':
                return '🧩';
            case 'cuML':
                return '🧠';
            default:
                return '🔧';
        }
    };

    return (
        <section id="portfolio" className="py-24 bg-gradient-to-b from-gray-50 to-white">
            <div className="container mx-auto px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    viewport={{ once: true }}
                    className="mb-20 text-center"
                >
                    <h2 className="text-4xl font-bold mb-4">My Projects</h2>
                    <div className="w-24 h-1 bg-blue-500 mx-auto mb-6 rounded-full"></div>
                    <p className="max-w-2xl mx-auto text-gray-600">
                        A selection of my recent work in AI, data engineering, and cybersecurity.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-2 gap-8">
                    {projects.map((project, index) => (
                        <motion.div
                            key={project.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            viewport={{ once: true }}
                            className="group"
                            // onMouseEnter={() => setHoveredProject(project.id)}
                            // onMouseLeave={() => setHoveredProject(null)}
                        >
                            <div className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300 border border-gray-200 h-full flex flex-col">
                                {/* Image area with gradient overlay */}
                                <div className="relative h-52 overflow-hidden">
                                    {/* Gradient background as placeholder */}
                                    <div className={`absolute inset-0 bg-gradient-to-r ${project.color}`}></div>

                                    {/* Project icon/illustration */}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="bg-white/20 backdrop-blur-sm p-4 rounded-full">
                                            {project.id === 1 && (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                                                </svg>
                                            )}
                                            {project.id === 2 && (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                </svg>
                                            )}
                                            {project.id === 3 && (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                                                </svg>
                                            )}
                                            {project.id === 4 && (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                                </svg>
                                            )}
                                        </div>
                                    </div>

                                    {/* Project title overlay on image */}
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-white">
                                        <h3 className="text-xl font-bold">{project.title}</h3>
                                    </div>
                                </div>

                                <div className="p-6 flex-grow flex flex-col">
                                    <p className="text-gray-600 mb-6 flex-grow">{project.description}</p>

                                    <div className="mt-auto">
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {project.tags.slice(0, 3).map((tag) => (
                                                <span
                                                    key={tag}
                                                    className="px-3 py-1 bg-gray-100 rounded-full text-sm font-medium text-gray-700 flex items-center"
                                                >
                                                    <span className="mr-1">{getTagIcon(tag)}</span> {tag}
                                                </span>
                                            ))}
                                            {project.tags.length > 3 && (
                                                <span className="px-3 py-1 bg-gray-100 rounded-full text-sm font-medium text-gray-700">
                                                    +{project.tags.length - 3} more
                                                </span>
                                            )}
                                        </div>

                                        <a
                                            href={project.link}
                                            className="inline-flex items-center text-blue-600 font-medium hover:text-blue-800 transition-colors group"
                                        >
                                            View Project
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="h-5 w-5 ml-1 transform transition-transform group-hover:translate-x-1"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                            </svg>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}