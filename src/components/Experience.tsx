export default function Experience() {
    return (
        <section id="experience" className="py-20">
            <div className="container mx-auto px-4">
                <h2 className="text-3xl font-bold mb-8 text-center">Work Experience</h2>

                <div className="max-w-3xl mx-auto">
                    {/* Experience Item 1 */}
                    <div className="mb-12 relative pl-8 border-l-2 border-blue-500">
                        <div className="absolute -left-2 top-0 w-4 h-4 bg-blue-500 rounded-full"></div>
                        <h3 className="text-xl font-bold">Software Engineer</h3>
                        <p className="text-blue-600 font-medium">Reflectiz | 2024 - Present</p>
                        <ul className="mt-4 space-y-2 text-gray-600 list-disc pl-5">
                            <li>Maintained and extended the company&apos;s Chromium/Puppeteer engine that runs scripted scans of client websites.</li>
                            <li>Designed and built the scanner&apos;s LLM agent (Anthropic SDK): exposed its functions as tools, plus a context layer (scan context, allowed/blocked tools) so the agent maps a site&apos;s structure, depth and logic to complete tasks.</li>
                            <li>Made element targeting resilient to site changes: stable selectors, auto-recovery and similarity matching (Similo).</li>
                            <li>Agent builds ~50% of user journeys end to end (stable over 3 follow-up scans, 250 sites), halving manual work.</li>
                        </ul>
                        <p className="mt-2 text-sm font-medium">Tech: TypeScript, Chromium, Puppeteer, Anthropic SDK, LLM Agents, Context Engineering</p>
                    </div>

                    {/* Experience Item 2 */}
                    <div className="mb-12 relative pl-8 border-l-2 border-blue-500">
                        <div className="absolute -left-2 top-0 w-4 h-4 bg-blue-500 rounded-full"></div>
                        <h3 className="text-xl font-bold">Lead Technical Engineer</h3>
                        <p className="text-blue-600 font-medium">Reflectiz | 2023 - 2024</p>
                        <ul className="mt-4 space-y-2 text-gray-600 list-disc pl-5">
                            <li>Onboarding lead for new clients, supporting the company&apos;s expansion from ~10 pilots to 100+ enterprise customers and multi-million-dollar ARR.</li>
                            <li>Designed a real-time ingest pipeline into an analytics warehouse (thousands of events/day) tracking user engagement.</li>
                            <li>Built an LLM-based tool that describes and classifies domain scripts by behavior, raising coverage from &lt; 10% to ~85%.</li>
                            <li>Cut setup time from ~2 weeks to &lt; 3 days with targeted tooling and playbooks.</li>
                        </ul>
                        <p className="mt-2 text-sm font-medium">Tech: TypeScript, Python, SQL, LLMs, Web Scraping</p>
                    </div>

                    {/* Experience Item 3 */}
                    <div className="mb-12 relative pl-8 border-l-2 border-blue-500">
                        <div className="absolute -left-2 top-0 w-4 h-4 bg-blue-500 rounded-full"></div>
                        <h3 className="text-xl font-bold">Technical Engineer</h3>
                        <p className="text-blue-600 font-medium">Reflectiz | 2021 - 2023</p>
                        <ul className="mt-4 space-y-2 text-gray-600 list-disc pl-5">
                            <li>Ran data extraction tasks for business operations and managed organizational data.</li>
                            <li>Optimized complex SQL queries.</li>
                            <li>Configured and customized client applications using an internal framework to streamline cybersecurity processes.</li>
                        </ul>
                        <p className="mt-2 text-sm font-medium">Tech: JavaScript, TypeScript, SQL, Internal Frameworks</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
