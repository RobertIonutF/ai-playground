import { ParsedDocumentation, ApiEndpoint, Parameter, DocType, HttpMethod, ParserOptions } from '@/types/api';

/**
 * API Documentation Parser
 * Parses OpenAPI/Swagger/Postman/HTML documentation into standardized format
 */

const DEFAULT_PARSER_OPTIONS: ParserOptions = {
  maxEndpoints: 200,
  includeDeprecated: false,
  includeTags: [],
  excludeTags: [],
};

/**
 * Detect document type from content
 */
export function detectDocType(content: any): DocType {
  if (typeof content === 'string') {
    try {
      content = JSON.parse(content);
    } catch {
      return 'html';
    }
  }

  // OpenAPI 3.x
  if (content.openapi && content.openapi.startsWith('3')) {
    return 'openapi';
  }

  // Swagger 2.0
  if (content.swagger && content.swagger === '2.0') {
    return 'swagger';
  }

  // Postman Collection
  if (content.info && content.item && content.info._postman_id) {
    return 'postman';
  }

  return 'unknown';
}

/**
 * Parse OpenAPI 3.x documentation
 */
export function parseOpenAPI(doc: any, options: ParserOptions = DEFAULT_PARSER_OPTIONS): ParsedDocumentation {
  const endpoints: ApiEndpoint[] = [];

  // Extract base URL from servers
  const baseUrl = doc.servers?.[0]?.url || 'https://api.example.com';

  // Parse paths
  if (doc.paths) {
    for (const [path, pathItem] of Object.entries(doc.paths as Record<string, any>)) {
      // Iterate through HTTP methods
      const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

      for (const method of methods) {
        const operation = pathItem[method];
        if (!operation) continue;

        // Skip deprecated if option is set
        if (operation.deprecated && !options.includeDeprecated) {
          continue;
        }

        // Filter by tags if specified
        if (options.includeTags && options.includeTags.length > 0) {
          const hasTags = operation.tags?.some((tag: string) => options.includeTags?.includes(tag));
          if (!hasTags) continue;
        }

        if (options.excludeTags && options.excludeTags.length > 0) {
          const hasExcludedTag = operation.tags?.some((tag: string) => options.excludeTags?.includes(tag));
          if (hasExcludedTag) continue;
        }

        // Parse parameters
        const parameters: Parameter[] = [];

        if (operation.parameters) {
          operation.parameters.forEach((param: any) => {
            parameters.push({
              name: param.name,
              in: param.in,
              required: param.required || false,
              type: param.schema?.type,
              description: param.description,
              schema: param.schema,
            });
          });
        }

        // Check for auth requirement
        const requiresAuth = !!(operation.security && operation.security.length > 0) || !!(doc.security && doc.security.length > 0);

        const endpoint: ApiEndpoint = {
          method: method.toUpperCase() as HttpMethod,
          path,
          summary: operation.summary,
          description: operation.description,
          parameters,
          requestBody: operation.requestBody,
          responses: operation.responses,
          operationId: operation.operationId,
          tags: operation.tags,
          requiresAuth,
        };

        endpoints.push(endpoint);

        // Limit endpoints if specified
        if (options.maxEndpoints && endpoints.length >= options.maxEndpoints) {
          break;
        }
      }

      if (options.maxEndpoints && endpoints.length >= options.maxEndpoints) {
        break;
      }
    }
  }

  return {
    baseUrl,
    endpoints,
    metadata: {
      title: doc.info?.title,
      version: doc.info?.version,
      description: doc.info?.description,
      sourceType: 'openapi',
    },
  };
}

/**
 * Parse Swagger 2.0 documentation
 */
