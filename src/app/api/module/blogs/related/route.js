import { NextResponse } from 'next/server';

/**
 * 获取相关博客列表
 * GET /api/module/blogs/related?id=blog-id&limit=3
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const blogId = searchParams.get('id');
  const limit = parseInt(searchParams.get('limit') || '3');

  // 从环境变量获取 API 配置
  const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'https://api.singoo.ai';
  const apiToken = process.env.API_TOKEN || '';

  try {
    // 调用后端 API 获取相关博客
    const response = await fetch(
      `${apiBase}/api/module/blogs/related?id=${blogId}&limit=${limit}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`,
        },
        next: {
          revalidate: 3600, // 缓存1小时
        },
      }
    );

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching related blogs:', error);

    // 返回错误响应
    return NextResponse.json(
      {
        code: 500,
        message: '获取相关博客失败',
        data: []
      },
      { status: 500 }
    );
  }
}
