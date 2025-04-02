import Link from 'next/link';

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-gradient-to-b from-gray-50 to-gray-100 py-12 border-t border-gray-200">
            <div className="container mx-auto px-4">
                <div className="flex flex-col md:flex-row justify-between items-center mb-8">
                    <div className="mb-6 md:mb-0 text-center md:text-left">
                        <h3 className="text-xl font-bold text-gray-800">Ron Hershkovitz</h3>
                        <p className="text-gray-600 mt-1">Software Engineer</p>
                    </div>

                    <div className="flex flex-col md:flex-row gap-6 md:gap-12 text-center md:text-left">
                        <div>
                            <h4 className="text-sm font-semibold text-gray-800 uppercase mb-3">Contact</h4>
                            <ul className="space-y-2">
                                <li>
                                    <a
                                        href="mailto:ron9hm1@gmail.com"
                                        className="text-gray-600 hover:text-blue-500 transition-colors flex items-center justify-center md:justify-start"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        ron9hm1@gmail.com
                                    </a>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="text-sm font-semibold text-gray-800 uppercase mb-3">Links</h4>
                            <ul className="space-y-2">
                                <li>
                                    <a
                                        href="https://github.com/Ron-312"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-gray-600 hover:text-blue-500 transition-colors flex items-center justify-center md:justify-start"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="mr-2" viewBox="0 0 16 16">
                                            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
                                        </svg>
                                        GitHub
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="https://www.linkedin.com/in/ron-hershkovitz/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-gray-600 hover:text-blue-500 transition-colors flex items-center justify-center md:justify-start"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="mr-2" viewBox="0 0 16 16">
                                            <path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854V1.146zm4.943 12.248V6.169H2.542v7.225h2.401zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248-.822 0-1.359.54-1.359 1.248 0 .694.521 1.248 1.327 1.248h.016zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016a5.54 5.54 0 0 1 .016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225h2.4z" />
                                        </svg>
                                        LinkedIn
                                    </a>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="text-sm font-semibold text-gray-800 uppercase mb-3">Navigation</h4>
                            <ul className="space-y-2">
                                <li>
                                    <Link href="#home" className="text-gray-600 hover:text-blue-500 transition-colors">
                                        Home
                                    </Link>
                                </li>
                                <li>
                                    <Link href="#about" className="text-gray-600 hover:text-blue-500 transition-colors">
                                        About
                                    </Link>
                                </li>
                                <li>
                                    <Link href="#experience" className="text-gray-600 hover:text-blue-500 transition-colors">
                                        Experience
                                    </Link>
                                </li>
                                <li>
                                    <Link href="#portfolio" className="text-gray-600 hover:text-blue-500 transition-colors">
                                        Projects
                                    </Link>
                                </li>
                                <li>
                                    <Link href="#contact" className="text-gray-600 hover:text-blue-500 transition-colors">
                                        Contact
                                    </Link>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="pt-8 border-t border-gray-200 text-center">
                    <p className="text-gray-500 text-sm">
                        © {currentYear} Ron Hershkovitz. All rights reserved.
                    </p>
                    <p className="text-gray-400 text-xs mt-2">
                        Built with Next.js, Tailwind CSS, and Framer Motion
                    </p>
                </div>
            </div>
        </footer>
    );
}