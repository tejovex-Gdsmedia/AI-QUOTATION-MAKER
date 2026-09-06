/**
 * QuotationSchema Definition & JSDoc Type Configuration
 * 
 * This file serves as the single source of truth for the quotation object.
 * All modules (React Preview, ReportLab PDF, DB Save/Load, Exports) must strictly
 * adhere to this schema. No components should directly access raw legacy fields.
 * 
 * @typedef {Object} CompanyProfile
 * @property {string} companyName - Legal company name (Required)
 * @property {string} [brandName] - Customer-facing brand name (Optional)
 * @property {string} email - Contact email address (Required)
 * @property {string} phone - Contact phone number (Required)
 * @property {string} [website] - Public website (Optional)
 * @property {string} [address] - Physical corporate address (Optional)
 * @property {Object} [brandColors] - Primary and secondary colors (Optional)
 */

/**
 * @typedef {Object} PricingPackage
 * @property {string} name - Name of the package (Required)
 * @property {string} price - Price / Investment amount (Required)
 * @property {string} description - Package deliverables description (Required)
 */

/**
 * @typedef {Object} QuotationSchema
 * @property {string} quotationNumber - Unique quotation serial number (Required)
 * @property {string} [generatedAt] - Date of generation (Optional)
 * @property {number} [version] - Document version (Optional)
 * @property {string} clientContactName - Client contact representative (Required)
 * @property {string} clientBusinessName - Client business name (Required)
 * @property {string} industry - Client industry vertical (Required)
 * @property {string} [email] - Client contact email (Optional)
 * @property {string} [phone] - Client contact phone (Optional)
 * @property {string} proposalTitle - Title of the proposal (Required)
 * @property {string} aboutCompany - Provider introduction (Required)
 * @property {string} [requirement] - Client's raw requirement description (Optional)
 * @property {string} understanding - Summarized client need/objectives (Required)
 * @property {string} proposedSolution - Simple overview of the automation solution (Required)
 * @property {string[]} servicesIncluded - Array of whitelisted service names (Required)
 * @property {string[]} businessBenefits - Business impact benefits (Required)
 * @property {string} whyUs - Custom differentiator block (Required)
 * @property {string} cta - Call to action (Required)
 * @property {PricingPackage[]} pricingPackages - Investment tiers (Required)
 * @property {CompanyProfile} companyProfile - Provider profile settings (Required)
 */

// Exported structural reference for runtime verification
export const QuotationSchemaKeys = {
  clientContactName: true,
  clientBusinessName: true,
  industry: true,
  email: true,
  phone: true,
  proposalTitle: true,
  aboutCompany: true,
  requirement: true,
  understanding: true,
  proposedSolution: true,
  servicesIncluded: true,
  businessBenefits: true,
  whyUs: true,
  cta: true,
  pricingPackages: true,
  companyProfile: true,
  quotationNumber: true,
  generatedAt: true,
  version: true
};