export function parseSwagger(doc: any, options: ParserOptions = DEFAULT_PARSER_OPTIONS): ParsedDocumentation {
  const endpoints: ApiEndpoint[] = [];

  // Extract base URL
  const scheme = doc.schemes?.[0] || 'https';
  const host = doc.host || 'api.example.com';
  const basePath = doc.basePath || '';
  const baseUrl = `${scheme}://${host}${basePath}`;

  // Parse paths
  if (doc.paths) {
    for (const [path, pathItem] of Object.entries(doc.paths as Record<string, any>)) {
      const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

      for (const method of methods) {
        const operation = pathItem[method];
        if (!operation) continue;

        // Skip deprecated if option is set
        if (operation.deprecated && !options.includeDeprecated) {
          continue;
        }

        // Filter by tags
        if (options.includeTags && options.includeTags.length > 0) {
          const hasTags = operation.tags?.some((tag: string) => options.includeTags?.includes(tag));
          if (!hasTags) continue;
        }

        if (options.excludeTags && options.excludeTags.length > 0) {
          const hasExcludedTag = operation.tags?.some((tag: string) => options.excludeTags?.includes(tag));
          if (hasExcludedTag) continue;
        }

        // Parse parameters
        const parameters: Parameter[] = [];

        if (operation.parameters) {
          operation.parameters.forEach((param: any) => {
            parameters.push({
              name: param.name,
              in: param.in,
              required: param.required || false,
              type: param.type || param.schema?.type,
              description: param.description,
              schema: param.schema,
            });
          });
        }

        // Check for auth requirement
        const requiresAuth = !!(operation.security && operation.security.length > 0) || !!(doc.security && doc.security.length > 0);

        const endpoint: ApiEndpoint = {
          method: method.toUpperCase() as HttpMethod,
          path,
          summary: operation.summary,
          description: operation.description,
          parameters,
          operationId: operation.operationId,
          tags: operation.tags,
          requiresAuth,
          responses: operation.responses,
        };

        endpoints.push(endpoint);

        if (options.maxEndpoints && endpoints.length >= options.maxEndpoints) {
          break;
        }
      }

      if (options.maxEndpoints && endpoints.length >= options.maxEndpoints) {
        break;
      }
    }
  }

  return {
    baseUrl,
    endpoints,
    metadata: {
      title: doc.info?.title,
      version: doc.info?.version,
      description: doc.info?.description,
      sourceType: 'swagger',
    },
  };
}

/**
 * Parse Postman collection
 */
export function parsePostman(collection: any, options: ParserOptions = DEFAULT_PARSER_OPTIONS): ParsedDocumentation {
  const endpoints: ApiEndpoint[] = [];

  // Try to extract base URL from variables or first request
  let baseUrl = 'https://api.example.com';

  if (collection.variable) {
    const baseUrlVar = collection.variable.find((v: any) => v.key === 'baseUrl' || v.key === 'base_url' || v.key === 'url');
    if (baseUrlVar) {
      baseUrl = baseUrlVar.value;
    }
  }

  // Recursive function to parse items
  function parseItems(items: any[], parentPath: string = '') {
    items.forEach((item: any) => {
      // If item has request, it's an endpoint
      if (item.request) {
        const request = item.request;

        // Extract method
        const method = (typeof request === 'string' ? 'GET' : request.method || 'GET').toUpperCase() as HttpMethod;

        // Extract URL
        let url = '';
        if (typeof request.url === 'string') {
          url = request.url;
        } else if (request.url && request.url.raw) {
          url = request.url.raw;
        }

        // Parse URL to get path
        let path = url;
        try {
          const urlObj = new URL(url);
          path = urlObj.pathname;

          // Update base URL if not set yet
          if (baseUrl === 'https://api.example.com' && urlObj.origin) {
            baseUrl = urlObj.origin;
          }
        } catch {
          // If URL parsing fails, use as-is
        }

        // Parse headers as parameters
        const parameters: Parameter[] = [];

        if (request.header) {
          request.header.forEach((header: any) => {
            if (!header.disabled) {
              parameters.push({
                name: header.key,
                in: 'header',
                required: false,
                type: 'string',
                description: header.description,
              });
            }
          });
        }

        // Parse query parameters
        if (request.url && request.url.query) {
          request.url.query.forEach((query: any) => {
            if (!query.disabled) {
              parameters.push({
                name: query.key,
                in: 'query',
                required: false,
                type: 'string',
                description: query.description,
              });
            }
          });
        }

        const endpoint: ApiEndpoint = {
          method,
          path,
          summary: item.name,
          description: request.description || item.description,
          parameters,
          tags: parentPath ? [parentPath] : undefined,
        };

        endpoints.push(endpoint);

        if (options.maxEndpoints && endpoints.length >= options.maxEndpoints) {
          return;
        }
      }

      // If item has children, recursively parse them
      if (item.item && Array.isArray(item.item)) {
        const folderName = item.name || parentPath;
        parseItems(item.item, folderName);
      }
    });
  }

  if (collection.item) {
    parseItems(collection.item);
  }

  return {
    baseUrl,
    endpoints,
    metadata: {
      title: collection.info?.name,
      version: collection.info?.version,
      description: collection.info?.description,
      sourceType: 'postman',
    },
  };
}

