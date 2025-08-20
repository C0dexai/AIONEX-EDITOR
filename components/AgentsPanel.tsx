import React, { useState, useEffect, useRef, useCallback } from 'react';
import { chatWithAgent, refineCodeWithAgent } from '../services/geminiService';
import type { FileSystemState, ChatMessage, DraggableComponent, HandoverLog } from '../types';
import { SpinnerIcon, PanelLeftIcon, PanelRightIcon, MagicWandIcon, XIcon, DocumentTextIcon, GeminiIcon, MinimizeIcon, MaximizeIcon, RestoreIcon, ChevronUpIcon, RefreshCwIcon } from './Icons';
import CollapsibleSection from './CollapsibleSection';
import ChatMessageView from './ChatMessage';
import FileExplorer from './FileExplorer';
import CodeEditor from './CodePreview';
import ComponentLibrary from './ComponentLibrary';
import LayoutTemplates, { LayoutTemplateData } from './LayoutTemplates';
import SystemOperatorPanel from './SystemOperatorPanel';
import { registry, templateFiles } from '../templates';
import { marked } from 'marked';
import { v4 as uuidv4 } from 'uuid';
import FloatingToolbar from './FloatingToolbar';
import JSZip from 'jszip';
import dbService from '../services/dbService';

const initialFileSystem: FileSystemState = {
  '/README.md': '# Welcome to the Live Sandbox\n\nPlease use the **System Operator** panel on the left to create a new project container from a template.',
};

const MarkdownPreview: React.FC<{ markdown: string }> = ({ markdown }) => {
    const [html, setHtml] = useState('');

    useEffect(() => {
        const parseMd = async () => {
            try {
                const parsedHtml = await marked.parse(markdown);
                setHtml(parsedHtml);
            } catch (error) {
                console.error("Error parsing markdown:", error);
                setHtml("<p>Error parsing markdown.</p>");
            }
        }
        parseMd();
    }, [markdown]);

    return (
        <div className="w-full h-full bg-gray-800/50 rounded-md overflow-y-auto" aria-live="polite">
            <div className="prose prose-sm p-4" dangerouslySetInnerHTML={{ __html: html }}></div>
        </div>
    );
};

// Simple path resolver
const resolvePath = (base: string, relative: string): string => {
    const stack = base.split('/');
    // if base is a file, not a dir, start from its parent
    if (base.slice(-1) !== '/') {
      stack.pop();
    }
    const parts = relative.split('/');
    for (let i = 0; i < parts.length; i++) {
        if (parts[i] === '.')
            continue;
        if (parts[i] === '..')
            stack.pop();
        else
            stack.push(parts[i]);
    }
    return stack.join('/');
};

const getMimeType = (path: string): string => {
    const extension = path.split('.').pop()?.toLowerCase();
    switch (extension) {
        case 'html': return 'text/html';
        case 'css': return 'text/css';
        case 'js': return 'application/javascript';
        case 'json': return 'application/json';
        case 'png': return 'image/png';
        case 'jpg':
        case 'jpeg': return 'image/jpeg';
        case 'gif': return 'image/gif';
        case 'svg': return 'image/svg+xml';
        case 'md': return 'text/markdown';
        default: return 'application/octet-stream';
    }
};

