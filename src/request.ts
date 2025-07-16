import type { AxiosInstance } from "axios";
import axios from "axios";

interface ApiCategoryChild {
  add_time: number;
  catid: number;
  edit_uid: number;
  index: number;
  method: string;
  path: string;
  project_id: number;
  status: string;
  tag: string[];
  title: string;
  uid: number;
  up_time: number;
  _id: number;
}

interface ApiCategoryItem {
  parent_id: number;
  index: number;
  _id: number;
  name: string;
  project_id: number;
  desc: string;
  uid: number;
  add_time: number;
  up_time: number;
  __v: number;
  list: ApiCategoryChild[];
}

interface CategoryResult {
  data: ApiCategoryItem[];
  errcode: number;
  errmsg: string;
}

interface QueryPath {
  path: string;
  params: any[];
}

interface ReqHeader {
  required: string;
  _id: string;
  name: string;
  value: string;
  example: string;
}

interface ApiData {
  query_path: QueryPath;
  edit_uid: number;
  status: string;
  type: string;
  req_body_is_json_schema: boolean;
  res_body_is_json_schema: boolean;
  api_opened: boolean;
  index: number;
  tag: any[];
  _id: number;
  req_body_type: string;
  res_body_type: string;
  req_body_other: string;
  title: string;
  path: string;
  catid: number;
  markdown: string;
  req_headers: ReqHeader[];
  req_query: any[];
  res_body: string;
  method: string;
  req_body_form: any[];
  desc: string;
  project_id: number;
  req_params: any[];
  uid: number;
  add_time: number;
  up_time: number;
  __v: number;
  username: string;
}

interface ApiDetailResult {
  errcode: number;
  errmsg: string;
  data: ApiData;
}

interface Config {
  baseURL: string;
  cookie: string;
  requestParams: Record<string, any>;
  cacheConfig: CacheConfig;
}

/**
 * API 错误类
 */
class ApiError extends Error {
  constructor(
    public errcode: number,
    public errmsg: string,
    message?: string
  ) {
    super(message || `API Error: ${errmsg} (errcode: ${errcode})`);
    this.name = 'ApiError';
  }
}

/**
 * 缓存配置接口
 */
interface CacheConfig {
  /** 缓存过期时间（毫秒），默认 5 分钟 */
  ttl?: number;
  /** 最大缓存条目数量，默认 100 */
  maxSize?: number;
  /** 是否启用缓存，默认 true */
  enabled?: boolean;
}

/**
 * 缓存条目
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expireAt: number;
}

/**
 * API 结果缓存器
 */
class ApiCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private config: Required<CacheConfig>;

  constructor(config: CacheConfig = {}) {
    this.config = {
      ttl: config.ttl || 5 * 60 * 1000, // 默认 5 分钟
      maxSize: config.maxSize || 100,
      enabled: config.enabled !== false
    };
  }

  /**
   * 生成缓存键
   */
  private generateKey(method: string, ...args: any[]): string {
    return `${method}:${JSON.stringify(args)}`;
  }

  /**
   * 清理过期缓存
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now >= entry.expireAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 检查缓存大小并清理最旧的条目
   */
  private evictIfNeeded(): void {
    if (this.cache.size >= this.config.maxSize) {
      // 找到最旧的条目并删除
      let oldestKey = '';
      let oldestTime = Infinity;

      for (const [key, entry] of this.cache.entries()) {
        if (entry.timestamp < oldestTime) {
          oldestTime = entry.timestamp;
          oldestKey = key;
        }
      }

      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
  }

  /**
   * 获取缓存数据
   */
  get<T>(key: string): T | null {
    if (!this.config.enabled) {
      return null;
    }

    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // 检查是否过期
    if (Date.now() >= entry.expireAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * 设置缓存数据
   */
  set<T>(key: string, data: T): void {
    if (!this.config.enabled) {
      return;
    }

    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expireAt: now + this.config.ttl
    };

    this.evictIfNeeded();
    this.cache.set(key, entry);
  }

  /**
   * 删除特定缓存
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): {
    size: number;
    maxSize: number;
    ttl: number;
    enabled: boolean;
    keys: string[];
  } {
    this.cleanup(); // 清理过期缓存后再统计

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      ttl: this.config.ttl,
      enabled: this.config.enabled,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * 缓存装饰器函数
   */
  withCache<T extends any[], R>(
    method: string,
    fn: (...args: T) => Promise<R>
  ): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
      const key = this.generateKey(method, ...args);

      // 尝试从缓存获取
      const cached = this.get<R>(key);
      if (cached !== null) {
        console.log(`缓存命中: ${key}`);
        return cached;
      }

      // 缓存未命中，执行原函数
      console.log(`缓存未命中: ${key}`);
      const result = await fn(...args);

      // 缓存结果
      this.set(key, result);

      return result;
    };
  }
}

