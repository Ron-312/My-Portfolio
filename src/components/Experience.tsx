export default function Experience() {
    return (
        <section id="experience" className="py-20">
            <div className="container mx-auto px-4">
                <h2 className="text-3xl font-bold mb-8 text-center">Work Experience</h2>

                <div className="max-w-3xl mx-auto">
                    {/* Experience Item 1 */}
                    <div className="mb-12 relative pl-8 border-l-2 border-blue-500">
                        <div className="absolute -left-2 top-0 w-4 h-4 bg-blue-500 rounded-full"></div>
                        <h3 className="text-xl font-bold">Lead Software Engineer</h3>
                        <p className="text-blue-600 font-medium">Reflectiz | Feb 2023 - Present</p>
                        <ul className="mt-4 space-y-2 text-gray-600 list-disc pl-5">
                            <li>Onboarding lead for new clients, supporting the company's expansion from ~10 pilots to 100+ enterprise customers and multi-million-dollar ARR.</li>
                            <li>Designed a real-time ingest pipeline feeding an analytics warehouse (handles thousands of events per day) to track user engagement and system interactions.</li>
                            <li>Developed a Scripts Description & Categorization Tool using LLM and web scraping to analyze domain scripts, extract descriptions, and classify them by behavior, raising uncategorized-scripts coverage from &lt; 10% to ~ 85%.</li>
                            <li>Cut setup time from ~2 weeks to &lt; 3 days with targeted tooling and playbooks.</li>
                        </ul>
                        <p className="mt-2 text-sm font-medium">Tech: TypeScript, Python, SQL, LLMs, Web Scraping</p>
                    </div>

                    {/* Experience Item 2 */}
                    <div className="mb-12 relative pl-8 border-l-2 border-blue-500">
                        <div className="absolute -left-2 top-0 w-4 h-4 bg-blue-500 rounded-full"></div>
                        <h3 className="text-xl font-bold">Technical Engineer</h3>
                        <p className="text-blue-600 font-medium">Reflectiz | 2021 - Feb 2023</p>
                        <ul className="mt-4 space-y-2 text-gray-600 list-disc pl-5">
                            <li>Executed data extraction tasks for business operations and managed organizational data.</li>
                            <li>Optimized performance of complex SQL queries.</li>
                            <li>Configured and customized client applications using an internal framework to streamline cybersecurity processes.</li>
                        </ul>
                        <p className="mt-2 text-sm font-medium">Tech: JavaScript, TypeScript, SQL, Internal Frameworks</p>
                    </div>

                    {/* Experience Item 3 */}
                </div>
            </div>
        </section>
    );
}