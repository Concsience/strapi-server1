module.exports = {
    register() {
        // Register function - can be used for plugin registration
    },
    async bootstrap({ strapi }) {
        // Bootstrap function disabled for debugging
        strapi.log.info("Bootstrap function disabled for debugging");
    },
};
