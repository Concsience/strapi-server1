/**
 * ordered-item service - TypeScript implementation
 * Business logic for ordered item management and fulfillment tracking
 * Follows official Strapi TypeScript documentation patterns
 */
const { factories } = require('@strapi/strapi');
module.exports = factories.createCoreService('api::ordered-item.ordered-item', ({ strapi }) => ({
    /**
     * Get comprehensive ordered item statistics
     */
    async getOrderedItemStats() {
        try {
            const orderedItems = await strapi.entityService.findMany('api::ordered-item.ordered-item', {
                populate: {
                    art: {
                        populate: ['artist']
                    },
                    paper_type: true,
                    order: true
                },
                limit: 1000
            });
            const items = Array.isArray(orderedItems) ? orderedItems : [orderedItems];
            const totalItems = items.length;
            let totalValue = 0;
            const artworkCounts = {};
            const sizeDistribution = {};
            const fulfillmentCounts = {
                pending: 0,
                processing: 0,
                printed: 0,
                shipped: 0,
                delivered: 0
            };
            const monthlyData = {};
            // Analyze ordered items
            items.forEach(item => {
                const itemValue = (item.price || 0) * (item.quantity || 1);
                totalValue += itemValue;
                // Artwork popularity
                if (item.art) {
                    const artKey = item.art.id;
                    artworkCounts[artKey] = (artworkCounts[artKey] || 0) + (item.quantity || 1);
                }
                // Size distribution
                const sizeKey = `${item.width || 0}x${item.height || 0}`;
                sizeDistribution[sizeKey] = (sizeDistribution[sizeKey] || 0) + (item.quantity || 1);
                // Fulfillment status
                const status = item.fulfillmentStatus || 'pending';
                if (status in fulfillmentCounts) {
                    fulfillmentCounts[status]++;
                }
                // Monthly trends
                if (item.createdAt) {
                    const monthKey = new Date(item.createdAt).toISOString().substring(0, 7); // YYYY-MM
                    if (!monthlyData[monthKey]) {
                        monthlyData[monthKey] = { count: 0, value: 0 };
                    }
                    monthlyData[monthKey].count += item.quantity || 1;
                    monthlyData[monthKey].value += itemValue;
                }
            });
            const averageItemValue = totalItems > 0 ? totalValue / totalItems : 0;
            // Find most ordered artwork
            let mostOrderedArt = null;
            let maxArtCount = 0;
            for (const [artworkId, count] of Object.entries(artworkCounts)) {
                if (count > maxArtCount) {
                    maxArtCount = count;
                    const artwork = await strapi.entityService.findOne('api::artists-work.artists-work', artworkId, {
                        populate: ['artist', 'artimage']
                    });
                    if (artwork) {
                        mostOrderedArt = {
                            ...artwork,
                            totalOrdered: count
                        };
                    }
                }
            }
            // Top 10 popular sizes
            const popularSizes = Object.entries(sizeDistribution)
                .map(([size, count]) => ({ size, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10);
            // Monthly trends (last 12 months)
            const monthlyTrends = Object.entries(monthlyData)
                .map(([month, data]) => ({
                month,
                itemCount: data.count,
                totalValue: Math.round(data.value * 100) / 100
            }))
                .sort((a, b) => a.month.localeCompare(b.month))
                .slice(-12);
            return {
                totalItems,
                totalValue: Math.round(totalValue * 100) / 100,
                averageItemValue: Math.round(averageItemValue * 100) / 100,
                mostOrderedArt,
                popularSizes,
                fulfillmentStatus: fulfillmentCounts,
                monthlyTrends
            };
        }
        catch (error) {
            strapi.log.error('Error getting ordered item stats:', error);
            throw error;
        }
    },
    /**
     * Get fulfillment pipeline overview
     */
    async getFulfillmentPipeline() {
        try {
            const pipeline = await strapi.entityService.findMany('api::ordered-item.ordered-item', {
                filters: {
                    fulfillmentStatus: { $in: ['pending', 'processing', 'printed'] }
                },
                populate: {
                    art: {
                        populate: ['artist']
                    },
                    order: {
                        populate: ['user']
                    },
                    paper_type: true
                },
                sort: 'createdAt:asc'
            });
            const pipelineItems = Array.isArray(pipeline) ? pipeline : [pipeline];
            // Group by fulfillment status
            const grouped = {
                pending: [],
                processing: [],
                printed: []
            };
            pipelineItems.forEach(item => {
                const status = item.fulfillmentStatus || 'pending';
                if (status in grouped) {
                    grouped[status].push({
                        ...item,
                        customerEmail: item.order?.user?.email,
                        orderDate: item.order?.createdAt,
                        dimensions: `${item.width || 0}x${item.height || 0}cm`,
                        totalValue: (item.price || 0) * (item.quantity || 1)
                    });
                }
            });
            return {
                pipeline: grouped,
                summary: {
                    pendingCount: grouped.pending.length,
                    processingCount: grouped.processing.length,
                    printedCount: grouped.printed.length,
                    totalInPipeline: pipelineItems.length
                }
            };
        }
        catch (error) {
            strapi.log.error('Error getting fulfillment pipeline:', error);
            throw error;
        }
    },
    /**
     * Bulk update fulfillment status
     */
    async bulkUpdateFulfillment(updates) {
        try {
            const results = [];
            for (const update of updates) {
                try {
                    const updatedItem = await strapi.entityService.update('api::ordered-item.ordered-item', update.orderedItemId, {
                        data: {
                            fulfillmentStatus: update.status,
                            trackingNumber: update.trackingNumber,
                            fulfillmentNotes: update.notes,
                            lastFulfillmentUpdate: update.timestamp.toISOString()
                        }
                    });
                    results.push({
                        success: true,
                        orderedItemId: update.orderedItemId,
                        item: updatedItem
                    });
                    strapi.log.info(`Updated fulfillment for item ${update.orderedItemId}: ${update.status}`);
                }
                catch (error) {
                    strapi.log.error(`Failed to update fulfillment for item ${update.orderedItemId}:`, error);
                    results.push({
                        success: false,
                        orderedItemId: update.orderedItemId,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            }
            const successCount = results.filter(r => r.success).length;
            const failureCount = results.filter(r => !r.success).length;
            strapi.log.info(`Bulk fulfillment update completed: ${successCount} success, ${failureCount} failed`);
            return {
                results,
                summary: {
                    total: updates.length,
                    successful: successCount,
                    failed: failureCount
                }
            };
        }
        catch (error) {
            strapi.log.error('Error in bulk fulfillment update:', error);
            throw error;
        }
    },
    /**
     * Create ordered items from cart items
     */
    async createFromCartItems(cartItems, orderId) {
        try {
            const orderedItems = [];
            for (const cartItem of cartItems) {
                const orderedItemData = {
                    arttitle: cartItem.arttitle,
                    width: cartItem.width,
                    height: cartItem.height,
                    art: cartItem.art?.id || cartItem.art,
                    artistname: cartItem.artistname,
                    paper_type: cartItem.paper_type?.id || cartItem.paper_type,
                    price: cartItem.price,
                    quantity: cartItem.qty,
                    book_title: cartItem.book_title,
                    author_name: cartItem.author_name,
                    book: cartItem.book?.id || cartItem.book,
                    order: orderId,
                    fulfillmentStatus: 'pending'
                };
                const orderedItem = await strapi.entityService.create('api::ordered-item.ordered-item', {
                    data: orderedItemData,
                    populate: {
                        art: {
                            populate: ['artist']
                        },
                        paper_type: true,
                        book: true
                    }
                });
                orderedItems.push(orderedItem);
            }
            strapi.log.info(`Created ${orderedItems.length} ordered items for order ${orderId}`);
            return orderedItems;
        }
        catch (error) {
            strapi.log.error('Error creating ordered items from cart:', error);
            throw error;
        }
    },
    /**
     * Get items ready for printing
     */
    async getItemsReadyForPrinting() {
        try {
            const readyItems = await strapi.entityService.findMany('api::ordered-item.ordered-item', {
                filters: {
                    fulfillmentStatus: 'pending',
                    order: {
                        status: 'paid'
                    }
                },
                populate: {
                    art: {
                        populate: ['artist', 'artimage']
                    },
                    paper_type: true,
                    order: {
                        populate: ['user']
                    }
                },
                sort: 'createdAt:asc'
            });
            const readyItemsList = Array.isArray(readyItems) ? readyItems : [readyItems];
            // Group by paper type for efficient printing
            const grouped = {};
            readyItemsList.forEach(item => {
                const paperKey = item.paper_type?.name || 'standard';
                if (!grouped[paperKey]) {
                    grouped[paperKey] = [];
                }
                grouped[paperKey].push({
                    ...item,
                    printSpecs: {
                        dimensions: `${item.width || 0}x${item.height || 0}cm`,
                        paperType: item.paper_type?.name || 'Standard',
                        quantity: item.quantity || 1,
                        artworkUrl: item.art?.artimage?.url,
                        customerEmail: item.order?.user?.email
                    }
                });
            });
            return {
                itemsByPaperType: grouped,
                totalItems: readyItemsList.length,
                summary: Object.entries(grouped).map(([paperType, items]) => ({
                    paperType,
                    itemCount: items.length,
                    totalQuantity: items.reduce((sum, item) => sum + (item.quantity || 1), 0)
                }))
            };
        }
        catch (error) {
            strapi.log.error('Error getting items ready for printing:', error);
            throw error;
        }
    },
    /**
     * Generate production sheets for printing
     */
    async generateProductionSheets(paperType) {
        try {
            const filters = {
                fulfillmentStatus: 'pending',
                order: { status: 'paid' }
            };
            if (paperType) {
                filters.paper_type = { name: paperType };
            }
            const items = await strapi.entityService.findMany('api::ordered-item.ordered-item', {
                filters,
                populate: {
                    art: {
                        populate: ['artist', 'artimage']
                    },
                    paper_type: true,
                    order: {
                        populate: ['user']
                    }
                }
            });
            const itemsList = Array.isArray(items) ? items : [items];
            const productionSheet = itemsList.map(item => ({
                orderId: item.order?.id,
                orderDate: item.order?.createdAt,
                customerEmail: item.order?.user?.email,
                itemId: item.id,
                artworkTitle: item.arttitle,
                artistName: item.artistname,
                dimensions: `${item.width}x${item.height}cm`,
                paperType: item.paper_type?.name || 'Standard',
                quantity: item.quantity,
                artworkUrl: item.art?.artimage?.url,
                printingNotes: item.paper_type?.printing_notes || ''
            }));
            return {
                productionSheet,
                metadata: {
                    generatedAt: new Date().toISOString(),
                    paperType: paperType || 'All Types',
                    totalItems: productionSheet.length,
                    totalPieces: productionSheet.reduce((sum, item) => sum + (item.quantity || 1), 0)
                }
            };
        }
        catch (error) {
            strapi.log.error('Error generating production sheets:', error);
            throw error;
        }
    }
}));
