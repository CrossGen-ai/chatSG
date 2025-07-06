/**
 * Insightly API Compliance Validator
 * Ensures our implementation follows Insightly's documented API requirements
 */

export interface ApiComplianceResult {
  compliant: boolean;
  violations: string[];
  warnings: string[];
}

/**
 * Validates that an endpoint URL follows Insightly API requirements
 */
export function validateEndpointCompliance(url: string, params: URLSearchParams): ApiComplianceResult {
  const violations: string[] = [];
  const warnings: string[] = [];

  // Check for forbidden OData parameters
  const forbiddenParams = ['$filter', '$orderby', '$top', '$skip', '$select', '$expand'];
  for (const forbidden of forbiddenParams) {
    if (params.has(forbidden)) {
      violations.push(`Forbidden OData parameter '${forbidden}' detected. Insightly does not support OData syntax.`);
    }
  }

  // Check for correct pagination parameters
  if (params.has('$top') && !params.has('top')) {
    violations.push("Use 'top' parameter instead of '$top' for pagination.");
  }
  if (params.has('$skip') && !params.has('skip')) {
    violations.push("Use 'skip' parameter instead of '$skip' for pagination.");
  }

  // Validate search endpoint usage
  if (url.includes('/Search')) {
    if (!params.has('field_name') || !params.has('field_value')) {
      violations.push("Search endpoints require both 'field_name' and 'field_value' parameters.");
    }
  }

  // Check for proper search patterns instead of filtering
  if (params.has('$filter')) {
    warnings.push("Consider using /Search endpoint with field_name/field_value instead of $filter.");
  }

  return {
    compliant: violations.length === 0,
    violations,
    warnings
  };
}

/**
 * Validates authentication header format
 */
export function validateAuthCompliance(authHeader: string): ApiComplianceResult {
  const violations: string[] = [];
  const warnings: string[] = [];

  if (!authHeader.startsWith('Basic ')) {
    violations.push("Authentication must use Basic auth format.");
    return { compliant: false, violations, warnings };
  }

  try {
    const base64Part = authHeader.replace('Basic ', '');
    const decoded = Buffer.from(base64Part, 'base64').toString('utf-8');
    
    // Should be in format "apikey:" (with colon but no password)
    if (!decoded.endsWith(':')) {
      violations.push("API key should be used as username with empty password (format: 'apikey:')");
    }
    
    if (decoded.includes('::')) {
      warnings.push("Double colon detected - ensure you're not double-encoding the credentials.");
    }
  } catch (error) {
    violations.push("Invalid base64 encoding in Authorization header.");
  }

  return {
    compliant: violations.length === 0,
    violations,
    warnings
  };
}

/**
 * Common field mappings for Insightly API
 */
export const INSIGHTLY_FIELD_NAMES = {
  contacts: {
    firstName: 'FIRST_NAME',
    lastName: 'LAST_NAME',
    email: 'EMAIL_ADDRESS',
    phone: 'PHONE',
    mobile: 'PHONE_MOBILE',
    company: 'ORGANISATION_NAME',
    title: 'TITLE',
    id: 'CONTACT_ID'
  },
  opportunities: {
    name: 'OPPORTUNITY_NAME',
    value: 'OPPORTUNITY_VALUE',
    probability: 'PROBABILITY',
    stage: 'STAGE_ID',
    pipeline: 'PIPELINE_ID',
    contactId: 'CONTACT_ID',
    id: 'OPPORTUNITY_ID'
  },
  leads: {
    firstName: 'FIRST_NAME',
    lastName: 'LAST_NAME',
    email: 'EMAIL',
    phone: 'PHONE',
    mobile: 'MOBILE',
    company: 'ORGANISATION_NAME',
    source: 'LEAD_SOURCE_ID',
    status: 'LEAD_STATUS_ID',
    rating: 'LEAD_RATING',
    id: 'LEAD_ID'
  }
} as const;

/**
 * Logs compliance check results
 */
export function logComplianceCheck(operation: string, result: ApiComplianceResult): void {
  if (!result.compliant) {
    console.error(`[API Compliance] ${operation} - VIOLATIONS:`, result.violations);
  }
  
  if (result.warnings.length > 0) {
    console.warn(`[API Compliance] ${operation} - WARNINGS:`, result.warnings);
  }
  
  if (result.compliant && result.warnings.length === 0) {
    console.log(`[API Compliance] ${operation} - COMPLIANT ✓`);
  }
}