/**
 * 检查 API 响应并处理错误
 * @param response API 响应数据
 * @returns 成功时返回 data，失败时抛出错误
 */
function checkApiResponse<T>(response: { errcode: number; errmsg: string; data: T }): T {
  if (response.errcode === 0) {
    return response.data;
  } else {
    throw new ApiError(response.errcode, response.errmsg);
  }
}

/**
 * 创建 API 客户端
 * @param {string} baseURL - API 基础 URL
 * @param {string} cookie - 认证 Cookie 字符串
 * @returns {AxiosInstance} axios 实例
 */
function createApiClient(baseURL: string, cookie: string): AxiosInstance {
  const client = axios.create({
    baseURL,
    headers: {
      'Accept': 'application/json, text/plain, */*',
      'Cookie': cookie
    }
  });

  // 添加响应拦截器处理通用错误
  client.interceptors.response.use(
    response => response,
    error => {
      if (error.response) {
        // 服务器返回错误状态码
        console.error('HTTP Error:', error.response.status, error.response.statusText);
        console.error('Response data:', error.response.data);
      } else if (error.request) {
        // 网络错误
        console.error('Network Error:', error.message);
      } else {
        // 其他错误
        console.error('Request Error:', error.message);
      }
      return Promise.reject(error);
    }
  );

  return client;
}

/**
 * 从命令行参数获取配置
 * @returns {Config} 包含 baseURL、cookie、缓存配置和其他参数的对象
 */
function getConfigFromArgs(): Config {
  const args = process.argv.slice(2);
  let baseURL = '';
  let cookie = '';
  const requestParams: Record<string, any> = {};

  // 缓存配置默认值
  const cacheConfig: CacheConfig = {
    ttl: 5 * 60 * 1000, // 5分钟
    maxSize: 100,       // 100个条目
    enabled: true       // 启用缓存
  };

  // 解析命令行参数
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    if ((arg === '--baseURL' || arg === '-u') && nextArg) {
      baseURL = nextArg;
      i++; // 跳过下一个参数
    } else if ((arg === '--cookie' || arg === '-c') && nextArg) {
      cookie = nextArg;
      i++; // 跳过下一个参数
    } else if ((arg === '--cache-ttl' || arg === '-t') && nextArg) {
      const ttlMinutes = parseInt(nextArg, 10);
      if (!isNaN(ttlMinutes) && ttlMinutes > 0) {
        cacheConfig.ttl = ttlMinutes * 60 * 1000; // 转换为毫秒
      }
      i++; // 跳过下一个参数
    } else if ((arg === '--cache-size' || arg === '-s') && nextArg) {
      const size = parseInt(nextArg, 10);
      if (!isNaN(size) && size > 0) {
        cacheConfig.maxSize = size;
      }
      i++; // 跳过下一个参数
    } else if (arg === '--no-cache') {
      cacheConfig.enabled = false;
    } else if (arg === '--enable-cache') {
      cacheConfig.enabled = true;
    } else if (arg.startsWith('--') && nextArg && !nextArg.startsWith('--')) {
      // 其他自定义参数
      const key = arg.substring(2);
      requestParams[key] = nextArg;
      i++; // 跳过下一个参数
    }
  }

  // 验证必需参数
  if (!baseURL) {
    console.error('错误: 缺少 baseURL 参数');
    printUsage();
    process.exit(1);
  }

  if (!cookie) {
    console.error('错误: 缺少 cookie 参数');
    printUsage();
    process.exit(1);
  }

  return { baseURL, cookie, requestParams, cacheConfig };
}

/**
 * 打印使用说明
 */
function printUsage(): void {
  console.log('使用方法: node script.js [选项]');
  console.log('');
  console.log('必需参数:');
  console.log('  --baseURL, -u <url>        API 基础URL');
  console.log('  --cookie, -c <cookie>      认证Cookie');
  console.log('');
  console.log('缓存配置:');
  console.log('  --cache-ttl, -t <minutes>  缓存过期时间（分钟，默认5分钟）');
  console.log('  --cache-size, -s <size>    最大缓存条目数（默认100）');
  console.log('  --no-cache                 禁用缓存');
  console.log('  --enable-cache             启用缓存（默认启用）');
  console.log('');
  console.log('其他参数:');
  console.log('  --<key> <value>           任意其他参数');
  console.log('');
  console.log('示例:');
  console.log('  node script.js --baseURL https://api.example.com --cookie "session=abc123"');
  console.log('  node script.js -u https://api.example.com -c "session=abc123" --cache-ttl 10 --cache-size 200');
  console.log('  node script.js -u https://api.example.com -c "session=abc123" --no-cache');
}

