import type { FileSystemState } from './types';

export const registry = {
  TEMPLATES: {
    "REACT": { "path": "./react-vite", "tags": ["spa", "frontend", "vite"], name: "Vanilla JS Starter" },
  },
  UI: {
    "TAILWIND": { "path": "./tailwind-css", "tags": ["styles", "utility-css"], name: "Tailwind CSS" },
  },
  DATASTORE: {
    "IndexedDB": { "path": "./datastore/indexeddb", "tags": ["local", "browser-db"], name: "IndexedDB Helper" },
  }
};

const vanillaJsStarterTemplate: FileSystemState = {
  '/index.html': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vanilla JS Starter</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <header>
        <h1>Welcome to Your Project!</h1>
    </header>
    <main>
        <p id="message">This is a simple starter template for an HTML, CSS, and JavaScript project.</p>
        <button id="actionButton">Click Me!</button>
    </main>
    <script src="script.js"></script>
</body>
</html>`,
  '/style.css': `body {
    font-family: sans-serif;
    line-height: 1.6;
    margin: 0;
    padding: 0;
    background-color: #f4f4f4;
    color: #333;
}

header {
    background: #333;
    color: #fff;
    padding: 1rem 0;
    text-align: center;
}

main {
    padding: 1rem;
    max-width: 800px;
    margin: 2rem auto;
    background: #fff;
    border-radius: 5px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}

button {
    display: inline-block;
    background: #333;
    color: #fff;
    border: none;
    padding: 10px 20px;
    cursor: pointer;
    border-radius: 5px;
    margin-top: 1rem;
}

button:hover {
    background: #555;
}`,
  '/script.js': `document.addEventListener('DOMContentLoaded', () => {
    const messageElement = document.getElementById('message');
    const actionButton = document.getElementById('actionButton');

    let clickCount = 0;

    actionButton.addEventListener('click', () => {
        clickCount++;
        messageElement.textContent = \`You have clicked the button \${clickCount} time(s)!\`;
        console.log('Button clicked!');
    });

    console.log('Project script loaded successfully!');
});`
};


const tailwindTemplate: FileSystemState = {
  '/index.html': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vanilla JS Starter with Tailwind</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="style.css">
</head>
<body class="bg-gray-800 text-gray-100">
    <header class="bg-gray-900 shadow-md">
        <h1 class="text-3xl font-bold text-white text-center py-4">Welcome to Your Project!</h1>
    </header>
    <main class="max-w-3xl mx-auto my-8 p-6 bg-gray-700 rounded-lg shadow-xl">
        <p id="message" class="text-lg">This is a simple starter template for an HTML, CSS, and JavaScript project, styled with Tailwind CSS.</p>
        <button id="actionButton" class="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-md transition-colors duration-200">Click Me!</button>
    </main>
    <script src="script.js"></script>
</body>
</html>`,
  '/style.css': `/*
  Base styles are now handled by Tailwind CSS.
  You can add custom CSS component classes here if needed.
*/`
};

const indexedDbTemplate: FileSystemState = {
  '/src/db.js': `// Import from a CDN to work in a static environment
import { openDB } from 'https://esm.sh/idb';

const DB_NAME = 'MyAppData';
const DB_VERSION = 1;

let db;

export async function initDB() {
  if (db) return db;

  db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('items')) {
        db.createObjectStore('items', { keyPath: 'id', autoIncrement: true });
      }
    },
  });
  return db;
}

export async function addItem(item) {
  const db = await initDB();
  return db.add('items', item);
}

export async function getAllItems() {
  const db = await initDB();
  return db.getAll('items');
}
`
};

export const templateFiles: Record<string, FileSystemState> = {
  REACT: vanillaJsStarterTemplate,
  TAILWIND: tailwindTemplate,
  IndexedDB: indexedDbTemplate,
};