/**
 * Content History Service
 * Manages version tracking and retrieval for e-commerce content
 */

import { sendEcommerceEvent } from '../../utils/webhook-system';
import config from './config';

interface ContentVersion {
  id: string;
  documentId: string;
  contentType: string;
  version: number;
  data: any;
  changes?: ChangeRecord[];
  metadata: {
    userId?: string;
    userEmail?: string;
    ip?: string;
    userAgent?: string;
    source?: string;
  };
  createdAt: Date;
}

interface ChangeRecord {
  field: string;
  oldValue: any;
  newValue: any;
  type: 'created' | 'updated' | 'deleted';
}

export class ContentHistoryService {
  private versions: Map<string, ContentVersion[]> = new Map();
  private versionCounter: Map<string, number> = new Map();

  constructor() {
    // Start cleanup process
    if (config.retention.cleanupInterval > 0) {
      setInterval(() => this.cleanup(), config.retention.cleanupInterval);
    }
  }

  /**
   * Track content change
   */
  async trackChange(
    contentType: string,
    documentId: string,
    newData: any,
    oldData?: any,
    context?: any
  ): Promise<void> {
    // Check if content type should be tracked
    if (!config.trackedContentTypes.includes(contentType)) {
      return;
    }

    const versionKey = `${contentType}:${documentId}`;
    const currentVersion = this.versionCounter.get(versionKey) || 0;
    const nextVersion = currentVersion + 1;

    // Calculate changes
    const changes = this.calculateChanges(oldData, newData);

    // Create version record
    const version: ContentVersion = {
      id: `${versionKey}:v${nextVersion}`,
      documentId,
      contentType,
      version: nextVersion,
      data: this.sanitizeData(newData),
      changes,
      metadata: {
        userId: context?.user?.id,
        userEmail: context?.user?.email,
        ip: context?.ip,
        userAgent: context?.userAgent,
        source: context?.source || 'api'
      },
      createdAt: new Date()
    };

    // Store version
    if (!this.versions.has(versionKey)) {
      this.versions.set(versionKey, []);
    }

    const versions = this.versions.get(versionKey)!;
    versions.push(version);

    // Update version counter
    this.versionCounter.set(versionKey, nextVersion);

    // Enforce max versions limit
    if (config.retention.maxVersions > 0 && versions.length > config.retention.maxVersions) {
      versions.splice(0, versions.length - config.retention.maxVersions);
    }

    // Log significant changes
    if (this.isCriticalChange(contentType, changes)) {
      console.log(`📝 Critical content change tracked: ${contentType}:${documentId} v${nextVersion}`);
      
      // Send notification if enabled
      if (config.notifications.enabled) {
        await this.sendChangeNotification(version);
      }
    }
  }

  /**
   * Get version history for a document
   */
  getHistory(contentType: string, documentId: string, limit = 20): ContentVersion[] {
    const versionKey = `${contentType}:${documentId}`;
    const versions = this.versions.get(versionKey) || [];
    
    return versions
      .sort((a, b) => b.version - a.version)
      .slice(0, limit);
  }

  /**
   * Get specific version
   */
  getVersion(contentType: string, documentId: string, version: number): ContentVersion | null {
    const versions = this.getHistory(contentType, documentId);
    return versions.find(v => v.version === version) || null;
  }

  /**
   * Compare two versions
   */
  compareVersions(
    contentType: string,
    documentId: string,
    fromVersion: number,
    toVersion: number
  ): ChangeRecord[] {
    const from = this.getVersion(contentType, documentId, fromVersion);
    const to = this.getVersion(contentType, documentId, toVersion);

    if (!from || !to) {
      throw new Error('One or both versions not found');
    }

    return this.calculateChanges(from.data, to.data);
  }

  /**
   * Restore to specific version
   */
  async restoreVersion(
    contentType: string,
    documentId: string,
    version: number,
    context?: any
  ): Promise<any> {
    const targetVersion = this.getVersion(contentType, documentId, version);
    
    if (!targetVersion) {
      throw new Error(`Version ${version} not found`);
    }

    // Get current data for comparison
    const currentData = await strapi.documents(contentType).findOne({
      documentId
    });

    // Update document with version data
    const restoredData = await strapi.documents(contentType).update({
      documentId,
      data: targetVersion.data
    });

    // Track the restoration as a new change
    await this.trackChange(contentType, documentId, targetVersion.data, currentData, {
      ...context,
      source: 'version_restore',
      restoredFromVersion: version
    });

    console.log(`🔄 Content restored: ${contentType}:${documentId} to version ${version}`);

    return restoredData;
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalDocuments: number;
    totalVersions: number;
    contentTypeBreakdown: Record<string, number>;
    oldestVersion: Date | null;
    newestVersion: Date | null;
  } {
    let totalVersions = 0;
    let oldestVersion: Date | null = null;
    let newestVersion: Date | null = null;
    const contentTypeBreakdown: Record<string, number> = {};

    for (const [key, versions] of this.versions.entries()) {
      const contentType = key.split(':')[0];
      contentTypeBreakdown[contentType] = (contentTypeBreakdown[contentType] || 0) + versions.length;
      totalVersions += versions.length;

      for (const version of versions) {
        if (!oldestVersion || version.createdAt < oldestVersion) {
          oldestVersion = version.createdAt;
        }
        if (!newestVersion || version.createdAt > newestVersion) {
          newestVersion = version.createdAt;
        }
      }
    }

    return {
      totalDocuments: this.versions.size,
      totalVersions,
      contentTypeBreakdown,
      oldestVersion,
      newestVersion
    };
  }

