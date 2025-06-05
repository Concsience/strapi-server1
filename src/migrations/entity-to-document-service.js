/**
 * Entity Service to Document Service Migration Helpers
 * 
 * This file contains helper functions to ease the migration from 
 * Strapi v4 Entity Service to Strapi v5 Document Service
 */

interface EntityServiceParams {
  filters?: any;
  populate?: any;
  sort?: any;
  limit?: number;
  offset?: number;
  publicationState?: 'live' | 'preview';
}

interface DocumentServiceParams {
  filters?: any;
  populate?: any;
  sort?: any;
  limit?: number;
  offset?: number;
  status?: 'published' | 'draft';
  locale?: string;
}

/**
 * Converts Entity Service parameters to Document Service parameters
 */
export function convertToDocumentParams(params: EntityServiceParams): DocumentServiceParams {
  const { publicationState, ...rest } = params;
  
  return {
    ...rest,
    status: publicationState === 'live' ? 'published' : 
            publicationState === 'preview' ? 'draft' : undefined
  };
}

/**
 * Converts ID-based filters to documentId-based filters
 */
export function convertFilters(filters: any): any {
  if (!filters) return filters;
  
  const converted = { ...filters };
  
  // Convert relation filters
  Object.keys(converted).forEach(key => {
    if (typeof converted[key] === 'number') {
      // Likely an ID reference
      converted[key] = { documentId: converted[key] };
    } else if (Array.isArray(converted[key])) {
      // Array of IDs
      converted[key] = { documentId: { $in: converted[key] } };
    } else if (converted[key] && typeof converted[key] === 'object') {
      // Nested filters
      converted[key] = convertFilters(converted[key]);
    }
  });
  
  return converted;
}

/**
 * Helper to migrate findOne calls
 */
export async function migratedFindOne(
  strapi: any,
  model: string,
  id: string | number,
  params?: EntityServiceParams
) {
  const documentService = strapi.documents(model);
  const convertedParams = params ? convertToDocumentParams(params) : {};
  
  return await documentService.findOne({
    documentId: String(id),
    ...convertedParams
  });
}

/**
 * Helper to migrate findMany calls
 */
export async function migratedFindMany(
  strapi: any,
  model: string,
  params?: EntityServiceParams
) {
  const documentService = strapi.documents(model);
  const convertedParams = params ? convertToDocumentParams(params) : {};
  
  if (convertedParams.filters) {
    convertedParams.filters = convertFilters(convertedParams.filters);
  }
  
  return await documentService.findMany(convertedParams);
}

/**
 * Helper to migrate create calls
 */
export async function migratedCreate(
  strapi: any,
  model: string,
  params: { data: any; populate?: any }
) {
  const documentService = strapi.documents(model);
  
  // Convert relation fields in data
  const convertedData = convertRelationFields(params.data);
  
  return await documentService.create({
    data: convertedData,
    populate: params.populate,
    status: 'draft' // Default to draft in v5
  });
}

/**
 * Helper to migrate update calls
 */
export async function migratedUpdate(
  strapi: any,
  model: string,
  id: string | number,
  params: { data: any; populate?: any }
) {
  const documentService = strapi.documents(model);
  
  // Convert relation fields in data
  const convertedData = convertRelationFields(params.data);
  
  return await documentService.update({
    documentId: String(id),
    data: convertedData,
    populate: params.populate
  });
}

/**
 * Helper to migrate delete calls
 */
export async function migratedDelete(
  strapi: any,
  model: string,
  id: string | number
) {
  const documentService = strapi.documents(model);
  
  return await documentService.delete({
    documentId: String(id)
  });
}

/**
 * Converts relation fields from v4 to v5 format
 */
function convertRelationFields(data: any): any {
  const converted = { ...data };
  
  Object.keys(converted).forEach(key => {
    const value = converted[key];
    
    // Single relation
    if (typeof value === 'number' || typeof value === 'string') {
      // Check if this looks like a relation field
      if (key.endsWith('_id') || key === 'user' || key === 'author') {
        converted[key] = { connect: [value] };
      }
    }
    // Multiple relations
    else if (Array.isArray(value) && value.length > 0 && 
             (typeof value[0] === 'number' || typeof value[0] === 'string')) {
      converted[key] = { connect: value };
    }
  });
  
  return converted;
}

/**
 * Response format converter - removes attributes wrapper
 */
export function flattenResponse(response: any): any {
  if (!response) return response;
  
  // Handle single entity
  if (response.data && response.data.attributes) {
    return {
      ...response,
      data: {
        documentId: response.data.id,
        ...response.data.attributes
      }
    };
  }
  
  // Handle collection
  if (response.data && Array.isArray(response.data)) {
    return {
      ...response,
      data: response.data.map((item: any) => ({
        documentId: item.id,
        ...item.attributes
      }))
    };
  }
  
  return response;
}

/**
 * Batch migration helper for common patterns
 */
export const migrationHelpers = {
  // Find user by ID
  async findUser(strapi: any, userId: string | number) {
    return await migratedFindOne(
      strapi,
      'plugin::users-permissions.user',
      userId,
      { populate: ['role'] }
    );
  },
  
  // Find cart for user
  async findUserCart(strapi: any, userId: string | number) {
    const carts = await migratedFindMany(strapi, 'api::cart.cart', {
      filters: { user: userId },
      populate: {
        cart_items: {
          populate: {
            art: { populate: ['images'] },
            paper_type: true,
          },
        },
      },
    });
    return carts[0]; // Return first cart
  },
  
  // Create new cart
  async createCart(strapi: any, userId: string | number) {
    return await migratedCreate(strapi, 'api::cart.cart', {
      data: {
        user: userId,
        total_price: 0,
      }
    });
  },
  
  // Find pending jobs
  async findPendingJobs(strapi: any, limit: number = 10) {
    return await migratedFindMany(strapi, 'api::image-job.image-job', {
      filters: { status: 'pending' },
      limit
    });
  }
};

export default {
  convertToDocumentParams,
  convertFilters,
  migratedFindOne,
  migratedFindMany,
  migratedCreate,
  migratedUpdate,
  migratedDelete,
  flattenResponse,
  helpers: migrationHelpers
};