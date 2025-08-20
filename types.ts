export type FileSystemState = Record<string, string>;

export interface DraggableComponent {
  id: string;
  name: string;
  html: string;
}

export interface ChatMessage {
  role: 'user' | 'model' | 'system';
  content: string; // For user message, system message, or model's brief conversational text
  explanation?: string; // For model's detailed explanation of code, formatted in markdown
  code?: { path: string; content: string; }[]; // Can contain updates for multiple files
  suggestions?: string[]; // Optional array of follow-up suggestions from the model
}

export interface HandoverLog {
  container_id: string;
  operator: string;
  prompt: string;
  chosen_templates: {
    base: string | null;
    ui: string[];
    datastore: string | null;
  };
  env?: { [key: string]: string };
  status: 'initialized' | 'installing' | 'installed' | 'building' | 'built' | 'starting' | 'running' | 'error';
  created_at: string;
  history: {
    action: string;
    by: string;
    at: string;
    details: any;
  }[];
}