  /**
   * Search versions by criteria
   */
  searchVersions(criteria: {
    contentType?: string;
    userId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    hasChanges?: boolean;
  }): ContentVersion[] {
    const results: ContentVersion[] = [];

    for (const [key, versions] of this.versions.entries()) {
      const [contentType] = key.split(':');

      if (criteria.contentType && contentType !== criteria.contentType) {
        continue;
      }

      for (const version of versions) {
        // Filter by user
        if (criteria.userId && version.metadata.userId !== criteria.userId) {
          continue;
        }

        // Filter by date range
        if (criteria.dateFrom && version.createdAt < criteria.dateFrom) {
          continue;
        }
        if (criteria.dateTo && version.createdAt > criteria.dateTo) {
          continue;
        }

        // Filter by changes
        if (criteria.hasChanges && (!version.changes || version.changes.length === 0)) {
          continue;
        }

        results.push(version);
      }
    }

    return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Private helper methods
   */
  private calculateChanges(oldData: any, newData: any): ChangeRecord[] {
    if (!oldData) {
      // New document - all fields are created
      return Object.keys(newData).map(field => ({
        field,
        oldValue: null,
        newValue: newData[field],
        type: 'created' as const
      }));
    }

    const changes: ChangeRecord[] = [];
    const allFields = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

    for (const field of allFields) {
      // Skip excluded fields
      if (config.excludedFields.includes(field)) {
        continue;
      }

      const oldValue = oldData[field];
      const newValue = newData[field];

      if (this.isValueChanged(oldValue, newValue)) {
        changes.push({
          field,
          oldValue,
          newValue,
          type: oldValue === undefined ? 'created' : 
                newValue === undefined ? 'deleted' : 'updated'
        });
      }
    }

    return changes;
  }

  private isValueChanged(oldValue: any, newValue: any): boolean {
    // Handle null/undefined cases
    if (oldValue === null && newValue === null) return false;
    if (oldValue === undefined && newValue === undefined) return false;
    if (oldValue !== newValue) return true;

    // Deep comparison for objects/arrays
    if (typeof oldValue === 'object' && typeof newValue === 'object') {
      return JSON.stringify(oldValue) !== JSON.stringify(newValue);
    }

    return false;
  }

  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') return data;

    const sanitized = { ...data };
    
    // Remove excluded fields
    for (const field of config.excludedFields) {
      delete sanitized[field];
    }

    return sanitized;
  }

  private isCriticalChange(contentType: string, changes: ChangeRecord[]): boolean {
    if (!config.notifications.criticalChanges.length) return false;

    return changes.some(change => {
      const fieldPath = `${contentType.replace('api::', '').replace('.', '-')}.${change.field}`;
      return config.notifications.criticalChanges.includes(fieldPath);
    });
  }

  private async sendChangeNotification(version: ContentVersion): Promise<void> {
    try {
      await sendEcommerceEvent('content.history.critical_change', {
        contentType: version.contentType,
        documentId: version.documentId,
        version: version.version,
        changes: version.changes,
        user: version.metadata.userId
      }, version.metadata.userId);
    } catch (error) {
      console.error('Failed to send content history notification:', error);
    }
  }

  private cleanup(): void {
    if (!config.retention.maxAge) return;

    const cutoffDate = new Date(Date.now() - config.retention.maxAge);
    let removedCount = 0;

    for (const [key, versions] of this.versions.entries()) {
      const filteredVersions = versions.filter(v => v.createdAt > cutoffDate);
      const removed = versions.length - filteredVersions.length;
      
      if (removed > 0) {
        this.versions.set(key, filteredVersions);
        removedCount += removed;
      }

      // Remove empty entries
      if (filteredVersions.length === 0) {
        this.versions.delete(key);
        this.versionCounter.delete(key);
      }
    }

    if (removedCount > 0) {
      console.log(`🧹 Content history cleanup: removed ${removedCount} old versions`);
    }
  }
}

// Singleton instance
export const contentHistory = new ContentHistoryService();

// Lifecycle hooks registration
export const registerContentHistoryHooks = (strapi: any) => {
  // Track changes on all CRUD operations
  strapi.db.lifecycles.subscribe({
    models: config.trackedContentTypes,

    async afterCreate(event: any) {
      await contentHistory.trackChange(
        event.model.uid,
        event.result.documentId,
        event.result,
        null,
        event.params?.context
      );
    },

    async afterUpdate(event: any) {
      await contentHistory.trackChange(
        event.model.uid,
        event.result.documentId,
        event.result,
        event.params?.where?.id ? await strapi.documents(event.model.uid).findOne({
          documentId: event.params.where.id
        }) : null,
        event.params?.context
      );
    },

    async afterDelete(event: any) {
      // Track deletion
      await contentHistory.trackChange(
        event.model.uid,
        event.result.documentId,
        null,
        event.result,
        event.params?.context
      );
    }
  });

  console.log('📝 Content History hooks registered for:', config.trackedContentTypes.join(', '));
};