"use client";

import { useEffect } from "react";

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error("页面渲染失败：", error);
  }, [error]);

  return (
    <html lang="zh-CN">
      <body>
        <main className="system-page">
          <h1>页面渲染失败</h1>
          <p>请稍后重试或联系网站管理员。</p>
          <button type="button" onClick={() => reset()}>
            重试
          </button>
        </main>
      </body>
    </html>
  );
}

