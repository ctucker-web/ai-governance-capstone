export type WordPressSettings = {
  restUrl: string;
  nonce: string;
  appUrl: string;
  loginUrl: string;
  logoutUrl: string;
  siteName: string;
};

declare global {
  interface Window {
    aigwp: WordPressSettings;
  }
}

export const settings = window.aigwp;