const OrchestratorPanel: React.FC = () => {
  const [isDBLoading, setIsDBLoading] = useState(true);
  
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [cliInput, setCliInput] = useState<string>('');
  const [fileSystem, setFileSystem] = useState<FileSystemState>({});
  const [previewRoot, setPreviewRoot] = useState<string | null>('/');
  const [srcDoc, setSrcDoc] = useState('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string>('');

  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  const [panelSizes, setPanelSizes] = useState<number[]>([25, 40, 35]);
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [lastLeftPanelSize, setLastLeftPanelSize] = useState(panelSizes[0]);
  const [isCenterPanelCollapsed, setIsCenterPanelCollapsed] = useState(false);
  const [lastCenterPanelSize, setLastCenterPanelSize] = useState(panelSizes[1]);
  const dragDividerIndex = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [openFiles, setOpenFiles] = useState<string[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);

  const [refineInstruction, setRefineInstruction] = useState<string>('');
  const [isRefining, setIsRefining] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [toolbarPosition, setToolbarPosition] = useState<{ top: number; left: number } | null>(null);
  
  const [chatPanelHeight, setChatPanelHeight] = useState<number>(250);
  const [isResizingChat, setIsResizingChat] = useState(false);
  const [chatWindowState, setChatWindowState] = useState<'normal' | 'minimized' | 'maximized'>('normal');

  const [containerInfo, setContainerInfo] = useState<HandoverLog | null>(null);


  // Load state from IndexedDB on initial render
  useEffect(() => {
    const loadStateFromDB = async () => {
        await dbService.initDB();
        const savedState = await dbService.loadState();
        if (savedState) {
            setChatHistory(savedState.chatHistory || [{role: 'system', content: 'Session restored.'}]);
            setFileSystem(savedState.fileSystem || initialFileSystem);
            setPanelSizes(savedState.panelSizes || [25, 40, 35]);
            setPreviewRoot(savedState.previewRoot || '/');
            setOpenFiles(savedState.openFiles || ['/README.md']);
            setActiveFile(savedState.activeFile || '/README.md');
            setChatPanelHeight(savedState.chatPanelHeight || 250);
            setChatWindowState(savedState.chatWindowState || 'normal');
            setContainerInfo(savedState.containerInfo || null);
        } else {
            // First time load, initialize with defaults and save to DB
            setChatHistory([{role: 'system', content: 'Session started. Create a container to begin.'}]);
            setFileSystem(initialFileSystem);
            setOpenFiles(['/README.md']);
            setActiveFile('/README.md');
            await dbService.saveState({
                chatHistory: [{role: 'system', content: 'Session started.'}],
                fileSystem: initialFileSystem,
                panelSizes: [25, 40, 35],
                previewRoot: '/',
                openFiles: ['/README.md'],
                activeFile: '/README.md',
                chatPanelHeight: 250,
                chatWindowState: 'normal',
                containerInfo: null,
            });
        }
        setIsDBLoading(false);
    };
    loadStateFromDB();
  }, []);


  // Auto-save state to IndexedDB
  useEffect(() => {
    if (isDBLoading) return; // Don't save while initially loading
    const handler = setTimeout(() => {
        const stateToSave = { chatHistory, fileSystem, panelSizes, previewRoot, openFiles, activeFile, chatPanelHeight, chatWindowState, containerInfo };
        dbService.saveState(stateToSave).catch(e => console.error("Failed to save state:", e));
    }, 1500); // Debounce saving
    return () => clearTimeout(handler);
  }, [chatHistory, fileSystem, panelSizes, previewRoot, openFiles, activeFile, chatPanelHeight, chatWindowState, containerInfo, isDBLoading]);
  
  const generatePreview = useCallback(async () => {
    if (!previewRoot) {
        setSrcDoc('<html><body>No preview root selected.</body></html>');
        return;
    }

    const indexPath = `${previewRoot}index.html`;
    const indexContent = fileSystem[indexPath];
    
    if (indexContent === undefined) {
          setSrcDoc(`<html><body>No index.html found in preview root: ${previewRoot}. Select a folder with an index.html file to preview, or create an index.html.</body></html>`);
        return;
    }

    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(indexContent, 'text/html');
        
        // Inject fetch override script
        const fetchOverrideScript =
          '(function() {' +
          '    const originalFetch = window.fetch;' +
          '    const pendingRequests = new Map();' +
          '    window.addEventListener(\'message\', (event) => {' +
          '        if (event.source !== window.parent) return;' +
          '        const { type, requestId, content, status, headers } = event.data;' +
          '        if (type === \'FETCH_RESPONSE\' && pendingRequests.has(requestId)) {' +
          '            const { resolve, reject } = pendingRequests.get(requestId);' +
          '            pendingRequests.delete(requestId);' +
          '            if (status >= 200 && status < 300) {' +
          '                const response = new Response(content, { status, headers });' +
          '                resolve(response);' +
          '            } else {' +
          '                reject(new Error(`Fetch failed with status: ${status}`));' +
          '            }' +
          '        }' +
          '    });' +
          '    window.fetch = function(input, init) {' +
          '        const url = (input instanceof Request) ? input.url : input.toString();' +
          '        if (url.startsWith(\'http\') || url.startsWith(\'//\') || url.startsWith(\'data:\')) {' +
          '            return originalFetch.apply(this, arguments);' +
          '        }' +
          '        return new Promise((resolve, reject) => {' +
          '            const requestId = `req_${Date.now()}_${Math.random()}`;' +
          '            pendingRequests.set(requestId, { resolve, reject });' +
          '            const absoluteUrl = new URL(url, window.location.href).pathname;' +
          '            window.parent.postMessage({' +
          '                type: \'FETCH_REQUEST\',' +
          '                path: absoluteUrl,' +
          '                requestId: requestId' +
          '            }, \'*\');' +
          '        });' +
          '    };' +
          '})();';
        const scriptEl = doc.createElement('script');
        scriptEl.textContent = fetchOverrideScript;
        doc.head.insertBefore(scriptEl, doc.head.firstChild);


        const assetSelectors = 'link[href], script[src], img[src], source[srcset]';
        const elements = Array.from(doc.querySelectorAll(assetSelectors));

        for (const el of elements) {
            const srcAttr = el.hasAttribute('href') ? 'href' : (el.hasAttribute('src') ? 'src' : 'srcset');
            const originalPath = el.getAttribute(srcAttr);

            if (!originalPath || originalPath.startsWith('http') || originalPath.startsWith('data:')) {
                continue;
            }
            
            const assetPath = originalPath.startsWith('/')
              ? originalPath
              : resolvePath(indexPath, originalPath);

            const assetContent = fileSystem[assetPath];

            if (assetContent) {
                const blob = new Blob([assetContent], { type: getMimeType(assetPath) });
                const blobUrl = URL.createObjectURL(blob);
                el.setAttribute(srcAttr, blobUrl);
            } else {
                console.warn(`Asset not found in file system: ${assetPath}`);
            }
        }
        const finalHtml = new XMLSerializer().serializeToString(doc);
        setSrcDoc(finalHtml);
    } catch (e) {
        console.error("Error generating preview:", e);
        setSrcDoc('<html><body>Error generating preview. Check console for details.</body></html>');
    }
  }, [fileSystem, previewRoot]);
  
  // Effect for handling fetch requests from the iframe
  useEffect(() => {
    const handleIframeMessage = (event: MessageEvent) => {
        const iframe = iframeRef.current;
        if (!iframe || event.source !== iframe.contentWindow) {
            return;
        }

        const { type, path, requestId } = event.data;

        if (type === 'FETCH_REQUEST') {
            const content = fileSystem[path];
            
            if (content !== undefined) {
                const mimeType = getMimeType(path);
                iframe.contentWindow.postMessage({
                    type: 'FETCH_RESPONSE',
                    requestId: requestId,
                    content: content,
                    status: 200,
                    headers: { 'Content-Type': mimeType }
                }, '*');
            } else {
                iframe.contentWindow.postMessage({
                    type: 'FETCH_RESPONSE',
                    requestId: requestId,
                    content: `File not found: ${path}`,
                    status: 404,
                    headers: { 'Content-Type': 'text/plain' }
                }, '*');
            }
        }
    };

    window.addEventListener('message', handleIframeMessage);

    return () => {
        window.removeEventListener('message', handleIframeMessage);
    };
  }, [fileSystem]);


  useEffect(() => {
    const timeout = setTimeout(() => {
      generatePreview();
    }, 250);
    return () => clearTimeout(timeout);
  }, [generatePreview]);

  useEffect(() => {
    if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory, chatWindowState]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (dragDividerIndex.current === null) return;
    
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const index = dragDividerIndex.current;
    
    const newSizes = [...panelSizes];
    const minWidthPx = 50;

    if (isCenterPanelCollapsed && index === 0) {
        // Special case: Dragging between Left and Right panel when Center is collapsed
        const combinedWidth = (panelSizes[0] + panelSizes[2]) / 100 * containerRect.width;
        let newPane1Width = e.clientX - containerRect.left;
        let newPane2Width = combinedWidth - newPane1Width;

        if (newPane1Width < minWidthPx) {
            newPane2Width = combinedWidth - minWidthPx;
            newPane1Width = minWidthPx;
        }
        if (newPane2Width < minWidthPx) {
            newPane1Width = combinedWidth - minWidthPx;
            newPane2Width = minWidthPx;
        }

        newSizes[0] = (newPane1Width / containerRect.width) * 100;
        newSizes[2] = (newPane2Width / containerRect.width) * 100;
    } else {
        // Normal case
        const totalWidthOfPreviousPanels = panelSizes.slice(0, index).reduce((sum, size) => sum + (size / 100 * containerRect.width), 0);
        let newPane1Width = e.clientX - containerRect.left - totalWidthOfPreviousPanels;
        
        const combinedWidth = (panelSizes[index] + panelSizes[index + 1]) / 100 * containerRect.width;
        let newPane2Width = combinedWidth - newPane1Width;

        if (newPane1Width < minWidthPx) {
            newPane2Width = combinedWidth - minWidthPx;
            newPane1Width = minWidthPx;
        }
        if (newPane2Width < minWidthPx) {
            newPane1Width = combinedWidth - minWidthPx;
            newPane2Width = minWidthPx;
        }
        
        newSizes[index] = (newPane1Width / containerRect.width) * 100;
        newSizes[index + 1] = (newPane2Width / containerRect.width) * 100;
    }
    
    setPanelSizes(newSizes);
  }, [panelSizes, isCenterPanelCollapsed]);

  const handleMouseUp = useCallback(() => {
    dragDividerIndex.current = null;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  const handleMouseDown = (index: number, e: React.MouseEvent) => {
    e.preventDefault();
    dragDividerIndex.current = index;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };
  
  const toggleLeftPanel = () => {
    setIsLeftPanelCollapsed(prev => {
        const isCollapsing = !prev;
        if (isCollapsing) {
            setLastLeftPanelSize(panelSizes[0]);
            const freedSpace = panelSizes[0];
            setPanelSizes([0, panelSizes[1] + freedSpace / 2, panelSizes[2] + freedSpace / 2]);
        } else {
            const spaceToReclaim = lastLeftPanelSize;
            setPanelSizes([lastLeftPanelSize, panelSizes[1] - spaceToReclaim / 2, panelSizes[2] - spaceToReclaim / 2]);
        }
        return isCollapsing;
    });
  };

  const toggleCenterPanel = () => {
    setIsCenterPanelCollapsed(prev => {
        const isCollapsing = !prev;
        if (isCollapsing) {
            setLastCenterPanelSize(panelSizes[1]);
            const freedSpace = panelSizes[1];
            // Give all freed space to the right panel for "live edit mode"
            setPanelSizes([panelSizes[0], 0, panelSizes[2] + freedSpace]);
        } else {
            const spaceToReclaim = lastCenterPanelSize;
            // Take space back from the right panel
            setPanelSizes([panelSizes[0], lastCenterPanelSize, panelSizes[2] - spaceToReclaim]);
        }
        return isCollapsing;
    });
  };
  
  const handleFileSelect = (path: string) => {
    if (!openFiles.includes(path)) {
      setOpenFiles(prev => [...prev, path]);
    }
    setActiveFile(path);
  };
  
  const handleCloseFile = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newOpenFiles = openFiles.filter(p => p !== path);
    setOpenFiles(newOpenFiles);

    if (activeFile === path) {
      if (newOpenFiles.length > 0) {
        setActiveFile(newOpenFiles[newOpenFiles.length - 1]);
      } else {
        setActiveFile(null);
      }
    }
  };


  const handleCodeChange = (newCodeValue: string) => {
    if (!activeFile) return;
    setFileSystem(prev => ({
        ...prev,
        [activeFile]: newCodeValue
    }));
  };

  const handleRefineCode = async () => {
    if (!refineInstruction || isRefining || !activeFile || activeFile.endsWith('/')) return;

    setIsRefining(true);
    setError('');
    
    const currentCode = fileSystem[activeFile] || '';
    const lang = activeFile.split('.').pop() || '';
    
    try {
        const refinedCode = await refineCodeWithAgent(currentCode, lang, refineInstruction);
        setFileSystem(prev => ({ ...prev, [activeFile]: refinedCode }));
        setRefineInstruction(''); // Clear input on success
    } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred during refinement.';
        setError(errorMessage);
        setChatHistory(prev => [...prev, {role: 'system', content: 'Error refining code: ' + errorMessage}]);
    } finally {
        setIsRefining(false);
    }
  };

  const handleApplyCode = (codeUpdates: { path: string, content: string }[]) => {
      const newFileSystem = { ...fileSystem };
      const newOpenFiles = [...openFiles];

      codeUpdates.forEach(({ path, content }) => {
          newFileSystem[path] = content;
          if (!newOpenFiles.includes(path)) {
            newOpenFiles.push(path);
          }
      });
      
      setFileSystem(newFileSystem);
      setOpenFiles(newOpenFiles);
      setChatHistory(prev => [...prev, { role: 'system', content: 'Code has been applied to ' + codeUpdates.map(c => c.path).join(', ') + '.' }]);
      
      const firstFile = codeUpdates[0]?.path;
      if (firstFile) {
          const fileToActivate = codeUpdates.find(c => c.path.endsWith('index.html'))?.path || firstFile;
          setActiveFile(fileToActivate);
      }
  };
  
  const submitPrompt = async (promptText: string) => {
    if (!promptText || isLoading) return;

    const newUserMessage: ChatMessage = { role: 'user', content: promptText };
    setChatHistory(prev => [...prev, newUserMessage]);
    setCliInput('');
    setError('');
    setIsLoading(true);
    setLoadingMessage('Gemini agent is thinking...');

    try {
        const geminiResult = await chatWithAgent([...chatHistory, newUserMessage], fileSystem, previewRoot);
        const geminiMessage: ChatMessage = { 
            role: 'model',
            content: geminiResult.text,
            explanation: geminiResult.explanation,
            code: geminiResult.code,
            suggestions: geminiResult.suggestions,
        };
        
        setChatHistory(prev => [...prev, geminiMessage]);

    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      setError('Agent failed to respond: ' + errorMessage);
      setChatHistory(prev => [...prev, {role: 'system', content: 'Error: ' + errorMessage}]);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    submitPrompt(cliInput);
  };
  
  const handleLayoutSelect = (layout: LayoutTemplateData) => {
    let promptText = 'Please apply the "' + layout.name + '" layout to the project.\n\n' +
        'This is a user-initiated action from a layout template library.\n\n' +
        '**Instructions:**\n' +
        '1.  Completely replace the content inside the `<body>` tag of `index.html` with the provided HTML structure.\n' +
        '2.  Create a new file named `/layout.css`. Place the provided CSS content into this file.\n' +
        '3.  In the `<head>` of `index.html`, add a link to this new stylesheet: `<link rel="stylesheet" href="/layout.css">`. Ensure this link is present. If other stylesheets exist (like style.css), this new one can be placed before them.\n\n' +
        '---\n' +
        '**HTML for `index.html` body:**\n' +
        '```html\n' +
        layout.html + '\n' +
        '```\n\n' +
        '---\n' +
        '**CSS for `/layout.css`:**\n' +
        '```css\n' +
        layout.css + '\n' +
        '```\n';


    let instructionCounter = 4;
    if (layout.js) {
        promptText += '\n---\n' +
            '**JavaScript for `/script.js`:**\n' +
            (instructionCounter++) + '. Replace the content of `/script.js` with the following code.\n' +
            '```javascript\n' +
            layout.js + '\n' +
            '```\n';
    }

    if (layout.data && layout.data.length > 0) {
        layout.data.forEach((file) => {
            const lang = file.path.split('.').pop() || '';
            promptText += '\n---\n' +
                '**Data file `' + file.path + '`:**\n' +
                (instructionCounter++) + '. Create a new file named `' + file.path + '` and add the following content.\n' +
                '```' + lang + '\n' +
                file.content + '\n' +
                '```\n';
        });
    }

    promptText += '\nAfter applying all changes, give a friendly confirmation message and suggest what the user could do next, like modifying the content in the newly created files.\n';
    submitPrompt(promptText);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const DATA_TYPE = 'application/vnd.live-dev-sandbox.component+json';
    const componentJSON = e.dataTransfer.getData(DATA_TYPE);

    if (componentJSON && previewRoot) {
        try {
            const component: DraggableComponent = JSON.parse(componentJSON);
            const { html: componentHtml, name } = component;
            if (componentHtml) {
                const newId = uuidv4();
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = componentHtml.trim();
                const elementToModify = tempDiv.firstChild as HTMLElement;

                if (elementToModify) {
                    elementToModify.setAttribute('data-editable-id', newId);
                    const editableTags = ['h1', 'p', 'button', 'a'];
                    if (editableTags.includes(elementToModify.tagName.toLowerCase())) {
                       elementToModify.setAttribute('contenteditable', 'true');
                    }
                }
                const modifiedHtml = tempDiv.innerHTML;
                
                const htmlPath = `${previewRoot}index.html`;

                setFileSystem(prevFs => {
                    const currentHtml = prevFs[htmlPath] || '';
                    const bodyEndIndex = currentHtml.lastIndexOf('</body>');
                    const newHtml = bodyEndIndex !== -1 
                      ? currentHtml.slice(0, bodyEndIndex) + modifiedHtml + '\n' + currentHtml.slice(bodyEndIndex)
                      : currentHtml + '\n' + modifiedHtml;
                    return { ...prevFs, [htmlPath]: newHtml };
                });
                handleFileSelect(htmlPath);
                setChatHistory(prev => [...prev, {role: 'system', content: `Component "${name}" added to ${htmlPath}.`}]);
            }
        } catch (err) {
            console.error("Failed to parse dropped component data:", err);
            setChatHistory(prev => [...prev, {role: 'system', content: 'Error: Could not add component.'}]);
        }
    }
  };

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const handleIframeLoad = () => {
        const doc = iframe.contentDocument;
        if (!doc) return;

        const updateCodeFromDOM = (id: string, newContent: string) => {
            const htmlPath = `${previewRoot}index.html`;
            setFileSystem(prev => {
                const html = prev[htmlPath] || '';
                const parser = new DOMParser();
                const htmlDoc = parser.parseFromString(html, 'text/html');
                const el = htmlDoc.querySelector(`[data-editable-id="${id}"]`);
                if (el) {
                    el.innerHTML = newContent;
                    return { ...prev, [htmlPath]: htmlDoc.body.innerHTML };
                }
                return prev;
            });
        };

        const handleBodyClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const editableEl = target.closest<HTMLElement>('[data-editable-id]');

            if (editableEl) {
                const id = editableEl.dataset.editableId;
                if (id) {
                    setSelectedElementId(id);
                    const iframeRect = iframe.getBoundingClientRect();
                    const elementRect = editableEl.getBoundingClientRect();
                    setToolbarPosition({
                        top: iframeRect.top + elementRect.top,
                        left: iframeRect.left + elementRect.left + (elementRect.width / 2),
                    });
                }
            } else {
                setSelectedElementId(null);
                setToolbarPosition(null);
            }
        };

        const handleFocusOut = (e: FocusEvent) => {
            const target = e.target as HTMLElement;
            if (target.isContentEditable) {
                const id = target.dataset.editableId;
                if (id) {
                    updateCodeFromDOM(id, target.innerHTML);
                }
            }
        };

        doc.body.addEventListener('click', handleBodyClick);
        doc.body.addEventListener('focusout', handleFocusOut);
        return () => {
            doc.body.removeEventListener('click', handleBodyClick);
            doc.body.removeEventListener('focusout', handleFocusOut);
        };
    };
    iframe.addEventListener('load', handleIframeLoad);
    return () => {
      if (iframe) {
        iframe.removeEventListener('load', handleIframeLoad);
      }
    };
  }, [srcDoc, previewRoot]);

    const updateElementInCode = (id: string, updateFn: (element: HTMLElement) => void) => {
        const htmlPath = `${previewRoot}index.html`;
        setFileSystem(prev => {
            const html = prev[htmlPath] || '';
            const parser = new DOMParser();
            const htmlDoc = parser.parseFromString(html, 'text/html');
            const element = htmlDoc.querySelector(`[data-editable-id="${id}"]`);
            if (element) {
                updateFn(element as HTMLElement);
                return { ...prev, [htmlPath]: htmlDoc.body.innerHTML };
            }
            return prev;
        });
    };

    const handleAlign = (alignment: 'left' | 'center' | 'right') => {
        if (selectedElementId) updateElementInCode(selectedElementId, el => el.style.textAlign = alignment);
    };
    const handleStyle = (style: 'bold' | 'italic') => {
        if (selectedElementId) updateElementInCode(selectedElementId, el => {
            if (style === 'bold') el.style.fontWeight = el.style.fontWeight === 'bold' ? '' : 'bold';
            if (style === 'italic') el.style.fontStyle = el.style.fontStyle === 'italic' ? '' : 'italic';
        });
    };

    const handleNewFile = (path: string) => {
      setFileSystem(prev => ({ ...prev, [path]: '' }));
      handleFileSelect(path);
    };

    const handleNewFolder = (path: string) => {
      const folderPath = path.endsWith('/') ? path : `${path}/`;
      setFileSystem(prev => ({ ...prev, [`${folderPath}.placeholder`]: '' }));
    };

    const handleFileUpload = async (files: FileList) => {
      let newFiles: FileSystemState = {};
      let firstDirPath = '';

      for (const file of files) {
          if (file.name.endsWith('.zip')) {
              const zip = await JSZip.loadAsync(file);
              const rootDirs = new Set(Object.keys(zip.files).map(p => p.split('/')[0]));
              const commonRoot = rootDirs.size === 1 ? [...rootDirs][0] + '/' : '';
              if (commonRoot) firstDirPath = `/${commonRoot}`;
              
              for (const path in zip.files) {
                  const zipEntry = zip.files[path];
                  if (!zipEntry.dir) {
                      const content = await zipEntry.async('string');
                      newFiles[`/${path}`] = content;
                  }
              }
          } else {
              const content = await file.text();
              newFiles[`/${file.name}`] = content;
          }
      }
      setFileSystem(prev => ({ ...prev, ...newFiles }));
      if(firstDirPath) setPreviewRoot(firstDirPath);
      setChatHistory(prev => [...prev, { role: 'system', content: `Uploaded ${files.length} item(s).`}])
    };
    
    const handleDownloadProject = async () => {
        const zip = new JSZip();
        Object.entries(fileSystem).forEach(([path, content]) => {
            if (path.endsWith('.placeholder')) return;
            const cleanPath = path.startsWith('/') ? path.substring(1) : path;
            zip.file(cleanPath, content);
        });

        try {
            const blob = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'live-dev-project.zip';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setChatHistory(prev => [...prev, { role: 'system', content: 'Project downloaded successfully.' }]);
        } catch (err) {
            console.error("Failed to generate zip file:", err);
            setChatHistory(prev => [...prev, { role: 'system', content: 'Error: Could not download project.' }]);
        }
    };
    
    const handleChatResizeMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizingChat(true);
    };

    const handleChatResizeMouseMove = useCallback((e: MouseEvent) => {
        if (!isResizingChat) return;
        const newHeight = window.innerHeight - e.clientY;
        if (newHeight > 80 && newHeight < window.innerHeight - 200) {
            setChatPanelHeight(newHeight);
        }
    }, [isResizingChat]);

    const handleChatResizeMouseUp = useCallback(() => {
        setIsResizingChat(false);
    }, []);

    useEffect(() => {
        if (isResizingChat) {
            window.addEventListener('mousemove', handleChatResizeMouseMove);
            window.addEventListener('mouseup', handleChatResizeMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleChatResizeMouseMove);
            window.removeEventListener('mouseup', handleChatResizeMouseUp);
        };
    }, [isResizingChat, handleChatResizeMouseMove, handleChatResizeMouseUp]);

    const languageForEditor = (path: string | null): 'html' | 'css' | 'javascript' | 'typescript' | 'tsx' | 'markdown' => {
      if (!path) return 'markdown';
      if (path.endsWith('.md')) return 'markdown';
      if (path.endsWith('.html')) return 'html';
      if (path.endsWith('.css')) return 'css';
      if (path.endsWith('.js')) return 'javascript';
      if (path.endsWith('.ts')) return 'typescript';
      if (path.endsWith('.tsx')) return 'tsx';
      return 'markdown';
    };
    
    const handleSuggestionClick = (suggestion: string) => {
        submitPrompt(suggestion);
    };

    const handleContainerCreate = (selections: { base: string | null; ui: string[]; datastore: string | null }, promptText: string, env: { apiName: string, apiKey: string }) => {
        let newFileSystem: FileSystemState = {};
        const chosenTemplates = { base: selections.base, ui: selections.ui, datastore: selections.datastore };
        
        // Combine files from all selected templates
        const allSelections = [selections.base, ...selections.ui, selections.datastore].filter(Boolean) as string[];
        allSelections.forEach(key => {
            if (templateFiles[key]) {
                newFileSystem = { ...newFileSystem, ...templateFiles[key] };
            }
        });
        
        const newHandover: HandoverLog = {
            container_id: `container_${uuidv4()}`,
            operator: 'andoy',
            prompt: promptText,
            chosen_templates: chosenTemplates,
            env: {
                API_NAME: env.apiName,
                API_KEY: env.apiKey,
            },
            status: 'initialized',
            created_at: new Date().toISOString(),
            history: [{
                action: 'create',
                by: 'andoy',
                at: new Date().toISOString(),
                details: {
                    template: selections.base,
                    ui: selections.ui,
                    datastore: selections.datastore,
                    env: {
                        API_NAME: env.apiName,
                        API_KEY: env.apiKey,
                    }
                }
            }]
        };
        
        newFileSystem['/handover.json'] = JSON.stringify(newHandover, null, 2);
        
        setFileSystem(newFileSystem);
        setContainerInfo(newHandover);
        const newOpenFiles = Object.keys(newFileSystem).filter(p => !p.endsWith('.json') && !p.endsWith('.css')).slice(0, 3);
        setOpenFiles(newOpenFiles);
        setActiveFile(newOpenFiles[0] || null);
        setPreviewRoot('/'); // Reset preview root to default for new containers
        setChatHistory(prev => [...prev, { role: 'system', content: `Container created with templates: ${allSelections.join(', ')}.` }]);
    };
    
    const handleContainerAction = (action: 'install' | 'build' | 'start' | 'debug') => {
        if (!containerInfo) return;
        
        // This is a simulation
        const newStatusMap = {
            install: 'installed',
            build: 'built',
            start: 'running',
            debug: containerInfo.status // Debug doesn't change status unless an error is found
        }
        
        const newHandover = { ...containerInfo };
        newHandover.status = newStatusMap[action] as HandoverLog['status'];
        newHandover.history.push({
            action: `command`,
            by: 'andoy',
            at: new Date().toISOString(),
            details: { command: `npm run ${action}`, status: 'success' } // Simulated
        });
        
        setContainerInfo(newHandover);
        setFileSystem(prev => ({ ...prev, '/handover.json': JSON.stringify(newHandover, null, 2) }));
        setChatHistory(prev => [...prev, { role: 'system', content: `Simulated '${action}' command finished successfully.` }]);
        
        if (action === 'debug') {
            submitPrompt("The user clicked 'Debug'. Based on the handover log and file system, identify potential issues and suggest a fix.");
        }
    };


    if (isDBLoading) {
      return (
        <div className="flex flex-col h-full w-full items-center justify-center bg-[var(--dark-bg)] text-[var(--text-color)] gap-4">
          <GeminiIcon className="w-16 h-16 text-[var(--neon-purple)] animate-pulse" />
          <h2 className="text-2xl font-bold tracking-widest">Loading Your Sandbox...</h2>
        </div>
      )
    }

    const chatPanelContent = (
      <>
        <div className="flex-shrink-0 flex items-center justify-between p-2 pl-4 h-12 bg-black/30 border-b border-[var(--card-border)]">
            <div 
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => chatWindowState === 'minimized' && setChatWindowState('normal')}
            >
                <GeminiIcon className="h-6 w-6 text-[var(--neon-purple)]" />
                <h2 className="font-bold text-lg">AI Chat</h2>
            </div>
            <div className="flex items-center gap-1">
              { chatWindowState === 'minimized' ? (
                <button onClick={() => setChatWindowState('normal')} className="p-1.5 text-gray-300 hover:bg-black/50 rounded-md" title="Open Chat">
                    <ChevronUpIcon className="h-5 w-5" />
                </button>
              ) : (
                <>
                  { chatWindowState === 'maximized' ? (
                    <button onClick={() => setChatWindowState('normal')} className="p-1.5 text-gray-300 hover:bg-black/50 rounded-md" title="Restore Down">
                      <RestoreIcon className="h-5 w-5" />
                    </button>
                  ) : (
                    <button onClick={() => setChatWindowState('maximized')} className="p-1.5 text-gray-300 hover:bg-black/50 rounded-md" title="Maximize">
                      <MaximizeIcon className="h-5 w-5" />
                    </button>
                  )}
                  <button onClick={() => setChatWindowState('minimized')} className="p-1.5 text-gray-300 hover:bg-black/50 rounded-md" title="Minimize">
                    <MinimizeIcon className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>
        </div>
        
        {chatWindowState !== 'minimized' && (
          <div className="flex-grow flex flex-col overflow-y-hidden">
            <div ref={chatContainerRef} className="flex-grow p-4 overflow-y-auto" aria-live="polite">
                {chatHistory.map((msg, index) => <ChatMessageView key={index} message={msg} onApplyCode={handleApplyCode} onSuggestionClick={handleSuggestionClick} />)}
                {isLoading && (
                    <div className="flex justify-center my-4" role="status" aria-label={loadingMessage}>
                        <div className="flex items-center gap-2 text-[var(--neon-pink)]">
                            <SpinnerIcon className="h-5 w-5 animate-spin" /><span>{loadingMessage}</span>
                        </div>
                    </div>
                )}
                {error && <p className="text-[var(--neon-pink)] text-sm mt-2" role="alert">{error}</p>}
            </div>
            <div className="flex-shrink-0 p-4 border-t border-[var(--card-border)] bg-black/30">
                <form onSubmit={handleSubmit}>
                    <div className="relative">
                        <input type="text" value={cliInput} onChange={(e) => setCliInput(e.target.value)} placeholder="Send a message to the agent..." className="w-full p-3 pl-10 bg-black/30 border border-[var(--card-border)] rounded-full focus:ring-2 focus:ring-[var(--neon-purple)] focus:border-[var(--neon-purple)] focus:outline-none transition font-mono text-sm" disabled={isLoading} aria-label="Chat input" />
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--neon-purple)] font-bold" aria-hidden="true">&gt;</span>
                        <button type="submit" disabled={isLoading || !cliInput} className="absolute right-2 top-1/2 -translate-y-1/2 bg-[var(--neon-pink)] hover:brightness-125 disabled:bg-[var(--neon-pink)]/50 disabled:cursor-not-allowed text-black font-bold py-2 px-4 rounded-full transition-all">Send</button>
                    </div>
                </form>
            </div>
          </div>
        )}
      </>
    );

    if (chatWindowState === 'maximized') {
      return (
        <div className="flex flex-col h-full w-full glass-effect border-t-2 border-[var(--neon-purple)] overflow-hidden">
          {chatPanelContent}
        </div>
      );
    }
    
    return (
    <div className="flex flex-col h-full w-full overflow-hidden">
        {toolbarPosition && (
            <FloatingToolbar position={toolbarPosition} onAlign={handleAlign} onStyle={handleStyle} />
        )}
        
        {/* Top Section: Main Panels */}
        <div ref={containerRef} className="flex-grow flex w-full overflow-hidden relative">
            {/* Left Panel */}
            {!isLeftPanelCollapsed && (
                <div style={{ flexBasis: `${panelSizes[0]}%` }} className="flex flex-col gap-4 p-4 overflow-y-auto min-w-[200px] bg-black/20 backdrop-blur-sm border-r border-[var(--card-border)]">
                    <CollapsibleSection title="System Operator">
                        <SystemOperatorPanel 
                          containerInfo={containerInfo}
                          onContainerCreate={handleContainerCreate}
                          onContainerAction={handleContainerAction}
                          registry={registry}
                        />
                    </CollapsibleSection>
                    <CollapsibleSection title="File Explorer">
                        <FileExplorer 
                          fileSystem={fileSystem} 
                          activeFile={activeFile}
                          previewRoot={previewRoot}
                          onFileSelect={handleFileSelect}
                          onNewFile={handleNewFile}
                          onNewFolder={handleNewFolder}
                          onFileUpload={handleFileUpload}
                          onSetPreviewRoot={setPreviewRoot}
                          onDownloadProject={handleDownloadProject}
                        />
                    </CollapsibleSection>
                    <CollapsibleSection title="Components">
                        <ComponentLibrary onDragStart={() => setIsDragging(true)} onDragEnd={() => setIsDragging(false)} />
                    </CollapsibleSection>
                    <CollapsibleSection title="Layout Templates">
                        <LayoutTemplates onLayoutSelect={handleLayoutSelect} />
                    </CollapsibleSection>
                </div>
            )}

            {/* Collapse Toggle */}
            <div onClick={toggleLeftPanel} className="flex-shrink-0 bg-black/20 hover:bg-[var(--neon-purple)] cursor-pointer flex items-center justify-center w-5 transition-all duration-300 group">
                {isLeftPanelCollapsed ? <PanelRightIcon className="h-5 w-5 text-[var(--neon-purple)] group-hover:text-black transition-colors"/> : <PanelLeftIcon className="h-5 w-5 text-[var(--neon-purple)] group-hover:text-black transition-colors"/>}
            </div>

            <div onMouseDown={(e) => handleMouseDown(0, e)} className="resize-handle" />

            {/* Center Panel: Tabbed Editor */}
            {!isCenterPanelCollapsed && (
              <div style={{ flexBasis: `${panelSizes[1]}%` }} className="flex flex-col glass-effect rounded-lg overflow-hidden min-w-[300px]">
                  {/* Tab Bar */}
                  <div className="flex-shrink-0 flex border-b border-black/20 bg-black/30 overflow-x-auto">
                      {openFiles.map(path => (
                          <button 
                            key={path} 
                            onClick={() => handleFileSelect(path)} 
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-r border-black/20 whitespace-nowrap ${activeFile === path ? 'bg-[var(--neon-purple)] text-black' : 'text-gray-300 hover:bg-black/40'}`}
                            title={path}
                          >
                            <DocumentTextIcon className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate max-w-[150px]">{path.split('/').pop()}</span>
                            <span onClick={(e) => handleCloseFile(path, e)} className="p-1 rounded-full hover:bg-black/20">
                              <XIcon className="h-3 w-3" />
                            </span>
                          </button>
                      ))}
                  </div>

                  {/* Editor Content */}
                  <div className="flex flex-col flex-grow h-full bg-transparent">
                    {activeFile && !activeFile.endsWith('/') && fileSystem[activeFile] !== undefined && (
                        <>
                          <div className="flex-shrink-0 p-2 border-b border-black/20 bg-black/20">
                            <div className="flex items-center gap-2">
                                <input 
                                    type="text"
                                    value={refineInstruction}
                                    onChange={(e) => setRefineInstruction(e.target.value)}
                                    placeholder={`Refine ${activeFile.split('/').pop()}... (e.g., 'add a confirmation step')`}
                                    className="w-full p-2 bg-black/30 border border-[var(--card-border)] rounded-md focus:ring-2 focus:ring-[var(--neon-purple)] focus:border-[var(--neon-purple)] focus:outline-none transition font-mono text-sm"
                                    disabled={isRefining || !activeFile || activeFile.endsWith('.md')}
                                    aria-label="Code refinement instruction"
                                />
                                <button
                                    onClick={handleRefineCode}
                                    disabled={isRefining || !refineInstruction || !activeFile || activeFile.endsWith('.md')}
                                    className="flex items-center gap-2 bg-[var(--neon-purple)] hover:brightness-125 disabled:bg-[var(--neon-purple)]/50 disabled:cursor-not-allowed text-black font-bold py-2 px-4 rounded-md transition-all whitespace-nowrap"
                                    aria-label="Refine code with AI"
                                >
                                  {isRefining ? <SpinnerIcon className="h-5 w-5 animate-spin"/> : <MagicWandIcon className="h-5 w-5"/>}
                                  <span>Refine</span>
                                </button>
                            </div>
                          </div>
                          <div className="flex-grow overflow-auto">
                              <CodeEditor 
                                  value={fileSystem[activeFile]}
                                  language={languageForEditor(activeFile)} 
                                  onChange={handleCodeChange}
                              />
                          </div>
                        </>
                    )}
                    {!activeFile && (
                      <div className="flex items-center justify-center h-full text-gray-500">
                          <p>No file selected. Open a file from the explorer.</p>
                      </div>
                    )}
                  </div>
              </div>
            )}
            
            {/* Collapse Toggle for Center Panel */}
            <div 
              onClick={toggleCenterPanel} 
              className="flex-shrink-0 bg-black/20 hover:bg-[var(--neon-purple)] cursor-pointer flex items-center justify-center w-5 transition-all duration-300 group"
              title={isCenterPanelCollapsed ? "Show Editor" : "Hide Editor"}
            >
              {isCenterPanelCollapsed ? <PanelLeftIcon className="h-5 w-5 text-[var(--neon-purple)] group-hover:text-black transition-colors"/> : <PanelRightIcon className="h-5 w-5 text-[var(--neon-purple)] group-hover:text-black transition-colors"/>}
            </div>

            {!isCenterPanelCollapsed && <div onMouseDown={(e) => handleMouseDown(1, e)} className="resize-handle" />}

            {/* Right Panel */}
            <div style={{ flexBasis: `${panelSizes[2]}%` }} className="flex flex-col h-full p-4 min-w-[300px]">
                <div className="glass-effect rounded-lg h-full flex flex-col overflow-hidden">
                    {/* Preview Header */}
                    <div className="flex-shrink-0 flex items-center justify-between p-2 pl-4 h-12 bg-black/30 border-b border-black/20">
                        <h2 className="font-bold text-lg">Live Preview</h2>
                        <button onClick={generatePreview} className="p-1.5 text-gray-300 hover:text-[var(--neon-blue)] hover:bg-black/50 rounded-md" title="Refresh Preview">
                            <RefreshCwIcon className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Preview Content */}
                    <div className="flex-grow relative p-2 bg-black/20">
                      {activeFile && (activeFile.endsWith('.md')) ? (
                           <MarkdownPreview markdown={fileSystem[activeFile] || ''} />
                      ) : (
                          <>
                           <iframe ref={iframeRef} srcDoc={srcDoc} title="Live code preview" sandbox="allow-scripts allow-same-origin allow-popups" className="w-full h-full bg-white/5 rounded-md" />
                           <div
                              onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
                              onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={handleDrop}
                              className={`absolute inset-0 transition-all duration-300 rounded-md ${isDragging ? 'border-4 border-dashed border-[var(--neon-pink)] bg-black/40 backdrop-blur-sm flex items-center justify-center text-xl font-bold' : 'pointer-events-none'}`}
                            >
                               {isDragging && <span>Drop to Add Component</span>}
                           </div>
                          </>
                      )}
                    </div>
                </div>
            </div>
        </div>
        
        {/* Bottom Section: Chat Panel */}
        {chatWindowState === 'normal' && (
          <div 
            onMouseDown={handleChatResizeMouseDown}
            className="flex-shrink-0 w-full h-2 bg-black/30 hover:bg-[var(--neon-blue)] cursor-row-resize transition-colors group"
            title="Resize chat panel"
          >
            <div className="h-full w-16 mx-auto bg-[var(--neon-purple)]/50 group-hover:bg-[var(--neon-blue)] rounded-full opacity-50 group-hover:opacity-100 transition-all"></div>
          </div>
        )}

        <div 
          className={`
            flex-shrink-0 flex flex-col glass-effect border-t-2 border-[var(--neon-purple)] overflow-hidden transition-all duration-300 ease-in-out
            ${chatWindowState === 'minimized' ? 'h-12' : ''}
          `}
          style={chatWindowState === 'normal' ? { height: `${chatPanelHeight}px` } : {}}
        >
            {chatPanelContent}
        </div>
    </div>
  );
};

export default OrchestratorPanel;