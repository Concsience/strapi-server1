"use strict";
/**
 * Core TypeScript type definitions for Strapi E-commerce Backend
 * These types provide strong typing across the entire application
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isApiError = isApiError;
exports.hasUser = hasUser;
/**
 * Type guards
 */
function isApiError(error) {
    return error && error.error && typeof error.error.status === 'number';
}
function hasUser(ctx) {
    return ctx.state.user != null;
}
