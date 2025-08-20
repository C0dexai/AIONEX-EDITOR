import React, { useState } from 'react';
import type { HandoverLog } from '../types';
import { CubeIcon, UserCircleIcon, TerminalIcon, ServerIcon, BugIcon, CheckIcon } from './Icons';

interface SystemOperatorPanelProps {
  containerInfo: HandoverLog | null;
  registry: any;
  onContainerCreate: (selections: { base: string | null; ui: string[]; datastore: string | null }, promptText: string, env: { apiName: string; apiKey: string }) => void;
  onContainerAction: (action: 'install' | 'build' | 'start' | 'debug') => void;
}

const getStatusPill = (status: HandoverLog['status']) => {
    const baseClasses = "px-2 py-0.5 text-xs font-semibold rounded-full";
    switch(status) {
        case 'initialized': return <span className={`${baseClasses} bg-gray-500 text-white`}>Initialized</span>;
        case 'installing':
        case 'building':
        case 'starting':
             return <span className={`${baseClasses} bg-blue-500 text-white animate-pulse`}>{status}...</span>;
        case 'installed':
        case 'built':
            return <span className={`${baseClasses} bg-purple-500 text-white`}>{status}</span>;
        case 'running': return <span className={`${baseClasses} bg-green-500 text-white`}>Running</span>;
        case 'error': return <span className={`${baseClasses} bg-red-500 text-white`}>Error</span>;
        default: return <span className={`${baseClasses} bg-gray-500`}>{status}</span>;
    }
}