/**
 * Simple HTML parser - extracts endpoints using heuristics
 */
export function parseHTML(html: string): ParsedDocumentation {
  const endpoints: ApiEndpoint[] = [];
  let baseUrl = 'https://api.example.com';

  // Try to find base URL
  const baseUrlMatch = html.match(/https?:\/\/[\w\-.]+(:\d+)?(\/[^\s"'<>]*)?/);
  if (baseUrlMatch) {
    try {
      const url = new URL(baseUrlMatch[0]);
      baseUrl = url.origin;
    } catch {
      // Use matched URL as-is
      baseUrl = baseUrlMatch[0];
    }
  }

  // Try to find endpoints using common patterns
  // Pattern 1: /api/v1/users, /users/{id}, etc.
  const endpointPattern = /\/(?:api\/)?(?:v\d+\/)?[\w\-]+(?:\/\{[\w\-]+\})?/g;
  const matches = html.match(endpointPattern) || [];

  const uniquePaths = new Set<string>();
  matches.forEach(match => {
    if (match.length > 2 && match.length < 100) {
      uniquePaths.add(match);
    }
  });

  // Try to detect HTTP methods near paths
  const methodPattern = /(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+([\/\w\-{}]+)/gi;
  let methodMatch;

  while ((methodMatch = methodPattern.exec(html)) !== null) {
    const [, method, path] = methodMatch;

    endpoints.push({
      method: method.toUpperCase() as HttpMethod,
      path: path.trim(),
      summary: `${method} ${path}`,
    });

    uniquePaths.delete(path.trim());
  }

  // Add remaining paths as GET endpoints
  uniquePaths.forEach(path => {
    if (endpoints.length < 50) { // Limit HTML parsing results
      endpoints.push({
        method: 'GET',
        path,
        summary: `GET ${path}`,
      });
    }
  });

  return {
    baseUrl,
    endpoints: endpoints.slice(0, 50), // Limit to 50 endpoints from HTML
    metadata: {
      title: 'Parsed from HTML',
      sourceType: 'html',
    },
  };
}

/**
 * Main parsing function - detects type and parses accordingly
 */
export function parseApiDocumentation(
  content: string | any,
  options: ParserOptions = DEFAULT_PARSER_OPTIONS
): ParsedDocumentation {
  // Parse string content to object if needed
  let doc = content;
  if (typeof content === 'string') {
    try {
      doc = JSON.parse(content);
    } catch {
      // Assume HTML if JSON parsing fails
      return parseHTML(content);
    }
  }

  // Detect document type
  const docType = detectDocType(doc);

  // Parse based on type
  switch (docType) {
    case 'openapi':
      return parseOpenAPI(doc, options);

    case 'swagger':
      return parseSwagger(doc, options);

    case 'postman':
      return parsePostman(doc, options);

    case 'html':
      return parseHTML(typeof content === 'string' ? content : JSON.stringify(content));

    default:
      throw new Error(`Unsupported document type: ${docType}`);
  }
}

/**
 * Validate parsed documentation
 */
export function validateParsedDoc(parsed: ParsedDocumentation): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!parsed.baseUrl) {
    errors.push('Missing base URL');
  }

  if (!parsed.endpoints || parsed.endpoints.length === 0) {
    errors.push('No endpoints found');
  }

  try {
    new URL(parsed.baseUrl);
  } catch {
    errors.push('Invalid base URL format');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

