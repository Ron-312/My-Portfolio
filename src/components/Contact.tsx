"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';

export default function Contact() {
    const [formStatus, setFormStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormStatus('sending');

        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);

        try {
            const response = await fetch('https://formspree.io/f/xovenoqp', {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                setFormStatus('success');
                setTimeout(() => {
                    setFormStatus('idle');
                    form.reset();
                }, 3000);
            } else {
                console.error('Form submission error:', response.status, response.statusText);
                setFormStatus('error');
                setTimeout(() => {
                    setFormStatus('idle');
                }, 3000);
            }
        } catch (error) {
            console.error('Form submission error:', error);
            setFormStatus('error');
            setTimeout(() => {
                setFormStatus('idle');
            }, 3000);
        }
    };

    return (
        <section id="contact" className="py-24 relative overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-blue-50 rounded-full -translate-x-1/2 -translate-y-1/2 opacity-60"></div>
            <div className="absolute bottom-0 right-0 w-80 h-80 bg-indigo-50 rounded-full translate-x-1/3 translate-y-1/3 opacity-60"></div>

            <div className="container mx-auto px-4 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    viewport={{ once: true }}
                    className="mb-16 text-center"
                >
                    <h2 className="text-4xl font-bold mb-4">Get In Touch</h2>
                    <div className="w-24 h-1 bg-blue-500 mx-auto mb-6 rounded-full"></div>
                    <p className="max-w-xl mx-auto text-gray-600">
                        Have a project in mind or want to discuss a potential collaboration?
                        I&apos;d love to hear from you.
                    </p>
                </motion.div>

                <div className="max-w-5xl mx-auto">
                    <div className="grid md:grid-cols-5 gap-8">
                        {/* Contact information */}
                        <motion.div
                            className="md:col-span-2 bg-white rounded-xl shadow-lg overflow-hidden flex flex-col h-full"
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.6 }}
                            viewport={{ once: true }}
                        >
                            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 py-6 px-6 text-white">
                                <h3 className="text-xl font-bold mb-2">Contact Information</h3>
                                <p className="text-blue-100">Feel free to reach out through any of these channels</p>
                            </div>

                            <div className="p-6 space-y-6 flex-grow">
                                <motion.div
                                    className="flex items-start gap-4"
                                    whileHover={{ x: 5 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <div className="bg-blue-50 p-3 rounded-full">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-gray-900">Email</h4>
                                        <a href="mailto:ron9hm1@gmail.com" className="text-blue-600 hover:underline block mt-1">
                                            ron9hm1@gmail.com
                                        </a>
                                    </div>
                                </motion.div>

                                <motion.div
                                    className="flex items-start gap-4"
                                    whileHover={{ x: 5 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <div className="bg-blue-50 p-3 rounded-full">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-gray-900">GitHub</h4>
                                        <a href="https://github.com/Ron-312" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline block mt-1">
                                            github.com/Ron-312
                                        </a>
                                    </div>
                                </motion.div>
                            </div>

                            <div className="p-6 bg-gray-50 mt-auto">
                                <h3 className="font-medium text-gray-900 mb-4">Connect with me</h3>
                                <div className="flex gap-4">
                                    <a href="https://github.com/Ron-312" target="_blank" rel="noopener noreferrer" className="bg-white p-2 rounded-full shadow-sm hover:shadow-md transition-shadow">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" className="text-gray-700" viewBox="0 0 24 24">
                                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                        </svg>
                                    </a>
                                    <a href="https://www.linkedin.com/in/ron-hershkovitz/" target="_blank" rel="noopener noreferrer" className="bg-white p-2 rounded-full shadow-sm hover:shadow-md transition-shadow">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" className="text-gray-700" viewBox="0 0 24 24">
                                            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                                        </svg>
                                    </a>
                                </div>
                            </div>
                        </motion.div>

                        {/* Contact form */}
                        <motion.div
                            className="md:col-span-3 bg-white rounded-xl shadow-lg p-8 h-full"
                            initial={{ opacity: 0, x: 30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.6 }}
                            viewport={{ once: true }}
                        >
                            <h3 className="text-2xl font-bold mb-6">Send me a message</h3>

                            <form className="space-y-6" onSubmit={handleSubmit}>
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <label htmlFor="name" className="block mb-2 font-medium text-gray-700">
                                            Name
                                        </label>
                                        <input
                                            type="text"
                                            id="name"
                                            name="name"
                                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            placeholder="Your name"
                                            required
                                            disabled={formStatus !== 'idle'}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="email" className="block mb-2 font-medium text-gray-700">
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            id="email"
                                            name="email"
                                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            placeholder="your.email@example.com"
                                            required
                                            disabled={formStatus !== 'idle'}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="subject" className="block mb-2 font-medium text-gray-700">
                                        Subject
                                    </label>
                                    <input
                                        type="text"
                                        id="subject"
                                        name="subject"
                                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        placeholder="What is this regarding?"
                                        required
                                        disabled={formStatus !== 'idle'}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="message" className="block mb-2 font-medium text-gray-700">
                                        Message
                                    </label>
                                    <textarea
                                        id="message"
                                        name="message"
                                        rows={6}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                                        placeholder="Your message..."
                                        required
                                        disabled={formStatus !== 'idle'}
                                    ></textarea>
                                </div>
                                <button
                                    type="submit"
                                    className={`
                    w-full py-3 px-6 rounded-lg font-medium transition-all 
                    ${formStatus === 'idle' ? 'bg-blue-600 hover:bg-blue-700 text-white' :
                                            formStatus === 'sending' ? 'bg-blue-600 text-white cursor-not-allowed' :
                                                formStatus === 'success' ? 'bg-green-600 text-white' :
                                                    'bg-red-600 text-white'}
                  `}
                                    disabled={formStatus !== 'idle'}
                                >
                                    {formStatus === 'idle' && 'Send Message'}
                                    {formStatus === 'sending' && 'Sending...'}
                                    {formStatus === 'success' && 'Message Sent!'}
                                    {formStatus === 'error' && 'Error Sending Message'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    );
}