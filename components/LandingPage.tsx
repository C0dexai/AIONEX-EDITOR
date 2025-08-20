import React from 'react';
import { MagicWandIcon, CodeIcon, LayoutIcon } from './Icons';

interface LandingPageProps {
    onEnter: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
    return (
        <div>
            <div className="min-h-screen flex flex-col items-center justify-center text-center text-white p-8">
                <div className="absolute top-0 left-0 w-full h-full bg-black/60 backdrop-blur-sm"></div>
                <div className="relative z-10 glass-effect p-8 md:p-12 rounded-2xl shadow-2xl">
                    <div className="flex justify-center items-center mb-6">
                        <img
                            src="https://andiegogiap.com/assets/aionex-icon-256.png"
                            alt="AIONEX Logo"
                            className="h-20 w-20"
                        />
                    </div>
                    <h1 className="text-5xl md:text-7xl font-bold tracking-wider font-orbitron uppercase" style={{ textShadow: '0 0 10px var(--neon-purple), 0 0 20px var(--neon-purple)' }}>
                        AIONEX Sandbox
                    </h1>
                    <p className="mt-6 text-lg md:text-xl max-w-3xl mx-auto text-gray-300">
                        Forge the future, live in the browser. A neon-drenched development environment powered by Gemini. Build, test, and deploy at the speed of thought.
                    </p>
                    <button
                        onClick={onEnter}
                        className="mt-10 px-10 py-4 bg-[var(--neon-pink)] text-white font-bold text-xl rounded-full uppercase tracking-widest transition-all duration-300 transform hover:scale-105 neon-glow-pink"
                    >
                        Launch Editor
                    </button>
                </div>
            </div>

            <div className="relative z-10 py-20 px-8 bg-transparent">
                <h2 className="text-4xl font-bold text-center mb-16 font-orbitron uppercase text-[var(--neon-blue)]" style={{textShadow: '0 0 8px var(--neon-blue)'}}>Core Features</h2>
                <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8">
                    <FeatureCard
                        icon={<MagicWandIcon className="h-10 w-10" />}
                        title="AI-Powered Workflow"
                        description="Leverage the power of Gemini to generate code, refactor, and get suggestions. From simple components to complex logic, let the AI accelerate your development."
                        borderColor="--neon-green"
                    />
                    <FeatureCard
                        icon={<CodeIcon className="h-10 w-10" />}
                        title="Instant Live Preview"
                        description="See your changes in real-time. The live preview panel instantly reflects your HTML, CSS, and JavaScript modifications, creating a tight feedback loop."
                        borderColor="--neon-pink"
                    />
                    <FeatureCard
                        icon={<LayoutIcon className="h-10 w-10" />}
                        title="Drag & Drop UI"
                        description="Quickly scaffold your application using a library of pre-built components and layout templates. Drag, drop, and customize to build your UI faster than ever."
                        borderColor="--neon-blue"
                    />
                </div>
            </div>
        </div>
    );
};

interface FeatureCardProps {
    icon: React.ReactElement;
    title: string;
    description: string;
    borderColor: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, borderColor }) => {
    return (
        <div 
            className="glass-effect p-8 rounded-xl transition-all duration-300 hover:scale-105"
            style={{ 
                borderWidth: '2px',
                borderColor: `var(${borderColor})`,
                boxShadow: `0 0 15px var(${borderColor}), inset 0 0 10px rgba(0,0,0,0.5)`
            }}
        >
            <div className="flex justify-center items-center mb-6" style={{ color: `var(${borderColor})` }}>
                {icon}
            </div>
            <h3 className="text-2xl font-bold text-center mb-4 font-orbitron" style={{ color: `var(${borderColor})` }}>{title}</h3>
            <p className="text-gray-300 text-center">{description}</p>
        </div>
    );
}

export default LandingPage;