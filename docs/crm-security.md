# CRM Security and Compliance Guide

This document outlines security protocols, compliance measures, and best practices for the ChatSG CRM integration system.

## Table of Contents

- [Security Architecture](#security-architecture)
- [Authentication & Authorization](#authentication--authorization)
- [Data Protection](#data-protection)
- [API Security](#api-security)
- [Network Security](#network-security)
- [Compliance Framework](#compliance-framework)
- [Security Monitoring](#security-monitoring)
- [Incident Response](#incident-response)
- [Security Testing](#security-testing)
- [Audit & Logging](#audit--logging)

## Security Architecture

### Defense in Depth Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                        Users/Clients                       │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                  Network Layer                             │
│  • Firewall Rules                                          │
│  • Rate Limiting                                           │
│  • DDoS Protection                                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                Application Layer                           │
│  • Input Validation                                        │
│  • CSRF Protection                                         │
│  • XSS Prevention                                          │
│  • Security Headers                                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                   API Layer                                │
│  • Authentication                                          │
│  • Authorization                                           │
│  • Request Sanitization                                    │
│  • Response Filtering                                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                   Data Layer                               │
│  • Encryption at Rest                                      │
│  • Encryption in Transit                                   │
│  • Access Controls                                         │
│  • Audit Logging                                           │
└─────────────────────────────────────────────────────────────┘
```

### Security Components

| Component | Purpose | Implementation |
|-----------|---------|----------------|
| Input Validation | Prevent injection attacks | DOMPurify, custom sanitizers |
| Authentication | Verify user identity | Azure AD, API key validation |
| Authorization | Control resource access | Role-based access control |
| Encryption | Protect data confidentiality | TLS 1.3, AES-256 |
| Monitoring | Detect security events | Winston logging, metrics |
| Audit Trail | Compliance and forensics | Structured logging |

## Authentication & Authorization

### Multi-Layered Authentication

#### 1. User Authentication (Azure AD)

```javascript
// Production authentication middleware
const passport = require('passport');
const { Strategy: OIDCStrategy } = require('passport-azure-ad').OIDCStrategy;

const authConfig = {
  identityMetadata: process.env.AZURE_AD_METADATA_URL,
  clientID: process.env.AZURE_CLIENT_ID,
  clientSecret: process.env.AZURE_CLIENT_SECRET,
  responseType: 'code id_token',
  responseMode: 'form_post',
  redirectUrl: process.env.AZURE_REDIRECT_URL,
  allowHttpForRedirectUrl: false, // Force HTTPS in production
  validateIssuer: true,
  scope: ['profile', 'email'],
  loggingLevel: 'error'
};

passport.use(new OIDCStrategy(authConfig, async (iss, sub, profile, done) => {
  try {
    // Validate user permissions
    const user = await validateUserAccess(profile);
    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));
```

#### 2. API Authentication (CRM)

```javascript
// Secure API key management
class SecureAPIKeyManager {
  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY;
    this.rotationInterval = 30 * 24 * 60 * 60 * 1000; // 30 days
  }

  encryptAPIKey(apiKey) {
    const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
    let encrypted = cipher.update(apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  decryptAPIKey(encryptedKey) {
    const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
    let decrypted = decipher.update(encryptedKey, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  validateAPIKeyRotation(keyTimestamp) {
    const now = Date.now();
    return (now - keyTimestamp) < this.rotationInterval;
  }
}
```

### Role-Based Access Control

```javascript
// RBAC implementation
const ROLES = {
  ADMIN: {
    name: 'admin',
    permissions: ['crm:read', 'crm:write', 'crm:delete', 'system:manage']
  },
  SALES_MANAGER: {
    name: 'sales_manager',
    permissions: ['crm:read', 'crm:write', 'pipeline:manage']
  },
  SALES_REP: {
    name: 'sales_rep',
    permissions: ['crm:read', 'contacts:assigned']
  },
  READ_ONLY: {
    name: 'read_only',
    permissions: ['crm:read:limited']
  }
};

function checkPermission(userRole, requiredPermission) {
  const role = ROLES[userRole];
  if (!role) return false;
  
  return role.permissions.includes(requiredPermission) ||
         role.permissions.includes(requiredPermission.split(':')[0] + ':*');
}

// Middleware for CRM operations
function requireCRMPermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!checkPermission(req.user.role, permission)) {
      auditLogger.warn('Access denied', {
        userId: req.user.id,
        requiredPermission: permission,
        userRole: req.user.role,
        ip: req.ip
      });
      
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
}
```

## Data Protection

### Data Classification

| Data Type | Classification | Protection Level | Retention |
|-----------|----------------|------------------|-----------|
| Customer PII | Confidential | Encrypted + Access Control | 7 years |
| Contact Information | Internal | Encrypted | 5 years |
| Sales Data | Internal | Encrypted | 7 years |
| System Logs | Internal | Encrypted | 1 year |
| Debug Logs | Internal | Sanitized | 30 days |

### Encryption Implementation

#### Encryption at Rest

```javascript
// Database encryption
const knex = require('knex')({
  client: 'postgresql',
  connection: {
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  pool: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 60000,
    idleTimeoutMillis: 30000
  }
});

// Field-level encryption for sensitive data
class FieldEncryption {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyDerivation = 'pbkdf2';
    this.iterations = 100000;
  }

  encrypt(data, masterKey) {
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(16);
    
    const key = crypto.pbkdf2Sync(masterKey, salt, this.iterations, 32, 'sha256');
    const cipher = crypto.createCipherGCM(this.algorithm, key, iv);
    
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      data: encrypted,
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  decrypt(encryptedObj, masterKey) {
    const salt = Buffer.from(encryptedObj.salt, 'hex');
    const iv = Buffer.from(encryptedObj.iv, 'hex');
    const authTag = Buffer.from(encryptedObj.authTag, 'hex');
    
    const key = crypto.pbkdf2Sync(masterKey, salt, this.iterations, 32, 'sha256');
    const decipher = crypto.createDecipherGCM(this.algorithm, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedObj.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }
}
```

#### Encryption in Transit

```javascript
// TLS configuration
const https = require('https');
const fs = require('fs');

const tlsOptions = {
  key: fs.readFileSync(process.env.TLS_PRIVATE_KEY_PATH),
  cert: fs.readFileSync(process.env.TLS_CERTIFICATE_PATH),
  ca: fs.readFileSync(process.env.TLS_CA_PATH),
  secureProtocol: 'TLSv1_3_method',
  ciphers: [
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES256-SHA384',
    'ECDHE-RSA-AES128-SHA256'
  ].join(':'),
  honorCipherOrder: true
};

const server = https.createServer(tlsOptions, app);
```

### Data Sanitization

```javascript
// Input sanitization middleware
const DOMPurify = require('isomorphic-dompurify');
const validator = require('validator');

class DataSanitizer {
  static sanitizeInput(input) {
    if (typeof input === 'string') {
      // Remove potential XSS
      let sanitized = DOMPurify.sanitize(input);
      
      // Escape SQL injection patterns
      sanitized = sanitized.replace(/['";\\]/g, '');
      
      // Remove potential script injection
      sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      
      return sanitized.trim();
    }
    
    if (typeof input === 'object' && input !== null) {
      const sanitized = {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[this.sanitizeInput(key)] = this.sanitizeInput(value);
      }
      return sanitized;
    }
    
    return input;
  }

  static validateEmail(email) {
    return validator.isEmail(email) && email.length <= 254;
  }

  static validatePhone(phone) {
    // International phone number validation
    return validator.isMobilePhone(phone, 'any', { strictMode: false });
  }

  static sanitizeCRMQuery(query) {
    // CRM-specific sanitization
    const sanitized = this.sanitizeInput(query);
    
    // Remove potential Insightly API injection
    const forbidden = [
      'api_key', 'token', 'password', 'secret',
      'delete', 'drop', 'truncate', 'insert', 'update'
    ];
    
    let result = sanitized;
    forbidden.forEach(term => {
      const regex = new RegExp(term, 'gi');
      result = result.replace(regex, '[FILTERED]');
    });
    
    return result;
  }
}
```

## API Security

### Rate Limiting & Throttling

```javascript
// Advanced rate limiting
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  enableOfflineQueue: false
});

// Different limits for different operations
const rateLimits = {
  general: rateLimit({
    store: new RedisStore({
      sendCommand: (...args) => redis.call(...args)
    }),
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: {
      error: 'Too many requests',
      retryAfter: 15 * 60
    },
    standardHeaders: true,
    legacyHeaders: false
  }),

  crm: rateLimit({
    store: new RedisStore({
      sendCommand: (...args) => redis.call(...args)
    }),
    windowMs: 2 * 60 * 1000, // 2 minutes
    max: 10, // 10 CRM requests per window
    message: {
      error: 'CRM rate limit exceeded',
      retryAfter: 2 * 60
    },
    skip: (req) => {
      // Skip rate limiting for admins
      return req.user?.role === 'admin';
    }
  }),

  auth: rateLimit({
    store: new RedisStore({
      sendCommand: (...args) => redis.call(...args)
    }),
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 5, // 5 auth attempts per window
    message: {
      error: 'Too many authentication attempts',
      retryAfter: 5 * 60
    }
  })
};
```

### Request Validation

```javascript
// Schema validation
const Joi = require('joi');

const schemas = {
  chatMessage: Joi.object({
    message: Joi.string()
      .min(1)
      .max(2000)
      .pattern(/^[^<>{}[\]\\]*$/) // Prevent common injection patterns
      .required(),
    sessionId: Joi.string()
      .alphanum()
      .min(8)
      .max(64)
      .required(),
    metadata: Joi.object({
      timestamp: Joi.date().iso(),
      userAgent: Joi.string().max(500),
      clientId: Joi.string().alphanum().max(64)
    }).optional()
  }),

  crmSearch: Joi.object({
    searchType: Joi.string()
      .valid('contact', 'opportunity', 'pipeline')
      .required(),
    searchValue: Joi.string()
      .min(1)
      .max(100)
      .pattern(/^[a-zA-Z0-9\s@.-]+$/)
      .required(),
    maxResults: Joi.number()
      .integer()
      .min(1)
      .max(50)
      .default(20)
  })
};

function validateRequest(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    
    if (error) {
      auditLogger.warn('Request validation failed', {
        error: error.details,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path
      });
      
      return res.status(400).json({
        error: 'Invalid request',
        details: error.details.map(d => d.message)
      });
    }
    
    req.validatedBody = value;
    next();
  };
}
```

### API Response Security

```javascript
// Response filtering and sanitization
class ResponseSecurity {
  static filterSensitiveData(data) {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sensitiveFields = [
      'api_key', 'password', 'secret', 'token',
      'ssn', 'credit_card', 'bank_account'
    ];

    const filtered = { ...data };

    // Remove sensitive fields
    sensitiveFields.forEach(field => {
      delete filtered[field];
    });

    // Recursively filter nested objects
    Object.keys(filtered).forEach(key => {
      if (typeof filtered[key] === 'object') {
        filtered[key] = this.filterSensitiveData(filtered[key]);
      }
    });

    return filtered;
  }

  static sanitizeErrorMessage(error) {
    // Prevent information disclosure through error messages
    if (process.env.NODE_ENV === 'production') {
      const safeMessages = {
        'database': 'Database operation failed',
        'api': 'External service unavailable',
        'auth': 'Authentication failed',
        'permission': 'Access denied'
      };

      for (const [type, message] of Object.entries(safeMessages)) {
        if (error.message.toLowerCase().includes(type)) {
          return message;
        }
      }

      return 'An error occurred';
    }

    return error.message; // Full error in development
  }
}
```

## Network Security

### Firewall Configuration

```bash
#!/bin/bash
# Production firewall rules

# Clear existing rules
iptables -F
iptables -X
iptables -t nat -F
iptables -t nat -X

# Default policies
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT

# Allow loopback
iptables -A INPUT -i lo -j ACCEPT
iptables -A OUTPUT -o lo -j ACCEPT

# Allow established connections
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# SSH access (restrict to specific IPs)
iptables -A INPUT -p tcp --dport 22 -s 10.0.0.0/8 -j ACCEPT
iptables -A INPUT -p tcp --dport 22 -s 172.16.0.0/12 -j ACCEPT

# HTTPS traffic
iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# HTTP redirect (redirect to HTTPS)
iptables -A INPUT -p tcp --dport 80 -j ACCEPT

# Application port (internal only)
iptables -A INPUT -p tcp --dport 3000 -s 127.0.0.1 -j ACCEPT

# Rate limiting for HTTP/HTTPS
iptables -A INPUT -p tcp --dport 80 -m limit --limit 25/minute --limit-burst 100 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -m limit --limit 25/minute --limit-burst 100 -j ACCEPT

# Log dropped packets
iptables -A INPUT -j LOG --log-prefix "DROPPED: "
iptables -A INPUT -j DROP

# Save rules
iptables-save > /etc/iptables/rules.v4
```

### Network Monitoring

```javascript
// Network security monitoring
const os = require('os');
const fs = require('fs');

class NetworkMonitor {
  constructor() {
    this.suspiciousPatterns = [
      /sqlmap/i,
      /nikto/i,
      /burpsuite/i,
      /owasp/i,
      /<script>/i,
      /union.*select/i,
      /drop.*table/i
    ];
  }

  analyzeRequest(req) {
    const suspicious = {
      score: 0,
      reasons: []
    };

    // Check User-Agent
    const userAgent = req.get('User-Agent') || '';
    this.suspiciousPatterns.forEach(pattern => {
      if (pattern.test(userAgent)) {
        suspicious.score += 10;
        suspicious.reasons.push(`Suspicious User-Agent: ${pattern}`);
      }
    });

    // Check for rapid requests from same IP
    const ip = req.ip;
    const requestRate = this.getRequestRate(ip);
    if (requestRate > 100) { // More than 100 requests per minute
      suspicious.score += 20;
      suspicious.reasons.push(`High request rate: ${requestRate}/min`);
    }

    // Check request body for injection patterns
    const body = JSON.stringify(req.body || {});
    this.suspiciousPatterns.forEach(pattern => {
      if (pattern.test(body)) {
        suspicious.score += 15;
        suspicious.reasons.push(`Suspicious request body: ${pattern}`);
      }
    });

    // Check for known malicious IPs
    if (this.isKnownMaliciousIP(ip)) {
      suspicious.score += 50;
      suspicious.reasons.push('Known malicious IP');
    }

    return suspicious;
  }

  getRequestRate(ip) {
    // Implementation depends on your rate tracking mechanism
    // This is a simplified version
    const key = `requests:${ip}:${Math.floor(Date.now() / 60000)}`;
    // Return count from Redis or memory store
    return 0; // Placeholder
  }

  isKnownMaliciousIP(ip) {
    // Check against threat intelligence feeds
    // Implementation depends on your threat intel sources
    return false; // Placeholder
  }
}
```

## Compliance Framework

### GDPR Compliance

```javascript
// GDPR compliance implementation
class GDPRCompliance {
  constructor() {
    this.dataRetentionPeriods = {
      'customer_data': 7 * 365 * 24 * 60 * 60 * 1000, // 7 years
      'marketing_data': 3 * 365 * 24 * 60 * 60 * 1000, // 3 years
      'log_data': 1 * 365 * 24 * 60 * 60 * 1000, // 1 year
      'session_data': 30 * 24 * 60 * 60 * 1000 // 30 days
    };
  }

  async handleDataSubjectRequest(requestType, subjectId, details) {
    auditLogger.info('GDPR request received', {
      requestType,
      subjectId,
      timestamp: new Date().toISOString(),
      details: this.sanitizeAuditData(details)
    });

    switch (requestType) {
      case 'access':
        return await this.handleAccessRequest(subjectId);
      case 'portability':
        return await this.handlePortabilityRequest(subjectId);
      case 'rectification':
        return await this.handleRectificationRequest(subjectId, details);
      case 'erasure':
        return await this.handleErasureRequest(subjectId);
      case 'restriction':
        return await this.handleRestrictionRequest(subjectId);
      default:
        throw new Error('Unknown request type');
    }
  }

  async handleAccessRequest(subjectId) {
    // Collect all data associated with the subject
    const customerData = await this.getCustomerData(subjectId);
    const interactionData = await this.getInteractionData(subjectId);
    const consentData = await this.getConsentData(subjectId);

    return {
      subjectId,
      requestType: 'access',
      timestamp: new Date().toISOString(),
      data: {
        customer: customerData,
        interactions: interactionData,
        consents: consentData
      }
    };
  }

  async handleErasureRequest(subjectId) {
    // Implement right to be forgotten
    const deletionPlan = [
      () => this.deleteCustomerRecords(subjectId),
      () => this.anonymizeInteractionData(subjectId),
      () => this.removeFromCRMSystem(subjectId),
      () => this.updateConsentRecords(subjectId, 'withdrawn')
    ];

    const results = [];
    for (const step of deletionPlan) {
      try {
        const result = await step();
        results.push({ success: true, result });
      } catch (error) {
        results.push({ success: false, error: error.message });
      }
    }

    return {
      subjectId,
      requestType: 'erasure',
      timestamp: new Date().toISOString(),
      results
    };
  }

  async scheduledDataRetention() {
    // Automated data retention based on GDPR requirements
    const now = Date.now();

    for (const [dataType, retentionPeriod] of Object.entries(this.dataRetentionPeriods)) {
      const cutoffDate = new Date(now - retentionPeriod);
      
      auditLogger.info('Starting data retention cleanup', {
        dataType,
        cutoffDate: cutoffDate.toISOString()
      });

      try {
        const deletedRecords = await this.deleteExpiredData(dataType, cutoffDate);
        
        auditLogger.info('Data retention cleanup completed', {
          dataType,
          deletedRecords,
          cutoffDate: cutoffDate.toISOString()
        });
      } catch (error) {
        auditLogger.error('Data retention cleanup failed', {
          dataType,
          error: error.message
        });
      }
    }
  }
}
```

### SOC 2 Compliance

```javascript
// SOC 2 compliance controls
class SOC2Controls {
  // Trust Service Criteria implementation

  // Security (Common Criteria)
  async implementSecurityControls() {
    return {
      accessControls: await this.verifyAccessControls(),
      logicalAccess: await this.verifyLogicalAccess(),
      networkSecurity: await this.verifyNetworkSecurity(),
      dataTransmission: await this.verifyDataTransmission()
    };
  }

  // Availability
  async implementAvailabilityControls() {
    return {
      systemMonitoring: await this.verifySystemMonitoring(),
      incidentResponse: await this.verifyIncidentResponse(),
      changeManagement: await this.verifyChangeManagement(),
      backupProcedures: await this.verifyBackupProcedures()
    };
  }

  // Processing Integrity
  async implementProcessingIntegrityControls() {
    return {
      dataValidation: await this.verifyDataValidation(),
      errorHandling: await this.verifyErrorHandling(),
      dataProcessing: await this.verifyDataProcessing()
    };
  }

  // Confidentiality
  async implementConfidentialityControls() {
    return {
      dataClassification: await this.verifyDataClassification(),
      encryptionControls: await this.verifyEncryptionControls(),
      accessRestrictions: await this.verifyAccessRestrictions()
    };
  }

  // Privacy
  async implementPrivacyControls() {
    return {
      consentManagement: await this.verifyConsentManagement(),
      dataMinimization: await this.verifyDataMinimization(),
      purposeLimitation: await this.verifyPurposeLimitation()
    };
  }
}
```

## Security Monitoring

### Real-time Monitoring

```javascript
// Security event monitoring
const EventEmitter = require('events');

class SecurityMonitor extends EventEmitter {
  constructor() {
    super();
    this.alertThresholds = {
      failedLogins: 5,
      suspiciousRequests: 10,
      dataExfiltration: 1,
      privilegeEscalation: 1
    };
    this.setupAlerts();
  }

  setupAlerts() {
    this.on('securityEvent', this.handleSecurityEvent.bind(this));
    this.on('criticalAlert', this.handleCriticalAlert.bind(this));
  }

  logSecurityEvent(eventType, data) {
    const event = {
      timestamp: new Date().toISOString(),
      type: eventType,
      severity: this.calculateSeverity(eventType, data),
      data: this.sanitizeEventData(data)
    };

    auditLogger.warn('Security event detected', event);
    this.emit('securityEvent', event);

    if (event.severity === 'critical') {
      this.emit('criticalAlert', event);
    }
  }

  calculateSeverity(eventType, data) {
    const severityMap = {
      'failed_login': 'low',
      'suspicious_request': 'medium',
      'data_exfiltration': 'critical',
      'privilege_escalation': 'critical',
      'injection_attempt': 'high',
      'unauthorized_access': 'high'
    };

    let baseSeverity = severityMap[eventType] || 'medium';

    // Escalate based on frequency
    if (data.frequency > this.alertThresholds[eventType]) {
      const escalationMap = {
        'low': 'medium',
        'medium': 'high',
        'high': 'critical'
      };
      baseSeverity = escalationMap[baseSeverity] || 'critical';
    }

    return baseSeverity;
  }

  async handleSecurityEvent(event) {
    // Log to SIEM system
    await this.sendToSIEM(event);

    // Update threat intelligence
    await this.updateThreatIntelligence(event);

    // Auto-remediation for specific events
    if (event.type === 'suspicious_request' && event.severity === 'high') {
      await this.temporaryIPBlock(event.data.sourceIP);
    }
  }

  async handleCriticalAlert(event) {
    // Immediate notification
    await this.sendImmediateAlert(event);

    // Auto-response measures
    if (event.type === 'data_exfiltration') {
      await this.initiateIncidentResponse(event);
    }
  }
}
```

### Metrics & Dashboards

```javascript
// Security metrics collection
const prometheus = require('prom-client');

// Define security metrics
const securityMetrics = {
  authFailures: new prometheus.Counter({
    name: 'security_auth_failures_total',
    help: 'Total authentication failures',
    labelNames: ['reason', 'source_ip']
  }),

  crmRequests: new prometheus.Histogram({
    name: 'crm_request_duration_seconds',
    help: 'CRM request duration',
    labelNames: ['operation', 'status'],
    buckets: [0.1, 0.5, 1, 2, 5, 10]
  }),

  suspiciousEvents: new prometheus.Counter({
    name: 'security_suspicious_events_total',
    help: 'Total suspicious security events',
    labelNames: ['event_type', 'severity']
  }),

  dataAccess: new prometheus.Counter({
    name: 'security_data_access_total',
    help: 'Total data access events',
    labelNames: ['data_type', 'user_role', 'operation']
  })
};

// Middleware to collect metrics
function securityMetricsMiddleware(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    
    // Record request metrics
    if (req.path.includes('/api/chat') && req.body?.message?.includes('crm')) {
      securityMetrics.crmRequests
        .labels(req.method, res.statusCode < 400 ? 'success' : 'error')
        .observe(duration);
    }

    // Record authentication metrics
    if (res.statusCode === 401) {
      securityMetrics.authFailures
        .labels('invalid_credentials', req.ip)
        .inc();
    }

    // Record data access
    if (req.user && req.path.includes('/api/')) {
      securityMetrics.dataAccess
        .labels('crm_data', req.user.role, req.method)
        .inc();
    }
  });
  
  next();
}
```

## Incident Response

### Incident Response Plan

```javascript
// Automated incident response
class IncidentResponse {
  constructor() {
    this.severityLevels = {
      LOW: { response_time: '4 hours', escalation_time: '24 hours' },
      MEDIUM: { response_time: '2 hours', escalation_time: '8 hours' },
      HIGH: { response_time: '1 hour', escalation_time: '4 hours' },
      CRITICAL: { response_time: '15 minutes', escalation_time: '1 hour' }
    };
  }

  async handleIncident(incident) {
    const incidentId = this.generateIncidentId();
    
    auditLogger.error('Security incident detected', {
      incidentId,
      type: incident.type,
      severity: incident.severity,
      timestamp: new Date().toISOString(),
      details: incident.details
    });

    // Immediate containment for critical incidents
    if (incident.severity === 'CRITICAL') {
      await this.immediateContainment(incident);
    }

    // Create incident record
    await this.createIncidentRecord(incidentId, incident);

    // Notify stakeholders
    await this.notifyStakeholders(incident);

    // Start investigation
    await this.startInvestigation(incidentId, incident);

    return incidentId;
  }

  async immediateContainment(incident) {
    switch (incident.type) {
      case 'data_breach':
        await this.isolateAffectedSystems();
        await this.revokeCompromisedCredentials();
        break;
        
      case 'malware_detected':
        await this.quarantineAffectedSystems();
        await this.blockMaliciousIPs();
        break;
        
      case 'privilege_escalation':
        await this.suspendAffectedAccounts();
        await this.auditPrivilegedAccess();
        break;
        
      case 'ddos_attack':
        await this.activateDDoSProtection();
        await this.rateThrottleTraffic();
        break;
    }
  }

  async createIncidentRecord(incidentId, incident) {
    const record = {
      id: incidentId,
      type: incident.type,
      severity: incident.severity,
      status: 'open',
      created_at: new Date().toISOString(),
      created_by: 'system',
      description: incident.description,
      affected_systems: incident.affected_systems || [],
      response_actions: [],
      timeline: []
    };

    // Store in incident management system
    await this.storeIncidentRecord(record);
  }
}
```

### Forensics & Investigation

```javascript
// Digital forensics toolkit
class DigitalForensics {
  constructor() {
    this.evidenceChain = [];
  }

  async collectEvidence(incidentId, sources) {
    const evidence = {
      incidentId,
      collected_at: new Date().toISOString(),
      collector: 'automated_system',
      sources: {}
    };

    for (const source of sources) {
      switch (source.type) {
        case 'logs':
          evidence.sources.logs = await this.collectLogs(source);
          break;
        case 'memory':
          evidence.sources.memory = await this.collectMemoryDump(source);
          break;
        case 'network':
          evidence.sources.network = await this.collectNetworkTraffic(source);
          break;
        case 'database':
          evidence.sources.database = await this.collectDatabaseState(source);
          break;
      }
    }

    // Create hash for evidence integrity
    evidence.hash = this.createEvidenceHash(evidence);
    
    // Add to chain of custody
    this.evidenceChain.push({
      evidence_id: evidence.hash,
      timestamp: evidence.collected_at,
      action: 'collected',
      officer: 'system'
    });

    return evidence;
  }

  async collectLogs(source) {
    const timeRange = source.timeRange || { 
      start: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
      end: new Date() 
    };

    const logs = {
      application: await this.getApplicationLogs(timeRange),
      security: await this.getSecurityLogs(timeRange),
      system: await this.getSystemLogs(timeRange),
      access: await this.getAccessLogs(timeRange)
    };

    return logs;
  }

  createEvidenceHash(evidence) {
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(evidence, null, 0));
    return hash.digest('hex');
  }
}
```

This comprehensive security and compliance guide provides the framework for maintaining robust security posture for the CRM integration system. Regular security assessments, penetration testing, and compliance audits should be conducted to ensure ongoing effectiveness.