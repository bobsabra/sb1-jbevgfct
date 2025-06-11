/// <reference types="vite/client" />

interface Window {
  gTracker?: {
    trackConversion: (type: string, value?: number, currency?: string) => void;
  };
}