/**
 * address service - TypeScript implementation
 * Business logic for address management and validation
 * Follows official Strapi TypeScript documentation patterns
 */

const { factories  } = require('@strapi/strapi');

// Service-specific interfaces




module.exports = factories.createCoreService('api::address.address', ({ strapi }) => ({
  /**
   * Validate and normalize address data
   */
  async validateAndNormalizeAddress(
    data, 
    isUpdate = false
  ) {
    try {
      const errors = [];
      const normalizedData = {};

      // Validate required fields (only for create or if provided in update)
      if (!isUpdate || 'nom' in data) {
        if (!data.nom || typeof data.nom !== 'string' || data.nom.trim().length < 1) {
          errors.push('Last name is required');
        } else {
          normalizedData.nom = this.normalizeName(data.nom);
        }
      }

      if (!isUpdate || 'prenom' in data) {
        if (!data.prenom || typeof data.prenom !== 'string' || data.prenom.trim().length < 1) {
          errors.push('First name is required');
        } else {
          normalizedData.prenom = this.normalizeName(data.prenom);
        }
      }

      if (!isUpdate || 'addresse' in data) {
        if (!data.addresse || typeof data.addresse !== 'string' || data.addresse.trim().length < 5) {
          errors.push('Address must be at least 5 characters long');
        } else {
          normalizedData.addresse = this.normalizeAddress(data.addresse);
        }
      }

      if (!isUpdate || 'ville' in data) {
        if (!data.ville || typeof data.ville !== 'string' || data.ville.trim().length < 2) {
          errors.push('City name must be at least 2 characters long');
        } else {
          normalizedData.ville = this.normalizeCityName(data.ville);
        }
      }

      if (!isUpdate || 'codePostal' in data) {
        if (!data.codePostal || !this.validatePostalCode(data.codePostal)) {
          errors.push('Valid postal code is required (5 digits)');
        } else {
          normalizedData.codePostal = data.codePostal.trim();
          // Auto-determine department from postal code
          normalizedData.department = this.getDepartmentFromPostalCode(data.codePostal);
        }
      }

      // Validate optional fields
      if (data.region) {
        if (typeof data.region !== 'string' || data.region.trim().length < 2) {
          errors.push('Region name must be at least 2 characters long');
        } else {
          normalizedData.region = this.normalizeRegionName(data.region);
        }
      }

      if (data.telephone) {
        const phoneValidation = this.validateFrenchPhoneNumber(data.telephone);
        if (!phoneValidation.isValid) {
          errors.push(phoneValidation.error || 'Invalid phone number format');
        } else {
          normalizedData.telephone = phoneValidation.normalized;
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        normalizedData: errors.length === 0 ? normalizedData : undefined
      };

    } catch (error) {
      strapi.log.error('Error validating address:', error);
      return {
        isValid: false,
        errors: ['Address validation failed'],
        normalizedData: undefined
      };
    }
  },

  /**
   * Normalize name (capitalize first letter, lowercase rest)
   */
  normalizeName(name) {
    return name.trim()
      .split(' ')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  },

  /**
   * Normalize address line
   */
  normalizeAddress(address) {
    return address.trim()
      .replace(/\s+/g, ' ') // Multiple spaces to single space
      .replace(/\b(\d+)\s*bis\b/gi, '$1 bis') // Normalize "bis" format
      .replace(/\b(\d+)\s*ter\b/gi, '$1 ter'); // Normalize "ter" format
  },

  /**
   * Normalize city name
   */
  normalizeCityName(city) {
    return city.trim()
      .split(' ')
      .map(part => {
        // Handle special cases like "Saint-", "Sainte-"
        if (part.toLowerCase().startsWith('saint') || part.toLowerCase().startsWith('sainte')) {
          return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
        }
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
      })
      .join(' ');
  },

  /**
   * Normalize region name
   */
  normalizeRegionName(region) {
    // French regions normalization
    const regionMappings = {
      'ile de france': 'Île-de-France',
      'ile-de-france': 'Île-de-France',
      'paca': 'Provence-Alpes-Côte d\'Azur',
      'nouvelle aquitaine': 'Nouvelle-Aquitaine',
      'nouvelle-aquitaine': 'Nouvelle-Aquitaine',
      'grand est': 'Grand Est',
      'grand-est': 'Grand Est',
      'haut de france': 'Hauts-de-France',
      'hauts de france': 'Hauts-de-France',
      'hauts-de-france': 'Hauts-de-France'
    };

    const normalized = region.trim().toLowerCase();
    return regionMappings[normalized] || this.normalizeName(region);
  },

  /**
   * Validate French postal code
   */
  validatePostalCode(postalCode) {
    const cleaned = postalCode.replace(/\s/g, '');
    return /^[0-9]{5}$/.test(cleaned);
  },

  /**
   * Get department code from postal code
   */
  getDepartmentFromPostalCode(postalCode) {
    const cleaned = postalCode.replace(/\s/g, '');
    if (cleaned.length !== 5) return '';
    
    // First two digits for most departments
    let dept = cleaned.substring(0, 2);
    
    // Special cases for Corsica
    if (cleaned.startsWith('20')) {
      if (cleaned.startsWith('200') || cleaned.startsWith('201')) {
        return '2A'; // Corse-du-Sud
      } else {
        return '2B'; // Haute-Corse
      }
    }

    return dept;
  },

  /**
   * Validate French phone number
   */
  validateFrenchPhoneNumber(phone) {
    if (!phone) {
      return { isValid: false, error: 'Phone number is required' };
    }

    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');

    // French mobile: 06/07 + 8 digits or landline: 01-05/08/09 + 8 digits
    if (cleaned.length === 10) {
      const validPrefixes = ['01', '02', '03', '04', '05', '06', '07', '08', '09'];
      const prefix = cleaned.substring(0, 2);
      
      if (validPrefixes.includes(prefix)) {
        // Format as XX XX XX XX XX
        const formatted = cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
        return { isValid: true, normalized: formatted };
      }
    }

    // International format starting with +33
    if (cleaned.length === 11 && cleaned.startsWith('33')) {
      const nationalNumber = '0' + cleaned.substring(2);
      return this.validateFrenchPhoneNumber(nationalNumber);
    }

    return { isValid: false, error: 'Invalid French phone number format' };
  },

  /**
   * Get addresses by user with enhanced data
   */
  async getUserAddresses(userId) {
    try {
      const addresses = await strapi.documents('api::address.address').findMany({
        filters: {
          owner: { id: userId },
          publishedAt: { $notNull: true }
        },
        sort: 'createdAt:desc'
      });

      // Enhance addresses with validation and formatting
      const enhancedAddresses = addresses.results.map(address => ({
        ...address,
        isComplete: this.checkAddressCompleteness(address),
        isValidPostalCode: this.validatePostalCode(address.codePostal || ''),
        fullName: `${address.prenom || ''} ${address.nom || ''}`.trim(),
        formattedAddress: this.formatAddressForDisplay(address),
        department: this.getDepartmentFromPostalCode(address.codePostal || '')
      }));

      return {
        results: enhancedAddresses,
        pagination: addresses.pagination
      };

    } catch (error) {
      strapi.log.error('Error getting user addresses:', error);
      throw error;
    }
  },

  /**
   * Check if address is complete
   */
  checkAddressCompleteness(address) {
    const requiredFields = ['nom', 'prenom', 'addresse', 'ville', 'codePostal'];
    return requiredFields.every(field => 
      address[field] && 
      typeof address[field] === 'string' && 
      address[field].trim().length > 0
    );
  },

  /**
   * Format address for display
   */
  formatAddressForDisplay(address) {
    const parts = [];
    
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
   * Get address statistics for admin dashboard
   */
  async getAddressStats() {
    try {
      // Get all addresses
      const addresses = await strapi.documents('api::address.address').findMany({
        populate: ['owner'],
        pagination: { pageSize: 1000 }
      });

      const totalAddresses = addresses.results.length;
      const userAddresses = {};
      const regionDistribution = {};
      const cityDistribution = {};
      
      let completeAddresses = 0;
      let incompleteAddresses = 0;
      let invalidPostalCodes = 0;

      // Analyze addresses
      addresses.results.forEach(address => {
        // User distribution
        const userId = address.owner?.id;
        if (userId) {
          userAddresses[userId] = (userAddresses[userId] || 0) + 1;
        }

        // Region distribution
        if (address.region) {
          regionDistribution[address.region] = (regionDistribution[address.region] || 0) + 1;
        }

        // City distribution
        if (address.ville) {
          cityDistribution[address.ville] = (cityDistribution[address.ville] || 0) + 1;
        }

        // Validation stats
        if (this.checkAddressCompleteness(address)) {
          completeAddresses++;
        } else {
          incompleteAddresses++;
        }

        if (!this.validatePostalCode(address.codePostal || '')) {
          invalidPostalCodes++;
        }
      });

      // Get most common regions
      const mostCommonRegions = Object.entries(regionDistribution)
        .map(([region, count]) => ({ region, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        totalAddresses,
        userAddresses,
        regionDistribution,
        cityDistribution,
        mostCommonRegions,
        validationStats: {
          completeAddresses,
          incompleteAddresses,
          invalidPostalCodes
        }
      };

    } catch (error) {
      strapi.log.error('Error getting address stats:', error);
      throw error;
    }
  },

  /**
   * Search addresses by location
   */
  async searchByLocation(searchTerm, options = {}) {
    try {
      const { limit = 25, userOnly, userId } = options;

      const filters = {
        publishedAt: { $notNull: true },
        $or: [
          { ville: { $containsi: searchTerm } },
          { region: { $containsi: searchTerm } },
          { codePostal: { $startsWith: searchTerm } }
        ]
      };

      // Filter by user if specified
      if (userOnly && userId) {
        filters.owner = { id: userId };
      }

      const results = await strapi.documents('api::address.address').findMany({
        filters,
        populate: ['owner'],
        sort: 'ville:asc',
        pagination: { page: 1, pageSize: limit }
      });

      // Enhance results
      const enhancedResults = results.results.map(address => ({
        ...address,
        isComplete: this.checkAddressCompleteness(address),
        formattedAddress: this.formatAddressForDisplay(address),
        department: this.getDepartmentFromPostalCode(address.codePostal || '')
      }));

      return {
        results: enhancedResults,
        pagination: results.pagination
      };

    } catch (error) {
      strapi.log.error('Error searching addresses by location:', error);
      throw error;
    }
  },

  /**
   * Duplicate check for similar addresses
   */
  async checkForDuplicates(addressData, userId) {
    try {
      const existingAddresses = await strapi.documents('api::address.address').findMany({
        filters: {
          owner: { id: userId },
          publishedAt: { $notNull: true }
        }
      });

      const potentialDuplicates = existingAddresses.results.filter(existing => {
        return (
          existing.codePostal === addressData.codePostal &&
          existing.ville?.toLowerCase() === addressData.ville?.toLowerCase() &&
          existing.addresse?.toLowerCase().includes(addressData.addresse?.toLowerCase() || '')
        );
      });

      return {
        hasDuplicates: potentialDuplicates.length > 0,
        duplicates: potentialDuplicates,
        suggestions: potentialDuplicates.length > 0 
          ? ['Consider updating existing address instead of creating a new one']
          : []
      };

    } catch (error) {
      strapi.log.error('Error checking for address duplicates:', error);
      return {
        hasDuplicates: false,
        duplicates: [],
        suggestions: []
      };
    }
  }
}));