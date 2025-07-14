import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  getInterfaceList,
  getGroupInfo,
  batchGetGroupInfo,
  clearProjectCache,
  clearInterfaceCache,
  getCacheStats,
  preloadInterfaceData,
  getConfigFromArgs,
  initialize, // 导入 initialize
  getApiCache, // 导入 getApiCache
  ApiCache
} from "./request.js";

// 全局变量存储配置和缓存实例
let apiCache: ApiCache;
let isInitialized = false;

/**
 * 初始化配置和缓存
 */
function initializeIfNeeded() {
  if (!isInitialized) {
    const config = getConfigFromArgs();
    initialize(config); // 使用导入的 initialize 函数
    apiCache = getApiCache(); // 获取缓存实例
    isInitialized = true;
  }
}

export function createServer(): McpServer {
  const server = new McpServer({
    name: "YApi-MCP-Server",
    version: "0.1.0",
  });

  // 获取接口列表
  server.tool(
    "get_interface_list",
    "Get interface list for a given project ID from YApi.",
    {
      project_id: z.number().describe("YApi project ID"),
    },
    async ({ project_id }) => {
      try {
        initializeIfNeeded();

        if (!project_id) {
          throw new Error("project_id is required.");
        }

        const interfaces = await getInterfaceList(project_id);

        // 格式化输出
        const formattedData = interfaces.map(category => ({
          category_id: category._id,
          category_name: category.name,
          description: category.desc,
          interfaces: category.list.map(item => ({
            id: item._id,
            title: item.title,
            method: item.method,
            path: item.path,
            status: item.status,
            tags: item.tag
          }))
        }));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(formattedData, null, 2),
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text",
              text: `Error: ${errorMessage}`,
            },
          ],
        };
      }
    },
  );

  // 获取接口详情
  server.tool(
    "get_interface_detail",
    "Get detailed information for a specific interface by ID from YApi.",
    {
      interface_id: z.number().describe("YApi interface ID"),
    },
    async ({ interface_id }) => {
      try {
        initializeIfNeeded();

        if (!interface_id) {
          throw new Error("interface_id is required.");
        }

        const interfaceData = await getGroupInfo(interface_id);

        // 安全地解析JSON字符串
        const tryParseJson = (jsonString: string): any => {
          if (!jsonString || typeof jsonString !== 'string') {
            return jsonString;
          }
          try {
            return JSON.parse(jsonString);
          } catch (e) {
            return jsonString;
          }
        };

        // 格式化输出，包含关键信息
        const formattedData = {
          id: interfaceData._id,
          title: interfaceData.title,
          method: interfaceData.method,
          path: interfaceData.path,
          status: interfaceData.status,
          description: interfaceData.desc,
          markdown: interfaceData.markdown,
          request: {
            headers: interfaceData.req_headers,
            query: interfaceData.req_query,
            params: interfaceData.req_params,
            body_type: interfaceData.req_body_type,
            body_form: interfaceData.req_body_form,
            body_other: tryParseJson(interfaceData.req_body_other)
          },
          response: {
            body_type: interfaceData.res_body_type,
            body: tryParseJson(interfaceData.res_body)
          },
          project_id: interfaceData.project_id,
          category_id: interfaceData.catid,
          tags: interfaceData.tag,
          username: interfaceData.username,
          add_time: new Date(interfaceData.add_time * 1000).toISOString(),
          update_time: new Date(interfaceData.up_time * 1000).toISOString()
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(formattedData, null, 2),
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text",
              text: `Error: ${errorMessage}`,
            },
          ],
        };
      }
    },
  );

  // 批量获取接口详情
  server.tool(
    "batch_get_interface_details",
    "Batch get detailed information for multiple interfaces by IDs from YApi.",
    {
      interface_ids: z.array(z.number()).describe("Array of YApi interface IDs"),
    },
    async ({ interface_ids }) => {
      try {
        initializeIfNeeded();

        if (!interface_ids || interface_ids.length === 0) {
          throw new Error("interface_ids array is required and cannot be empty.");
        }

        const interfaceDataList = await batchGetGroupInfo(interface_ids);

        // 格式化输出
        const formattedData = interfaceDataList.map(interfaceData => ({
          id: interfaceData._id,
          title: interfaceData.title,
          method: interfaceData.method,
          path: interfaceData.path,
          status: interfaceData.status,
          description: interfaceData.desc,
          project_id: interfaceData.project_id,
          category_id: interfaceData.catid,
          tags: interfaceData.tag,
          username: interfaceData.username,
          add_time: new Date(interfaceData.add_time * 1000).toISOString(),
          update_time: new Date(interfaceData.up_time * 1000).toISOString()
        }));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(formattedData, null, 2),
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text",
              text: `Error: ${errorMessage}`,
            },
          ],
        };
      }
    },
  );

  // 预加载接口数据
  server.tool(
    "preload_interface_data",
    "Preload all interface data for a given project ID to cache.",
    {
      project_id: z.number().describe("YApi project ID"),
    },
    async ({ project_id }) => {
      try {
        initializeIfNeeded();

        if (!project_id) {
          throw new Error("project_id is required.");
        }

        await preloadInterfaceData(project_id);

        return {
          content: [
            {
              type: "text",
              text: `Successfully preloaded interface data for project ${project_id}`,
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text",
              text: `Error: ${errorMessage}`,
            },
          ],
        };
      }
    },
  );

  // 获取缓存统计信息
  server.tool(
    "get_cache_stats",
    "Get cache statistics including size, hit rate, and configuration.",
    {},
    async () => {
      try {
        initializeIfNeeded();

        // 由于 getCacheStats 是 void 函数，我们需要从 apiCache 直接获取统计信息
        const stats = apiCache.getStats();

        const formattedStats = {
          cache_enabled: stats.enabled,
          current_size: stats.size,
          max_size: stats.maxSize,
          ttl_minutes: stats.ttl / 1000 / 60,
          cached_keys: stats.keys,
          usage_percentage: ((stats.size / stats.maxSize) * 100).toFixed(2) + '%'
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(formattedStats, null, 2),
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text",
              text: `Error: ${errorMessage}`,
            },
          ],
        };
      }
    },
  );

  // 清除项目缓存
  server.tool(
    "clear_project_cache",
    "Clear cache for a specific project.",
    {
      project_id: z.number().describe("YApi project ID"),
    },
    async ({ project_id }) => {
      try {
        initializeIfNeeded();

        if (!project_id) {
          throw new Error("project_id is required.");
        }

        clearProjectCache(project_id);

        return {
          content: [
            {
              type: "text",
              text: `Successfully cleared cache for project ${project_id}`,
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text",
              text: `Error: ${errorMessage}`,
            },
          ],
        };
      }
    },
  );

  // 清除接口缓存
  server.tool(
    "clear_interface_cache",
    "Clear cache for a specific interface.",
    {
      interface_id: z.number().describe("YApi interface ID"),
    },
    async ({ interface_id }) => {
      try {
        initializeIfNeeded();

        if (!interface_id) {
          throw new Error("interface_id is required.");
        }

        clearInterfaceCache(interface_id);

        return {
          content: [
            {
              type: "text",
              text: `Successfully cleared cache for interface ${interface_id}`,
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text",
              text: `Error: ${errorMessage}`,
            },
          ],
        };
      }
    },
  );

  // 清除所有缓存
  server.tool(
    "clear_all_cache",
    "Clear all cached data.",
    {},
    async () => {
      try {
        initializeIfNeeded();

        apiCache.clear();

        return {
          content: [
            {
              type: "text",
              text: "Successfully cleared all cache data",
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text",
              text: `Error: ${errorMessage}`,
            },
          ],
        };
      }
    },
  );

  // 搜索接口
  server.tool(
    "search_interfaces",
    "Search interfaces by title, path, or method within a project.",
    {
      project_id: z.number().describe("YApi project ID"),
      query: z.string().describe("Search query (title, path, or method)"),
      method: z.string().optional().describe("Filter by HTTP method (GET, POST, etc.)"),
    },
    async ({ project_id, query, method }) => {
      try {
        initializeIfNeeded();

        if (!project_id) {
          throw new Error("project_id is required.");
        }

        if (!query) {
          throw new Error("query is required.");
        }

        const interfaces = await getInterfaceList(project_id);
        const searchResults: any[] = [];

        interfaces.forEach(category => {
          category.list.forEach(item => {
            const matchesQuery =
              item.title.toLowerCase().includes(query.toLowerCase()) ||
              item.path.toLowerCase().includes(query.toLowerCase()) ||
              item.method.toLowerCase().includes(query.toLowerCase());

            const matchesMethod = !method || item.method.toLowerCase() === method.toLowerCase();

            if (matchesQuery && matchesMethod) {
              searchResults.push({
                id: item._id,
                title: item.title,
                method: item.method,
                path: item.path,
                status: item.status,
                category_name: category.name,
                category_id: category._id,
                tags: item.tag
              });
            }
          });
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                total: searchResults.length,
                results: searchResults
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text",
              text: `Error: ${errorMessage}`,
            },
          ],
        };
      }
    },
  );

  return server;
}