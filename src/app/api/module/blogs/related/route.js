import {NextResponse} from "next/server";
import {apiFetch, buildApiUrl} from "@/services/http";
import {getTenantContext} from "@/lib/tenant";

/**
 * GET /api/module/blogs/related
 * 代理相关博客请求，在服务端添加敏感的 API 认证和租户信息
 *
 * @param {Request} request - Next.js 请求对象
 * @returns {NextResponse} - 相关博客数据
 */
export async function GET(request) {
  try {
    // 解析查询参数
    const {searchParams} = new URL(request.url);
    const blogId = searchParams.get("id");
    const limit = searchParams.get("limit") || "3"; // 默认返回 3 条

    // 验证必需参数
    if (!blogId) {
      return NextResponse.json(
        {error: "缺少必需参数: id"},
        {status: 400}
      );
    }

    // 验证 limit 参数有效性
    const limitNum = parseInt(limit, 10);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 20) {
      return NextResponse.json(
        {error: "limit 参数必须是 1-20 之间的整数"},
        {status: 400}
      );
    }

    // 提取租户信息（从请求 headers 中识别租户）
    const tenant = await getTenantContext();

    // 构造后端 API 地址
    const apiUrl = buildApiUrl("/api/module/blogs/related", {
      id: blogId,
      limit: limitNum
    });

    // 使用 apiFetch 发起请求，自动添加租户标识和 API 认证
    const response = await apiFetch(apiUrl, null, {
      tenant,
      cache: "no-store", // 相关博客数据实时性要求高，不使用缓存
      timeout: 5000 // 5秒超时
    });

    // 检查响应状态
    if (!response.ok) {
      console.error(`后端 API 返回错误: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        {error: "获取相关博客失败"},
        {status: response.status}
      );
    }

    // 解析并返回数据
    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error("相关博客 API 代理错误:", error);

    // 区分超时错误和其他错误
    if (error.name === "AbortError") {
      return NextResponse.json(
        {error: "请求超时，请稍后重试"},
        {status: 504}
      );
    }

    return NextResponse.json(
      {error: "服务器内部错误"},
      {status: 500}
    );
  }
}
