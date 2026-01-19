"use client";

import { useEffect } from "react";

export function FaviconHandler() {
  useEffect(() => {
    const updateFavicon = () => {
      const isDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const favicon = document.querySelector("link[rel='icon']") as HTMLLinkElement;
      const shortcut = document.querySelector("link[rel='shortcut icon']") as HTMLLinkElement;
      const apple = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
      
      const faviconPath = isDarkMode ? "/favicon-light.svg" : "/favicon-dark.svg";
      
      if (favicon) {
        favicon.href = faviconPath;
      }
      if (shortcut) {
        shortcut.href = faviconPath;
      }
      if (apple) {
        apple.href = faviconPath;
      }
    };

    // Set initial favicon
    updateFavicon();

    // Listen for changes in color scheme
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", updateFavicon);

    return () => {
      mediaQuery.removeEventListener("change", updateFavicon);
    };
  }, []);

  return null;
}

