import React from 'react';
import { LayoutIcon } from './Icons';

export interface LayoutTemplateData {
  id: string;
  name: string;
  description: string;
  html: string;
  css: string;
  js?: string;
  data?: { path: string, content: string }[];
}

const layouts: LayoutTemplateData[] = [
    {
        id: 'holy-grail',
        name: 'Holy Grail',
        description: 'Classic 3-column responsive layout with a header and footer.',
        html: `
<header class="header">Header</header>
<div class="container">
  <main class="main-content">
    <h2>Main Content</h2>
    <p>This is the main area for content. It will adapt to different screen sizes.</p>
  </main>
  <aside class="sidebar-left">Left Sidebar</aside>
  <aside class="sidebar-right">Right Sidebar</aside>
</div>
<footer class="footer">Footer</footer>`,
        css: `
body, html {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family: sans-serif;
  color: #E0E0E0;
}

body {
  display: flex;
  flex-direction: column;
  background-color: transparent; /* Allow main BG to show through */
}

.header, .footer {
  background: rgba(44, 62, 80, 0.7);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.1);
  color: white;
  padding: 1rem;
  text-align: center;
  flex-shrink: 0;
}

.container {
  display: grid;
  grid-template-areas:
    "left main right";
  grid-template-columns: 1fr 2.5fr 1fr;
  gap: 1rem;
  padding: 1rem;
  flex-grow: 1;
}

.main-content, .sidebar-left, .sidebar-right {
  background: rgba(50, 50, 55, 0.6);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.1);
  padding: 1rem;
  border-radius: 8px;
}

.main-content {
  grid-area: main;
}

.sidebar-left {
  grid-area: left;
}

.sidebar-right {
  grid-area: right;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .container {
    grid-template-areas:
      "main"
      "left"
      "right";
    grid-template-columns: 1fr;
  }
}
`
    },
    {
        id: 'dashboard-shell',
        name: 'Dashboard Shell',
        description: 'A common application layout with a fixed sidebar and main content area.',
        html: `
<div class="dashboard-container">
  <aside class="dashboard-sidebar">
    <h2>Dashboard</h2>
    <nav>
      <ul>
        <li><a href="#">Home</a></li>
        <li><a href="#">Analytics</a></li>
        <li><a href="#">Settings</a></li>
      </ul>
    </nav>
  </aside>
  <main class="dashboard-main">
    <h1>Welcome, User!</h1>
    <div class="content-card">Your dashboard content here.</div>
  </main>
</div>`,
        css: `
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family: sans-serif;
  background-color: transparent; /* Allow main BG to show through */
}
.dashboard-container {
  display: flex;
  height: 100%;
}
.dashboard-sidebar {
  width: 240px;
  background-color: rgba(26, 34, 46, 0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-right: 1px solid rgba(255,255,255,0.1);
  color: #fff;
  padding: 1.5rem;
  flex-shrink: 0;
}
.dashboard-sidebar h2 {
  margin-top: 0;
}
.dashboard-sidebar nav ul {
  list-style: none;
  padding: 0;
}
.dashboard-sidebar nav li {
  margin-bottom: 1rem;
}
.dashboard-sidebar nav a {
  color: #aeb9c6;
  text-decoration: none;
  transition: color 0.2s;
}
.dashboard-sidebar nav a:hover {
  color: #fff;
}
.dashboard-main {
  flex-grow: 1;
  padding: 2rem;
  overflow-y: auto;
  color: #EAEAEA;
}
.content-card {
  margin-top: 2rem;
  background: rgba(50, 50, 55, 0.6);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.1);
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}
@media (max-width: 768px) {
    .dashboard-container {
        flex-direction: column;
    }
    .dashboard-sidebar {
        width: 100%;
        height: auto;
        border-right: none;
        border-bottom: 1px solid rgba(255,255,255,0.1);
    }
}
`
    },
    {
        id: 'profile-card-sticky',
        name: 'Sticky Profile',
        description: 'A sticky-footer layout with a profile card that loads data from a JSON file.',
        html: `
<div class="page-container">
  <header class="page-header">
    <h1>My Awesome Profile</h1>
  </header>
  <main class="page-main">
    <div class="profile-card">
      <img id="profile-image" src="https://via.placeholder.com/150" alt="Profile Picture" class="profile-image">
      <h2 id="profile-name" class="profile-name">Loading...</h2>
      <p id="profile-title" class="profile-title"></p>
      <div id="profile-socials" class="profile-socials">
        <!-- Social links will be injected here by JavaScript -->
      </div>
    </div>
  </main>
  <footer class="page-footer">
    <p>&copy; 2024 - Built in the Live Sandbox</p>
  </footer>
</div>`,
        css: `
body, html {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family: 'Roboto', sans-serif;
  color: #E0E0E0;
}
.page-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: transparent;
}
.page-header, .page-footer {
  flex-shrink: 0;
  background: rgba(28, 28, 30, 0.75);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255,255,255,0.1);
  padding: 1rem 2rem;
  text-align: center;
}
.page-footer {
  border-bottom: none;
  border-top: 1px solid rgba(255,255,255,0.1);
  font-size: 0.9rem;
}
.page-main {
  flex-grow: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
}
.profile-card {
  background: rgba(40, 40, 42, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 2.5rem;
  text-align: center;
  max-width: 350px;
  width: 100%;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
  border: 1px solid var(--neon-purple);
  box-shadow: 0 0 15px var(--neon-purple);
}
.profile-image {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 4px solid var(--neon-pink);
  margin: 0 auto 1.5rem;
  object-fit: cover;
}
.profile-name {
  font-family: 'Orbitron', sans-serif;
  font-size: 1.75rem;
  margin: 0;
  color: var(--neon-pink);
  text-shadow: 0 0 4px var(--neon-pink);
}
.profile-title {
  font-size: 1rem;
  color: #b0b0b0;
  margin: 0.25rem 0 1.5rem;
}
.profile-socials {
  display: flex;
  justify-content: center;
  gap: 1rem;
}
.profile-socials a {
  color: var(--neon-blue);
  text-decoration: none;
  font-size: 1.5rem;
  transition: transform 0.2s, text-shadow 0.2s;
}
.profile-socials a:hover {
  transform: scale(1.2);
  text-shadow: 0 0 8px var(--neon-blue);
}
`,
    js: `
document.addEventListener('DOMContentLoaded', () => {
  // Function to fetch and display profile data
  const loadProfileData = async () => {
    try {
      // Fetch data from the JSON file
      const response = await fetch('/profile.json');
      
      // Check if the request was successful
      if (!response.ok) {
        throw new Error(\`HTTP error! status: \${response.status}\`);
      }
      
      const data = await response.json();
      
      // Update the DOM with the fetched data
      document.getElementById('profile-image').src = data.imageUrl;
      document.getElementById('profile-name').textContent = data.name;
      document.getElementById('profile-title').textContent = data.title;
      
      const socialsContainer = document.getElementById('profile-socials');
      socialsContainer.innerHTML = ''; // Clear existing content
      
      // Create and append social links
      for (const [network, url] of Object.entries(data.socials)) {
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        // Note: This example doesn't include icons. An enhancement could be to use an icon library.
        link.textContent = network.charAt(0).toUpperCase() + network.slice(1);
        socialsContainer.appendChild(link);
      }
      
    } catch (error) {
      console.error('Could not load profile data:', error);
      document.getElementById('profile-name').textContent = 'Error';
      document.getElementById('profile-title').textContent = 'Could not load data.';
    }
  };
  
  // Call the function to load data when the page loads
  loadProfileData();
});
`,
    data: [
        {
            path: '/profile.json',
            content: JSON.stringify({
                "name": "Alex Ryder",
                "title": "Lead Frontend Engineer",
                "imageUrl": "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=150&w=150",
                "socials": {
                    "GitHub": "https://github.com",
                    "LinkedIn": "https://linkedin.com",
                    "Twitter": "https://twitter.com"
                }
            }, null, 2)
        }
    ]
    },
];


