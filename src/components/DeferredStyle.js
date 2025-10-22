"use client";

import { useEffect, useState } from "react";

// 在浏览器空闲时注入非关键 CSS，避免阻塞首屏渲染
export default function DeferredStyle({ css, id }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!css || !isClient) return undefined;

    const style = document.createElement("style");
    if (id) {
      style.id = id;
    }
    style.dataset.deferred = "true";
    style.textContent = css;

    const inject = () => {
      if (document.head.contains(style)) return;
      document.head.appendChild(style);
    };

    if ("requestIdleCallback" in window) {
      requestIdleCallback(inject);
    } else {
      setTimeout(inject, 1);
    }

    return () => {
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    };
  }, [css, id, isClient]);

  return null;
}

