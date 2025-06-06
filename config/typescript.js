module.exports = ({ env }) => ({
  /**
   * Disable TypeScript compilation for pure JavaScript project
   */
  enabled: false,
  
  /**
   * Disable TypeScript definitions generation for JavaScript project
   */
  autogenerate: false,
});