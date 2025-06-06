/**
 * Custom routes for artists-work API
 * These routes extend the default CRUD routes
 */
const customArtistsWorkRoutes = {
    routes: [
        // Popular artworks endpoint
        {
            method: 'GET',
            path: '/artists-works/popular',
            handler: 'artists-work.popular',
            config: {
                auth: false,
                policies: [],
                middlewares: []
            }
        },
        // Price calculation endpoint
        {
            method: 'POST',
            path: '/artists-works/:id/calculate-price',
            handler: 'artists-work.calculatePrice',
            config: {
                auth: false,
                policies: [],
                middlewares: []
            }
        },
        // Enhanced search endpoint
        {
            method: 'GET',
            path: '/artists-works/search',
            handler: 'artists-work.search',
            config: {
                auth: false,
                policies: [],
                middlewares: []
            }
        },
        // Statistics endpoint (admin only)
        {
            method: 'GET',
            path: '/artists-works/stats',
            handler: 'artists-work.stats',
            config: {
                auth: {},
                policies: [],
                middlewares: []
            }
        }
    ]
};
module.exports = customArtistsWorkRoutes;
