/**
 * address controller - TypeScript implementation
 * User address management for shipping and billing
 * Follows official Strapi TypeScript documentation patterns
 */

import { factories } from '@strapi/strapi';
import { StrapiContext, ApiResponse, ApiError, hasUser } from '../../../types';

// Address interface based on schema
interface Address {
  id: number;
  owner?: any; // User reference
  nom?: string; // Last name
  prenom?: string; // First name
  region?: string;
  addresse?: string; // Address line
  codePostal?: string; // Postal code
  ville?: string; // City
  department?: string;
  telephone?: string;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface AddressSearchFilters {
  owner?: {
    id?: number;
  };
  ville?: {
    $containsi?: string;
  };
  region?: {
    $containsi?: string;
  };
  codePostal?: {
    $startsWith?: string;
  };
  publishedAt?: {
    $notNull?: boolean;
  };
}

interface AddressCreateData {
  nom: string;
  prenom: string;
  addresse: string;
  ville: string;
  codePostal: string;
  region?: string;
  department?: string;
  telephone?: string;
  owner?: number;
}

interface AddressValidationResult {
  isValid: boolean;
  errors: string[];
  normalizedData?: Partial<Address>;
}

export default factories.createCoreController('api::address.address', ({ strapi }) => ({
  /**
   * Find user addresses with filtering
   * GET /api/addresses
   */
  async find(ctx: StrapiContext): Promise<ApiResponse<Address[]> | ApiError> {
    try {
      const {
        page = 1,
        pageSize = 25,
        sort = 'createdAt:desc',
        populate = 'owner',
        filters = {},
        userOnly = 'false'
      } = ctx.query;

      // Build filters based on query parameters
      let queryFilters: AddressSearchFilters = {
        ...filters,
        publishedAt: { $notNull: true }
      };

      // If user is authenticated and userOnly is true, filter by user
      if (hasUser(ctx) && userOnly === 'true') {
        queryFilters.owner = { id: ctx.state.user.id };
      }

      // Non-authenticated users cannot see any addresses
      if (!hasUser(ctx)) {
        return ctx.unauthorized('Authentication required to view addresses');
      }

      // Users can only see their own addresses unless they're admin
      if (!ctx.state.user.role || ctx.state.user.role.type !== 'admin') {
        queryFilters.owner = { id: ctx.state.user.id };
      }

      const params = {
        filters: queryFilters,
        sort: sort as string,
        populate: populate as string,
        pagination: {
          page: parseInt(page as string, 10),
          pageSize: Math.min(parseInt(pageSize as string, 10), 50) // Max 50 addresses
        }
      };

      // Use Document Service as recommended by Strapi docs
      const { results, pagination } = await strapi.documents('api::address.address').findMany(params);

      // Enhance results with validation status
      const enhancedAddresses = results.map(address => ({
        ...address,
        isComplete: this.checkAddressCompleteness(address),
        isValidPostalCode: this.validatePostalCode(address.codePostal || ''),
        fullName: `${address.prenom || ''} ${address.nom || ''}`.trim(),
        formattedAddress: this.formatAddress(address)
      }));

      strapi.log.info(`Found ${results.length} addresses for user ${ctx.state.user.id}`);

      return ctx.send({
        data: enhancedAddresses,
        meta: {
          pagination
        }
      });

    } catch (error: unknown) {
      strapi.log.error('Error finding addresses:', error);
      
      return ctx.internalServerError('Failed to fetch addresses', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Find one address with validation
   * GET /api/addresses/:documentId
   */
  async findOne(ctx: StrapiContext): Promise<ApiResponse<Address> | ApiError> {
    try {
      const { documentId } = ctx.params;
      
      if (!documentId) {
        return ctx.badRequest('Document ID is required');
      }

      if (!hasUser(ctx)) {
        return ctx.unauthorized('Authentication required to view address');
      }

      const address = await strapi.documents('api::address.address').findOne({
        documentId,
        populate: ['owner']
      });

      if (!address) {
        return ctx.notFound('Address not found');
      }

      // Check ownership (users can only see their own addresses unless admin)
      if (address.owner?.id !== ctx.state.user.id && 
          (!ctx.state.user.role || ctx.state.user.role.type !== 'admin')) {
        return ctx.forbidden('You can only access your own addresses');
      }

      // Enhance address with validation and formatting
      const enhancedAddress = {
        ...address,
        isComplete: this.checkAddressCompleteness(address),
        isValidPostalCode: this.validatePostalCode(address.codePostal || ''),
        fullName: `${address.prenom || ''} ${address.nom || ''}`.trim(),
        formattedAddress: this.formatAddress(address),
        validationErrors: this.validateAddressData(address)
      };

      strapi.log.info(`Retrieved address ${documentId} for user ${ctx.state.user.id}`);

      return ctx.send({
        data: enhancedAddress
      });

    } catch (error: unknown) {
      strapi.log.error('Error finding address:', error);
      
      return ctx.internalServerError('Failed to fetch address', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Create new address with validation
   * POST /api/addresses
   */
  async create(ctx: StrapiContext): Promise<ApiResponse<Address> | ApiError> {
    try {
      if (!hasUser(ctx)) {
        return ctx.unauthorized('Authentication required to create address');
      }

      const addressData: AddressCreateData = ctx.request.body.data || ctx.request.body;

      // Validate address data
      const validation = await strapi.service('api::address.address').validateAndNormalizeAddress(addressData);
      
      if (!validation.isValid) {
        return ctx.badRequest('Address validation failed', {
          errors: validation.errors
        });
      }

      // Set owner to current user
      const dataToCreate = {
        ...validation.normalizedData,
        owner: ctx.state.user.id
      };

      // Create address
      const newAddress = await strapi.documents('api::address.address').create({
        data: dataToCreate,
        populate: ['owner']
      });

      // Enhance response
      const enhancedAddress = {
        ...newAddress,
        isComplete: this.checkAddressCompleteness(newAddress),
        isValidPostalCode: this.validatePostalCode(newAddress.codePostal || ''),
        fullName: `${newAddress.prenom || ''} ${newAddress.nom || ''}`.trim(),
        formattedAddress: this.formatAddress(newAddress)
      };

      strapi.log.info(`Created address ${newAddress.documentId} for user ${ctx.state.user.id}`);

      return ctx.send({
        data: enhancedAddress
      }, 201);

    } catch (error: unknown) {
      strapi.log.error('Error creating address:', error);
      
      return ctx.internalServerError('Failed to create address', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Update address with validation
   * PUT /api/addresses/:documentId
   */
  async update(ctx: StrapiContext): Promise<ApiResponse<Address> | ApiError> {
    try {
      const { documentId } = ctx.params;
      
      if (!documentId) {
        return ctx.badRequest('Document ID is required');
      }

      if (!hasUser(ctx)) {
        return ctx.unauthorized('Authentication required to update address');
      }

      // Check if address exists and user owns it
      const existingAddress = await strapi.documents('api::address.address').findOne({
        documentId,
        populate: ['owner']
      });

      if (!existingAddress) {
        return ctx.notFound('Address not found');
      }

      // Check ownership
      if (existingAddress.owner?.id !== ctx.state.user.id &&
          (!ctx.state.user.role || ctx.state.user.role.type !== 'admin')) {
        return ctx.forbidden('You can only update your own addresses');
      }

      const updateData = ctx.request.body.data || ctx.request.body;

      // Validate update data
      const validation = await strapi.service('api::address.address').validateAndNormalizeAddress(updateData, true);
      
      if (!validation.isValid) {
        return ctx.badRequest('Address validation failed', {
          errors: validation.errors
        });
      }

      // Update address
      const updatedAddress = await strapi.documents('api::address.address').update({
        documentId,
        data: validation.normalizedData,
        populate: ['owner']
      });

      // Enhance response
      const enhancedAddress = {
        ...updatedAddress,
        isComplete: this.checkAddressCompleteness(updatedAddress),
        isValidPostalCode: this.validatePostalCode(updatedAddress.codePostal || ''),
        fullName: `${updatedAddress.prenom || ''} ${updatedAddress.nom || ''}`.trim(),
        formattedAddress: this.formatAddress(updatedAddress)
      };

      strapi.log.info(`Updated address ${documentId} for user ${ctx.state.user.id}`);

      return ctx.send({
        data: enhancedAddress
      });

    } catch (error: unknown) {
      strapi.log.error('Error updating address:', error);
      
      return ctx.internalServerError('Failed to update address', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Delete address with ownership check
   * DELETE /api/addresses/:documentId
   */
  async delete(ctx: StrapiContext): Promise<ApiResponse<Address> | ApiError> {
    try {
      const { documentId } = ctx.params;
      
      if (!documentId) {
        return ctx.badRequest('Document ID is required');
      }

      if (!hasUser(ctx)) {
        return ctx.unauthorized('Authentication required to delete address');
      }

      // Check if address exists and user owns it
      const existingAddress = await strapi.documents('api::address.address').findOne({
        documentId,
        populate: ['owner']
      });

      if (!existingAddress) {
        return ctx.notFound('Address not found');
      }

      // Check ownership
      if (existingAddress.owner?.id !== ctx.state.user.id &&
          (!ctx.state.user.role || ctx.state.user.role.type !== 'admin')) {
        return ctx.forbidden('You can only delete your own addresses');
      }

      // Delete address
      const deletedAddress = await strapi.documents('api::address.address').delete({
        documentId
      });

      strapi.log.info(`Deleted address ${documentId} for user ${ctx.state.user.id}`);

      return ctx.send({
        data: deletedAddress
      });

    } catch (error: unknown) {
      strapi.log.error('Error deleting address:', error);
      
      return ctx.internalServerError('Failed to delete address', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Validate address format
   * POST /api/addresses/validate
   */
  async validate(ctx: StrapiContext): Promise<ApiResponse<AddressValidationResult> | ApiError> {
    try {
      const addressData = ctx.request.body;

      const validation = await strapi.service('api::address.address').validateAndNormalizeAddress(addressData);

      return ctx.send({
        data: validation
      });

    } catch (error: unknown) {
      strapi.log.error('Error validating address:', error);
      
      return ctx.internalServerError('Failed to validate address', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Helper method to check address completeness
   */
  checkAddressCompleteness(address: any): boolean {
    const requiredFields = ['nom', 'prenom', 'addresse', 'ville', 'codePostal'];
    return requiredFields.every(field => address[field] && address[field].trim().length > 0);
  },

  /**
   * Helper method to validate French postal code
   */
  validatePostalCode(postalCode: string): boolean {
    // French postal code format: 5 digits
    const frenchPostalRegex = /^[0-9]{5}$/;
    return frenchPostalRegex.test(postalCode);
  },

  /**
   * Helper method to format address for display
   */
  formatAddress(address: any): string {
    const parts: string[] = [];
    
    if (address.addresse) parts.push(address.addresse);
    if (address.codePostal && address.ville) {
      parts.push(`${address.codePostal} ${address.ville}`);
    } else if (address.ville) {
      parts.push(address.ville);
    }
    if (address.region) parts.push(address.region);
    
    return parts.join(', ');
  },

  /**
   * Helper method to validate address data
   */
  validateAddressData(address: any): string[] {
    const errors: string[] = [];

    if (!address.nom || address.nom.trim().length < 1) {
      errors.push('Last name is required');
    }
    if (!address.prenom || address.prenom.trim().length < 1) {
      errors.push('First name is required');
    }
    if (!address.addresse || address.addresse.trim().length < 5) {
      errors.push('Address must be at least 5 characters long');
    }
    if (!address.ville || address.ville.trim().length < 2) {
      errors.push('City is required');
    }
    if (!this.validatePostalCode(address.codePostal || '')) {
      errors.push('Valid postal code is required (5 digits)');
    }

    return errors;
  }
}));