const SystemOperatorPanel: React.FC<SystemOperatorPanelProps> = ({ containerInfo, registry, onContainerCreate, onContainerAction }) => {
  const [promptText, setPromptText] = useState("Build a fancy to-do app");
  const [base, setBase] = useState<string | null>(Object.keys(registry.TEMPLATES)[0] || null);
  const [ui, setUi] = useState<string[]>([Object.keys(registry.UI)[0]]);
  const [datastore, setDatastore] = useState<string | null>(Object.keys(registry.DATASTORE)[0] || null);
  const [apiName, setApiName] = useState("");
  const [apiKey, setApiKey] = useState("");

  const handleCreate = () => {
    onContainerCreate({ base, ui, datastore }, promptText, { apiName, apiKey });
  };
  
  const handleUiChange = (key: string) => {
    setUi(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const ActionButton: React.FC<{
    action: 'install' | 'build' | 'start' | 'debug';
    icon: React.ReactElement;
    label: string;
    requiredStatus: HandoverLog['status'][];
  }> = ({ action, icon, label, requiredStatus }) => {
    const isDone = {
        'install': ['installed', 'built', 'running'],
        'build': ['built', 'running'],
        'start': ['running'],
        'debug': [],
    }[action];
    
    const isDisabled = !containerInfo || !requiredStatus.includes(containerInfo.status);
    const isCompleted = containerInfo && isDone.includes(containerInfo.status);
    
    return (
        <button
            onClick={() => onContainerAction(action)}
            disabled={isDisabled}
            className={`flex items-center gap-2 text-sm font-semibold p-2 rounded-md w-full transition-all duration-200
                ${isDisabled ? 'bg-black/20 text-gray-500 cursor-not-allowed' : 'bg-black/30 hover:bg-[var(--neon-purple)] hover:text-black text-gray-200'}
                ${isCompleted ? '!bg-[var(--neon-green)] text-black' : ''}
            `}
        >
            {isCompleted ? <CheckIcon className="h-4 w-4" /> : icon}
            <span>{label}</span>
        </button>
    );
  };


  if (containerInfo) {
    return (
        <div className="flex flex-col gap-3 text-sm">
            <div className="p-3 bg-black/20 rounded-lg border border-[var(--card-border)]">
                <div className="flex items-center gap-3 mb-2">
                    <CubeIcon className="h-6 w-6 text-[var(--neon-purple)]" />
                    <h3 className="font-bold text-lg text-white">Current Container</h3>
                </div>
                <p className="text-xs text-gray-400 break-all" title={containerInfo.container_id}>ID: {containerInfo.container_id.substring(10, 22)}...</p>
                <div className="flex items-center gap-2 mt-2">
                     <UserCircleIcon className="h-5 w-5 text-[var(--neon-blue)]" />
                     <span className="font-semibold text-gray-300">{containerInfo.operator}</span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                    <span className="font-bold text-gray-400">Status:</span>
                    {getStatusPill(containerInfo.status)}
                </div>
                {containerInfo.env && (Object.keys(containerInfo.env).length > 0) && (
                    <div className="mt-3 pt-3 border-t border-[var(--card-border)]">
                        <h4 className="font-bold text-gray-400 mb-2">Environment:</h4>
                        {Object.entries(containerInfo.env).map(([key, value]) => (
                            <div key={key} className="flex justify-between items-center text-xs mb-1 last:mb-0">
                                <span className="text-gray-300 truncate pr-2">{key}:</span>
                                <span className="font-mono bg-black/30 px-2 py-0.5 rounded text-gray-400">
                                    {key.toUpperCase().includes('KEY') ? '••••••••' : value}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-2">
                <ActionButton action="install" icon={<TerminalIcon className="h-4 w-4" />} label="Install" requiredStatus={['initialized']} />
                <ActionButton action="build" icon={<TerminalIcon className="h-4 w-4" />} label="Build" requiredStatus={['installed']} />
                <ActionButton action="start" icon={<ServerIcon className="h-4 w-4" />} label="Start" requiredStatus={['built']} />
                <ActionButton action="debug" icon={<BugIcon className="h-4 w-4" />} label="Debug" requiredStatus={['initialized', 'installed', 'built', 'running', 'error']} />
            </div>
        </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 text-sm">
        <div>
            <label className="block font-semibold mb-1 text-gray-300">Prompt:</label>
            <input 
                type="text"
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                className="w-full p-2 bg-black/30 border border-[var(--card-border)] rounded-md focus:ring-1 focus:ring-[var(--neon-purple)] focus:outline-none"
            />
        </div>

        <div>
            <label className="block font-semibold mb-2 text-gray-300">Container Environment:</label>
            <div className="flex flex-col gap-2">
                <input 
                    type="text"
                    placeholder="API_NAME"
                    value={apiName}
                    onChange={(e) => setApiName(e.target.value)}
                    className="w-full p-2 bg-black/30 border border-[var(--card-border)] rounded-md focus:ring-1 focus:ring-[var(--neon-purple)] focus:outline-none"
                    aria-label="API Name"
                />
                <input 
                    type="password"
                    placeholder="API_KEY"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full p-2 bg-black/30 border border-[var(--card-border)] rounded-md focus:ring-1 focus:ring-[var(--neon-purple)] focus:outline-none"
                    aria-label="API Key"
                />
            </div>
        </div>

        <div>
            <label className="block font-semibold mb-2 text-gray-300">Base Template:</label>
            <select
                value={base || ''}
                onChange={(e) => setBase(e.target.value)}
                className="w-full p-2 bg-black/30 border border-[var(--card-border)] rounded-md"
            >
                {Object.entries(registry.TEMPLATES).map(([key, value]: [string, any]) => (
                    <option key={key} value={key}>{value.name}</option>
                ))}
            </select>
        </div>

        <div>
            <label className="block font-semibold mb-2 text-gray-300">UI:</label>
            <div className="flex flex-col gap-2">
            {Object.entries(registry.UI).map(([key, value]: [string, any]) => (
                <label key={key} className="flex items-center gap-2 p-2 bg-black/20 rounded-md cursor-pointer hover:bg-black/40">
                    <input type="checkbox" checked={ui.includes(key)} onChange={() => handleUiChange(key)} className="accent-[var(--neon-pink)]" />
                    <span>{value.name}</span>
                </label>
            ))}
            </div>
        </div>
        
        <div>
            <label className="block font-semibold mb-2 text-gray-300">Datastore:</label>
            <select
                value={datastore || ''}
                onChange={(e) => setDatastore(e.target.value)}
                className="w-full p-2 bg-black/30 border border-[var(--card-border)] rounded-md"
            >
                <option value="">None</option>
                {Object.entries(registry.DATASTORE).map(([key, value]: [string, any]) => (
                    <option key={key} value={key}>{value.name}</option>
                ))}
            </select>
        </div>

        <button
            onClick={handleCreate}
            className="w-full p-2 mt-2 bg-[var(--neon-pink)] hover:brightness-125 text-white font-bold rounded-md transition-all"
        >
            Create Container
        </button>
    </div>
  );
};

export default SystemOperatorPanel;