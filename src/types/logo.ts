// Chat message types for Logo Studio
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageData?: string;
  generatedImage?: string;
  wantsAnalysis?: boolean;
  timestamp: Date;
}

// Chat message types for Store Assets
export interface StoreMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageData?: string;
  generatedImage?: string;
  storeData?: StoreMetadata;
  timestamp: Date;
}

// App store metadata fields
export interface StoreMetadata {
  appName?: string;
  subtitle?: string;
  description?: string;
  keywords?: string;
  whatsNew?: string;
  category?: string;
  promotionalText?: string;
  screenshotCaptions?: string[];
}

// Mockup configuration
export interface MockupConfig {
  platform: "ios" | "android";
  devices: string[];
  layout: "single" | "panoramic" | "before-after";
  bgStyle: "gradient" | "solid" | "blur";
}

// Individual screenshot item for MockupWorkspace
export interface ScreenshotItem {
  id: string;
  imageData: string;
  caption: string;
  aiSuggestion?: string;
  textPosition: "top" | "bottom";
}
