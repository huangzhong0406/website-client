import { cache } from 'react';
import { headers } from 'next/headers';
import { logError, logWarn } from './logger';

export class TenantResolutionError extends Error {
  constructor(message, options) {
    super(message);
    this.name = 'TenantResolutionError';
    Object.assign(this, options);
  }
}

export class TenantNotFoundError extends TenantResolutionError {
  constructor(hostname, options) {
    super(`Tenant not found for host "${hostname}"`, options);
    this.name = 'TenantNotFoundError';
    this.hostname = hostname;
  }
}

/**
 * 获取 OpenNext 在 Cloudflare Worker 中注入的 env 对象。
 * 失败时返回 null，后续逻辑再根据情况兜底。
 */
function getCloudflareEnv() {
  try {
    const context = globalThis?.[Symbol.for('__cloudflare-context__')];
    return context?.env ?? null;
  } catch (error) {
    logWarn('Unable to access Cloudflare request context.', { error });
    return null;
  }
}

/**
 * 读取并返回 Cloudflare KV 命名空间（TENANTS）。
 * 开发环境下若不存在 KV，会尝试使用环境变量作为租户兜底。
 */
function getTenantsNamespace() {
  const env = getCloudflareEnv();
  if (!env || typeof env.TENANTS?.get !== 'function') {
    if (process.env.NODE_ENV !== 'production') {
      const fallbackTenant = process.env.DEFAULT_TENANT_ID ?? process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID ?? null;
      if (fallbackTenant) {
        logWarn('KV binding TENANTS not available, using fallback tenant id from env.');
        return fallbackTenant;
      }
    }
    logError('Cloudflare KV namespace TENANTS is not configured.');
    return null;
  }
  return env.TENANTS;
}

/**
 * 按照给定顺序尝试多个 KV key，命中即返回租户 ID。
 */
async function readTenantIdByKeys(namespace, keys, metadata = {}) {
  if (!namespace) {
    return null;
  }

  for (const key of keys) {
    try {
      const value = await namespace.get(key);
      if (value) {
        return value;
      }
    } catch (error) {
      logError('Failed to read tenant id from KV.', { ...metadata, key, error });
    }
  }

  return null;
}

async function readTenantIdFromKv(hostname) {
  const namespace = getTenantsNamespace();
  if (!namespace) {
    return null;
  }

  return readTenantIdByKeys(namespace, [`host:${hostname}`], { hostname });
}

/**
 * 统一处理 host 字段，去除端口并转为小写。
 */
function normalizeHost(hostname) {
  return hostname.replace(/:\d+$/, '').trim().toLowerCase();
}

/**
 * 基于精确 Host 匹配解析当前请求所属租户。
 * 不存在合法租户时抛出 TenantNotFoundError。
 */
export async function resolveTenantForHost(hostname) {
  const tenantHost = normalizeHost(hostname.split(':')[0]);
  console.log('解析租户域名，Host:', tenantHost);

  // 忽略本地开发环境
  if (tenantHost === 'localhost') {
    console.log('本地开发环境跳过kv识别');

    return {id: '00000000-0000-0000-0000-000000000001', host: 'localhost'};
  }

  const tenantId = await readTenantIdFromKv(tenantHost);
  console.log('tenantId', tenantId);

  if (tenantId) {
    return { id: tenantId, host: tenantHost };
  }

  throw new TenantNotFoundError(tenantHost);
}

/**
 * 供 cache() 包装调度：从请求头获取 Host 并解析租户上下文。
 */
async function resolveTenantInternal() {
  const headersList = await headers();
  const hostHeader = headersList.get('host');

  if (!hostHeader) {
    throw new TenantResolutionError('Missing Host header.');
  }

  return resolveTenantForHost(hostHeader);
}

export const getTenantContext = cache(resolveTenantInternal);