// 全局变量，延迟初始化
let apiClient: AxiosInstance | null = null;
let apiCache: ApiCache | null = null;
let config: Config | null = null;

/**
 * 初始化函数，用于显式设置配置
 * @param {Config} newConfig - 配置对象
 */
function initialize(newConfig: Config): void {
  if (config) {
    return;
  }

  config = newConfig;
  apiClient = createApiClient(config.baseURL, config.cookie);
  apiCache = new ApiCache(config.cacheConfig);

  console.log('使用配置:');
  console.log('Base URL:', config.baseURL);
  console.log('Cookie:', config.cookie.substring(0, 50) + '...');
  console.log('缓存配置:', {
    enabled: config.cacheConfig.enabled,
    ttl: `${(config.cacheConfig.ttl || 0) / 1000 / 60}分钟`,
    maxSize: config.cacheConfig.maxSize,
  });
  console.log('请求参数:', config.requestParams);
}

/**
 * 初始化配置和客户端（仅在需要时调用）
 */
function initializeConfig(): void {
  if (!config) {
    const cliConfig = getConfigFromArgs();
    initialize(cliConfig);
  }
}

/**
 * 获取API客户端实例
 */
function getApiClient(): AxiosInstance {
  if (!apiClient) {
    initializeConfig();
  }
  return apiClient!;
}

/**
 * 获取缓存实例
 */
function getApiCache(): ApiCache {
  if (!apiCache) {
    initializeConfig();
  }
  return apiCache!;
}

/**
 * 获取接口列表（带缓存）
 * @param {number} projectId - 项目ID
 * @returns {Promise<ApiCategoryItem[]>} 接口列表数据
 */
async function getInterfaceList(projectId: number): Promise<ApiCategoryItem[]> {
  const cache = getApiCache();
  const client = getApiClient();
  const cacheKey = cache['generateKey']('getInterfaceList', projectId);
  const cached = cache.get<ApiCategoryItem[]>(cacheKey);

  if (cached !== null) {
    console.log(`接口列表缓存命中: project_id=${projectId}`);
    return cached;
  }

  try {
    console.log(`获取接口列表: project_id=${projectId}`);
    const response = await client.get<CategoryResult>('/api/interface/list_menu', {
      params: {
        project_id: projectId
      }
    });

    // 检查 API 响应状态
    const result = checkApiResponse(response.data);

    // 缓存结果
    cache.set(cacheKey, result);
    console.log(`接口列表已缓存: project_id=${projectId}`);

    return result;
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`获取接口列表失败 - API错误: ${error.errmsg} (errcode: ${error.errcode})`);
      throw error;
    } else {
      console.error('获取接口列表失败:', error instanceof Error ? error.message : error);
      throw new Error('获取接口列表时发生未知错误');
    }
  }
}

/**
 * 获取接口详情（带缓存）
 * @param {number} id - 接口ID
 * @returns {Promise<ApiData>} 接口数据
 */
async function getGroupInfo(id: number): Promise<ApiData> {
  const cache = getApiCache();
  const client = getApiClient();
  const cacheKey = cache['generateKey']('getGroupInfo', id);
  const cached = cache.get<ApiData>(cacheKey);

  if (cached !== null) {
    console.log(`接口详情缓存命中: id=${id}`);
    return cached;
  }

  try {
    console.log(`获取接口详情: id=${id}`);
    const response = await client.get<ApiDetailResult>('/api/interface/get', {
      params: {
        id
      }
    });

    // 检查 API 响应状态
    const result = checkApiResponse(response.data);

    // 缓存结果
    cache.set(cacheKey, result);
    console.log(`接口详情已缓存: id=${id}`);

    return result;
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`获取接口详情失败 - API错误: ${error.errmsg} (errcode: ${error.errcode})`);
      throw error;
    } else {
      console.error('获取接口详情信息失败:', error instanceof Error ? error.message : error);
      throw new Error('获取接口详情时发生未知错误');
    }
  }
}

/**
 * 批量获取接口详情
 * @param {number[]} ids - 接口ID数组
 * @returns {Promise<ApiData[]>} 接口数据数组
 */
