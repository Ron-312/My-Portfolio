"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Handle scroll effect
    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <nav
            className={`fixed top-0 w-full ${scrolled ? 'bg-white shadow-md' : 'bg-white/80'
                } backdrop-blur-sm z-50 py-4 transition-all`}
        >
            <div className="container mx-auto flex justify-between items-center px-4">
                <Link href="/" className="font-medium text-xl">Ron Hershkovitz</Link>
                <button
                    className="md:hidden text-xl"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                    ☰
                </button>
                <ul
                    className={`flex gap-6 ${mobileMenuOpen ? 'flex-col absolute top-16 right-0 bg-white shadow-md p-4 rounded-md w-48 z-50' : 'hidden'
                        } md:flex md:flex-row md:static md:bg-transparent md:shadow-none md:p-0 md:w-auto`}
                >
                    <li>
                        <Link href="#home" className="hover:text-blue-500 transition-colors">
                            Home
                        </Link>
                    </li>
                    <li>
                        <Link href="#about" className="hover:text-blue-500 transition-colors">
                            About
                        </Link>
                    </li>
                    <li>
                        <Link href="#experience" className="hover:text-blue-500 transition-colors">
                            Experience
                        </Link>
                    </li>
                    <li>
                        <Link href="#portfolio" className="hover:text-blue-500 transition-colors">
                            Projects
                        </Link>
                    </li>
                    <li>
                        <Link href="#contact" className="hover:text-blue-500 transition-colors">
                            Contact
                        </Link>
                    </li>
                </ul>
            </div>
        </nav>
    );
}