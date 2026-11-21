import { useEffect, useState } from 'react';

/**
 * Detects whether the section is rendered inside an expanded (maximized) Workspace2
 * window. The workspace framework takes over the whole content area under the app
 * header when a window is maximized by giving its container a fixed position, while
 * a collapsed window is positioned absolutely within the page — so the resolved
 * `position` of the nearest positioned ancestor is a stable signal that does not
 * depend on the framework's hashed CSS module class names or private store APIs.
 */
export function useWorkspaceMaximized(element: HTMLElement | null): boolean {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (!element) {
      return;
    }

    let frame: number;
    const check = () => {
      let ancestor = element.parentElement;
      let hasFixedAncestor = false;
      while (ancestor && ancestor !== document.body) {
        if (getComputedStyle(ancestor).position === 'fixed') {
          hasFixedAncestor = true;
          break;
        }
        ancestor = ancestor.parentElement;
      }
      setMaximized(hasFixedAncestor);
    };

    check();
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(check);
    });
    observer.observe(element);
    window.addEventListener('resize', check);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', check);
      cancelAnimationFrame(frame);
    };
  }, [element]);

  return maximized;
}