async function batchGetGroupInfo(ids: number[]): Promise<ApiData[]> {
  const results: ApiData[] = [];
  const errors: { id: number; error: string }[] = [];

  for (const id of ids) {
    try {
      const apiData = await getGroupInfo(id);
      results.push(apiData);
      console.log(`成功获取接口 ${id} 的详情`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push({ id, error: errorMsg });
      console.error(`获取接口 ${id} 详情失败: ${errorMsg}`);
    }
  }

  if (errors.length > 0) {
    console.warn(`批量获取完成，但有 ${errors.length} 个接口获取失败:`);
    errors.forEach(({ id, error }) => {
      console.warn(`  - 接口 ${id}: ${error}`);
    });
  }

  return results;
}

/**
 * 清除特定项目的缓存
 * @param {number} projectId - 项目ID
 */
function clearProjectCache(projectId: number): void {
  const cache = getApiCache();
  const listKey = cache['generateKey']('getInterfaceList', projectId);
  cache.delete(listKey);
  console.log(`已清除项目 ${projectId} 的接口列表缓存`);
}

/**
 * 清除特定接口的缓存
 * @param {number} id - 接口ID
 */
function clearInterfaceCache(id: number): void {
  const cache = getApiCache();
  const detailKey = cache['generateKey']('getGroupInfo', id);
  cache.delete(detailKey);
  console.log(`已清除接口 ${id} 的详情缓存`);
}

/**
 * 获取缓存统计信息
 */
function getCacheStats(): void {
  const cache = getApiCache();
  const stats = cache.getStats();
  console.log('缓存统计信息:');
  console.log(`  当前缓存条目数: ${stats.size}/${stats.maxSize}`);
  console.log(`  缓存过期时间: ${stats.ttl / 1000}秒`);
  console.log(`  缓存状态: ${stats.enabled ? '启用' : '禁用'}`);
  console.log(`  缓存键列表: ${stats.keys.join(', ')}`);
}

/**
 * 预加载接口数据
 * @param {number} projectId - 项目ID
 */
async function preloadInterfaceData(projectId: number): Promise<void> {
  try {
    console.log(`开始预加载项目 ${projectId} 的接口数据...`);

    // 获取接口列表
    const interfaces = await getInterfaceList(projectId);

    // 收集所有接口ID
    const interfaceIds: number[] = [];
    interfaces.forEach(category => {
      category.list.forEach(item => {
        interfaceIds.push(item._id);
      });
    });

    console.log(`找到 ${interfaceIds.length} 个接口，开始预加载详情...`);

    // 批量预加载接口详情（分批处理，避免过多并发请求）
    const batchSize = 5;
    for (let i = 0; i < interfaceIds.length; i += batchSize) {
      const batch = interfaceIds.slice(i, i + batchSize);
      const promises = batch.map(id => getGroupInfo(id).catch(err => {
        console.warn(`预加载接口 ${id} 失败: ${err.message}`);
        return null;
      }));

      await Promise.all(promises);
      console.log(`预加载进度: ${Math.min(i + batchSize, interfaceIds.length)}/${interfaceIds.length}`);
    }

    console.log(`项目 ${projectId} 的接口数据预加载完成`);
  } catch (error) {
    console.error('预加载失败:', error instanceof Error ? error.message : error);
  }
}

/**
 * 根据目录名称获取该目录下的所有接口
 * @param {number} projectId - 项目ID
 * @param {string} categoryName - 目录名称
 * @returns {Promise<ApiCategoryChild[]>} 该目录下的接口列表
 */
async function getInterfacesByCategory(projectId: number, categoryName: string): Promise<ApiCategoryChild[]> {
  try {
    console.log(`根据目录名称获取接口: project_id=${projectId}, category_name=${categoryName}`);
    
    // 获取项目的所有接口列表
    const interfaces = await getInterfaceList(projectId);
    
    // 查找匹配的目录
    const matchedCategory = interfaces.find(category => 
      category.name.toLowerCase().includes(categoryName.toLowerCase()) ||
      categoryName.toLowerCase().includes(category.name.toLowerCase())
    );
    
    if (!matchedCategory) {
      throw new Error(`未找到名称包含 "${categoryName}" 的目录`);
    }
    
    console.log(`找到匹配的目录: ${matchedCategory.name}, 包含 ${matchedCategory.list.length} 个接口`);
    
    return matchedCategory.list;
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`根据目录名称获取接口失败 - API错误: ${error.errmsg} (errcode: ${error.errcode})`);
      throw error;
    } else {
      console.error('根据目录名称获取接口失败:', error instanceof Error ? error.message : error);
      throw new Error(error instanceof Error ? error.message : '根据目录名称获取接口时发生未知错误');
    }
  }
}

// 导出主要函数和类
export {
  ApiError,
  ApiCache,
  createApiClient,
  getInterfaceList,
  getGroupInfo,
  batchGetGroupInfo,
  checkApiResponse,
  clearProjectCache,
  clearInterfaceCache,
  getCacheStats,
  preloadInterfaceData,
  getConfigFromArgs,
  printUsage,
  initialize, // 新增导出
  getApiCache, // 确保导出
  getInterfacesByCategory // 新增导出
};