const LayoutPreview: React.FC<{ layout: LayoutTemplateData }> = ({ layout }) => {
    // This is a simplified visual representation.
    const getPreviewStructure = () => {
        switch(layout.id) {
            case 'holy-grail':
                return (
                    <div className="flex flex-col w-full h-full bg-gray-200">
                        <div className="h-2 bg-gray-500 flex-shrink-0"></div>
                        <div className="flex-grow flex gap-1 p-1">
                            <div className="w-3 bg-gray-400"></div>
                            <div className="flex-grow bg-gray-100"></div>
                            <div className="w-3 bg-gray-400"></div>
                        </div>
                        <div className="h-2 bg-gray-500 flex-shrink-0"></div>
                    </div>
                );
            case 'dashboard-shell':
                return (
                    <div className="flex w-full h-full bg-gray-200">
                        <div className="w-4 bg-gray-600"></div>
                        <div className="flex-grow bg-gray-100 p-1"></div>
                    </div>
                );
            case 'profile-card-sticky':
                return (
                    <div className="flex flex-col w-full h-full bg-gray-200">
                        <div className="h-2 bg-gray-500 flex-shrink-0"></div>
                        <div className="flex-grow flex justify-center items-center p-1">
                            <div className="h-8 w-6 bg-gray-400 rounded-sm"></div>
                        </div>
                        <div className="h-2 bg-gray-500 flex-shrink-0"></div>
                    </div>
                );
            default:
                return <LayoutIcon className="w-8 h-8 text-gray-400" />
        }
    }
    return getPreviewStructure();
};

interface LayoutTemplatesProps {
    onLayoutSelect: (layout: LayoutTemplateData) => void;
}

const LayoutTemplates: React.FC<LayoutTemplatesProps> = ({ onLayoutSelect }) => {
    return (
        <div className="grid grid-cols-2 gap-2">
            {layouts.map(layout => (
                 <div
                    key={layout.id}
                    onClick={() => onLayoutSelect(layout)}
                    className="flex flex-col items-center p-2 bg-black/20 hover:bg-black/40 rounded-md cursor-pointer transition-all duration-200 border border-transparent hover:border-[var(--neon-green)]"
                    title={`Apply ${layout.name} layout`}
                >
                    <div className="h-16 w-full bg-black/20 rounded-sm mb-2 overflow-hidden border border-gray-600">
                        <LayoutPreview layout={layout} />
                    </div>
                    <p className="text-xs text-center text-gray-300 font-semibold">{layout.name}</p>
                    <p className="text-[10px] text-center text-gray-400 mt-1 hidden lg:block">{layout.description}</p>
                </div>
            ))}
        </div>
    );
};

export default LayoutTemplates;