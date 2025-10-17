/**
 * Enhanced WebinarFuel-Keap Bridge Code Generator v2.0
 * Eliminates need for rendered HTML and provides bulletproof form submission
 */

class WFKeapBridgeGenerator {
  constructor() {
    this.config = {
      wfTargetId: '',
      keapFormId: '',
      keapConsentFieldId: '',
      wfButtonSelector: '',
      consentText: '',
      companyName: '',
      maxRetries: 3,
      timeoutMs: 1000
    };
  }

  /**
   * Extract WebinarFuel configuration from embed code (no rendered HTML needed)
   */
  parseWebinarFuelCode(wfCode) {
    const config = {};

    // Extract WF target ID from div class
    const targetMatch = wfCode.match(/wf_target_([A-Za-z0-9_]+)/);
    if (targetMatch) {
      config.wfTargetId = targetMatch[1];
    }

    // Extract WF ID from script
    const idMatch = wfCode.match(/id:\s*['"]([^'"]+)['"]/);
    if (idMatch) {
      config.wfId = idMatch[1];
      // Use the ID as target ID if not found above
      if (!config.wfTargetId) {
        config.wfTargetId = idMatch[1];
      }
    }

    // We'll use dynamic button detection - no hardcoded selectors needed
    config.wfButtonSelector = null;

    console.log('Parsed WebinarFuel config:', config);
    return config;
  }

  /**
   * Extract Keap/Infusionsoft configuration from form code
   */
  parseKeapCode(keapCode) {
    const config = {};

    // Extract form ID
    const formIdMatch = keapCode.match(/id="(inf_form_[^"]+)"/);
    if (formIdMatch) {
      config.keapFormId = formIdMatch[1];
    }

    // Extract action URL for domain info
    const actionMatch = keapCode.match(/action="([^"]+)"/);
    if (actionMatch) {
      config.keapActionUrl = actionMatch[1];
      // Extract subdomain for tracking scripts
      const domainMatch = actionMatch[1].match(/https?:\/\/([^.]+)\.infusionsoft\./);
      if (domainMatch) {
        config.keapSubdomain = domainMatch[1];
      }
    }

    // Extract SMS consent field information - more comprehensive approach
    // Look for checkbox inputs that likely relate to SMS/text messaging consent
    const consentPatterns = [
      // Pattern 1: inf_option_ fields (most common)
      /(<input[^>]*id="(inf_option_[^"]*)"[^>]*>)/i,
      // Pattern 2: Other consent checkbox patterns
      /(<input[^>]*name="([^"]*(?:consent|sms|text|message)[^"]*)"[^>]*type="checkbox"[^>]*>)/i,
      /(<input[^>]*type="checkbox"[^>]*name="([^"]*(?:consent|sms|text|message)[^"]*)"[^>]*>)/i
    ];

    let consentFieldInfo = null;
    for (const pattern of consentPatterns) {
      const match = keapCode.match(pattern);
      if (match) {
        const fullTag = match[1];
        const fieldId = match[2];
        
        // Extract additional attributes from the full input tag
        const nameMatch = fullTag.match(/name="([^"]*)"/);
        const valueMatch = fullTag.match(/value="([^"]*)"/);
        const typeMatch = fullTag.match(/type="([^"]*)"/);
        
        consentFieldInfo = {
          id: fieldId,
          name: nameMatch ? nameMatch[1] : fieldId,
          value: valueMatch ? valueMatch[1] : 'on',
          type: typeMatch ? typeMatch[1] : 'checkbox',
          fullTag: fullTag
        };
        
        // Set the main field ID for backward compatibility 
        config.keapConsentFieldId = fieldId;
        config.consentFieldInfo = consentFieldInfo;
        break;
      }
    }

    // Extract consent text from label
    const consentTextMatch = keapCode.match(/<label[^>]*for="inf_option_[^"]*"[^>]*>(.*?)<\/label>/s);
    if (consentTextMatch) {
      const cleanText = consentTextMatch[1]
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
      config.consentText = cleanText;
      
      // Try to extract company name
      const companyMatch = cleanText.match(/from\s+([^.]+?)(?:\s+at\s+the\s+mobile|\.|$)/i);
      if (companyMatch) {
        config.companyName = companyMatch[1].trim();
      }
    }

        // Extract form name for tracking
    const formNameMatch = keapCode.match(/name="inf_form_name"[^>]*value="([^"]+)"/);;
    if (formNameMatch) {
      config.formName = formNameMatch[1];
    }

    // Extract existing custom tracking fields
    const customFieldMatches = keapCode.match(/name="(inf_custom_[^"]+)"/g);
    config.existingCustomFields = [];
    if (customFieldMatches) {
      config.existingCustomFields = customFieldMatches.map(match => {
        const fieldMatch = match.match(/name="([^"]+)"/);
        return fieldMatch ? fieldMatch[1] : null;
      }).filter(Boolean);
    }

    console.log('Parsed Keap config:', config);
    return config;
  }

  /**
   * Merge configurations and apply defaults
   */
  mergeConfigs(wfConfig, keapConfig, userConfig = {}) {
    return {
      wfTargetId: wfConfig.wfTargetId || wfConfig.wfId || '',
      keapFormId: keapConfig.keapFormId || '',
      keapConsentFieldId: keapConfig.keapConsentFieldId || '',
      consentFieldInfo: keapConfig.consentFieldInfo || null,
      keapSubdomain: keapConfig.keapSubdomain || '',
      keapActionUrl: keapConfig.keapActionUrl || '',
      wfButtonSelector: userConfig.wfButtonSelector || null, // Dynamic detection
      consentText: keapConfig.consentText || 'By checking this box, I agree to receive text messages.',
      companyName: keapConfig.companyName || 'Our Company',
      formName: keapConfig.formName || 'Web Form',
      existingCustomFields: keapConfig.existingCustomFields || [],
      maxRetries: userConfig.maxRetries || 3,
      timeoutMs: userConfig.timeoutMs || 1000,
      ...userConfig
    };
  }

  /**
   * Generate the complete bridge code
   */
  generateBridgeCode(wfCode, keapCode, userConfig = {}) {
    const wfConfig = this.parseWebinarFuelCode(wfCode);
    const keapConfig = this.parseKeapCode(keapCode);
    const config = this.mergeConfigs(wfConfig, keapConfig, userConfig);

    // Validation
    const errors = [];
    if (!config.wfTargetId) errors.push('WebinarFuel target ID not found');
    if (!config.keapFormId) errors.push('Keap form ID not found');
    if (!config.keapConsentFieldId) errors.push('Keap consent field ID not found');

    if (errors.length > 0) {
      throw new Error('Configuration errors: ' + errors.join(', '));
    }

    return this.generateBulletproofCode(config);
  }

  /**
   * Validate configuration and return array of errors
   */
  validateConfig(config) {
    const errors = [];
    if (!config.wfTargetId) errors.push('WebinarFuel target ID not found');
    if (!config.keapFormId) errors.push('Keap form ID not found');
    if (!config.keapConsentFieldId) errors.push('Keap consent field ID not found');
    return errors;
  }

  /**
   * Generate the bulletproof bridge JavaScript code
   */
  generateBulletproofCode(config) {
    return `/**
 * WebinarFuel <-> Keap/Infusionsoft Bridge (Bulletproof v2.0)
 * Generated on: ${new Date().toISOString()}
 * Configuration: ${config.companyName} - ${config.formName}
 * Features: Dynamic button detection, bulletproof submission, SMS consent
 */

document.addEventListener('DOMContentLoaded', function () {
  // ========== DEBUG MODE DETECTION ==========
  const urlParams = new URLSearchParams(window.location.search);
  const debugFromUrl = urlParams.get('debug') === 'true';
  const debugFromStorage = localStorage.getItem('wf_bridge_debug') === 'true';
  const debugMode = debugFromUrl || debugFromStorage;
  
  // Set debug mode in localStorage for persistence
  if (debugFromUrl && !debugFromStorage) {
    localStorage.setItem('wf_bridge_debug', 'true');
    console.log('%c[WF Bridge] 🐛 DEBUG MODE ENABLED via URL parameter', 'color: #ff6b35; font-weight: bold; font-size: 14px;');
  }
  
  console.log('[WF Bridge] Bulletproof bridge v2.0 loaded for ${config.companyName}');
  if (debugMode) {
    console.log('%c[WF Bridge] 🔍 DEBUG MODE ACTIVE', 'color: #ff6b35; font-weight: bold;');
    console.log('[WF Bridge Debug] Bridge initialization started at:', new Date().toISOString());
  }

  // ========== CONFIGURATION ==========
  const CONFIG = ${JSON.stringify(config, null, 4)};
  CONFIG.debugMode = debugMode;

  // Enhanced debug logging with styling and timestamps
  const debug = (...args) => {
    if (CONFIG.debugMode) {
      const timestamp = new Date().toLocaleTimeString();
      console.log('%c[WF Bridge Debug ' + timestamp + ']', 'color: #0066cc; font-weight: bold;', ...args);
    }
  };
  
  const debugError = (...args) => {
    if (CONFIG.debugMode) {
      const timestamp = new Date().toLocaleTimeString();
      console.error('%c[WF Bridge Debug ERROR ' + timestamp + ']', 'color: #ff0000; font-weight: bold;', ...args);
    }
  };
  
  const debugSuccess = (...args) => {
    if (CONFIG.debugMode) {
      const timestamp = new Date().toLocaleTimeString();
      console.log('%c[WF Bridge Debug SUCCESS ' + timestamp + ']', 'color: #00aa00; font-weight: bold;', ...args);
    }
  };
  
  // Log configuration in debug mode
  if (CONFIG.debugMode) {
    debug('Configuration loaded:', CONFIG);
    debug('Page URL:', window.location.href);
    debug('Document ready state:', document.readyState);
    debug('User agent:', navigator.userAgent);
  }

  // ========== ENHANCED UTILITIES ==========
  const utils = {
    qs: (selector, root = document) => root.querySelector(selector),
    qsa: (selector, root = document) => root.querySelectorAll(selector),
    
    getUrlParam: (key) => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const value = urlParams.get(key);
        return value && value.trim() !== '' && value !== 'null' ? decodeURIComponent(value) : null;
      } catch (e) {
        console.warn('[WF Bridge] Error getting URL param:', key, e);
        return null;
      }
    },

    setHiddenField: (name, value) => {
      const field = utils.qs(\`input[name="\${name}"]\`);
      if (field) {
        field.value = value != null ? String(value) : 'null';
        debug(\`Set hidden field \${name} = \${field.value}\`);
        return true;
      }
      console.warn('[WF Bridge] Hidden field not found:', name);
      return false;
    },

    parseName: (fullName) => {
      const parts = (fullName || '').trim().split(/\\s+/);
      return {
        first: parts.shift() || '',
        last: parts.join(' ')
      };
    },

    normalizePhone: (rawPhone) => {
      if (!rawPhone) return '';
      
      const stripped = rawPhone.replace(/[^\\d+]/g, '');
      const digitsOnly = stripped.replace(/\\D/g, '');
      
      if (!stripped) return '';
      if (stripped.startsWith('+')) return stripped;
      if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) return '+' + digitsOnly;
      if (digitsOnly.length === 10) return '+1' + digitsOnly;
      return stripped;
    },

    validateEmail: (email) => {
      return email && /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email);
    },

    // Enhanced element detection - works with ANY WebinarFuel setup
    findWebinarFuelElements: () => {
      debug('Starting dynamic WebinarFuel element detection');
      
      // Multiple strategies for finding elements
      const strategies = [
        // Strategy 1: Look for WF-specific classes and patterns
        () => ({
          button: utils.qs('.wf_button') || 
                  utils.qs('button[class*="wf_"]') ||
                  utils.qs('[class*="wf_element"] button') ||
                  utils.qs('[id*="wf_element"] button'),
          nameField: utils.qs('input[name="name"]') || utils.qs('input[type="name"]'),
          emailField: utils.qs('input[name="email"]') || utils.qs('input[type="email"]'),
          phoneField: utils.qs('input[name="tel"]') || utils.qs('input[type="tel"]') || utils.qs('input[name="phone"]')
        }),
        
        // Strategy 2: Look within WF target container
        () => {
          const wfContainer = utils.qs(\`.wf_target_\${CONFIG.wfTargetId}\`) || 
                             utils.qs('[class*="wf_target"]') ||
                             utils.qs('[class*="wf_layout"]');
          
          if (!wfContainer) return null;
          
          return {
            button: utils.qs('button', wfContainer),
            nameField: utils.qs('input[name="name"], input[type="name"]', wfContainer),
            emailField: utils.qs('input[name="email"], input[type="email"]', wfContainer),
            phoneField: utils.qs('input[name="tel"], input[type="tel"], input[name="phone"]', wfContainer)
          };
        },
        
        // Strategy 3: Generic form detection with button
        () => {
          const buttons = utils.qsa('button, input[type="submit"]');
          for (const button of buttons) {
            const form = button.closest('form') || button.closest('[class*="form"]') || button.closest('div');
            if (form) {
              const nameField = utils.qs('input[name="name"], input[type="name"]', form);
              const emailField = utils.qs('input[name="email"], input[type="email"]', form);
              
              if (nameField && emailField) {
                return {
                  button,
                  nameField,
                  emailField,
                  phoneField: utils.qs('input[name="tel"], input[type="tel"], input[name="phone"]', form)
                };
              }
            }
          }
          return null;
        }
      ];

      // Try each strategy until we find elements
      for (let i = 0; i < strategies.length; i++) {
        debug('Trying detection strategy ' + (i + 1));
        const result = strategies[i]();
        
        if (result && result.button && result.nameField && result.emailField) {
          debug('Strategy ' + (i + 1) + ' successful:', {
            button: result.button.className || result.button.id,
            nameField: result.nameField.name || result.nameField.type,
            emailField: result.emailField.name || result.emailField.type,
            phoneField: result.phoneField ? (result.phoneField.name || result.phoneField.type) : 'none'
          });
          return result;
        }
      }
      
      debug('All detection strategies failed');
      return null;
    },

    // Wait for elements with progressive timeout
    waitForElements: (callback, maxAttempts = 120, interval = 250) => {
      let attempts = 0;
      
      const check = () => {
        attempts++;
        debug(\`Element detection attempt \${attempts}/\${maxAttempts}\`);
        
        const elements = utils.findWebinarFuelElements();
        
        if (elements) {
          debug('Elements found, initializing bridge');
          return callback(elements);
        }
        
        if (attempts >= maxAttempts) {
          console.error('[WF Bridge] WebinarFuel elements not found after', maxAttempts, 'attempts');
          console.error('[WF Bridge] Available elements:', {
            buttons: utils.qsa('button').length,
            inputs: utils.qsa('input').length,
            wfElements: utils.qsa('[class*="wf_"]').length
          });
          return;
        }
        
        setTimeout(check, interval);
      };
      
      check();
    }
  };

  // ========== ENHANCED UTM AND TRACKING CAPTURE ==========
  const trackingData = {
    // UTM parameters
    utm_source: utils.getUrlParam('utm_source'),
    utm_medium: utils.getUrlParam('utm_medium'),
    utm_campaign: utils.getUrlParam('utm_campaign'),
    utm_term: utils.getUrlParam('utm_term'),
    utm_content: utils.getUrlParam('utm_content'),
    utm_id: utils.getUrlParam('utm_id'),
    
    // Click IDs
    fbclid: utils.getUrlParam('fbclid'),
    gclid: utils.getUrlParam('gclid'),
    msclkid: utils.getUrlParam('msclkid'),
    ttclid: utils.getUrlParam('ttclid'),
    
    // WebinarFuel tracking
    _wf_cid: utils.getUrlParam('_wf_cid'),
    
    // Additional tracking
    referrer: document.referrer || window.location.href,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    
    // Session data
    sessionId: Math.random().toString(36).substr(2, 9),
    pageUrl: window.location.href
  };

  debug('Tracking data captured:', trackingData);

  // ========== ENHANCED SMS CONSENT INJECTION ==========
  function injectSMSConsent(button) {
    debug('📱 Starting SMS consent injection...');
    debug('Button element for injection:', button);
    debug('Button parent:', button.parentElement);
    
    if (utils.qs('#wf_sms_consent_wrap')) {
      debug('✅ SMS consent already exists - reusing existing checkbox');
      return utils.qs('#wf_sms_consent');
    }

    debug('🔍 SMS consent not found - will inject new checkbox');
    debug('Consent text to use:', CONFIG.consentText);
    debug('Company name:', CONFIG.companyName);
    
    // Find the best placement for the consent checkbox (after form fields, before button)
    const findOptimalPlacement = (button) => {
      debug('🔍 Finding optimal placement for consent checkbox...');
      
      // Strategy 1: Look for the immediate parent of the button
      let buttonParent = button.parentElement;
      debug('Button parent element:', buttonParent?.tagName, buttonParent?.className || 'no-class');
      
      // Strategy 2: Find form container that holds both fields and button
      let formContainer = button.closest('form') || 
                         button.closest('[class*="wf_form"]') || 
                         button.closest('[class*="wf_step"]') ||
                         button.closest('[class*="wf_layout"]') ||
                         button.closest('.wf_target');
      
      debug('Form container found:', formContainer?.tagName, formContainer?.className || 'no-class');
      
      // Always prioritize button placement for cleaner positioning
      debug('Using preferred placement: just before button');
      
      // Fallback: Insert before button
      debug('Using fallback: inserting before button');
      return {
        insertBefore: button,
        container: buttonParent || formContainer || document.body
      };
    };

    const placement = findOptimalPlacement(button);
    debug('🎯 Placement strategy: before-button (just above submit button)');

    debug('🛠️ Creating SMS consent checkbox...');
    const consentWrapper = document.createElement('div');
    consentWrapper.id = 'wf_sms_consent_wrap';
    consentWrapper.style.cssText = \`
      margin: 0;
      padding: 0 16px 16px 16px;
      font-family: Montserrat, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      color: #333;
      display: flex;
      gap: 8px;
      align-items: flex-start;
      line-height: 1.4;
      z-index: 1000;
      position: relative;
    \`;

    consentWrapper.innerHTML = \`
      <input id="wf_sms_consent" 
             type="checkbox" 
             style="width:16px;height:16px;margin-top:2px;flex-shrink:0;cursor:pointer;"
             aria-describedby="wf_sms_consent_label">
      <label id="wf_sms_consent_label" 
             for="wf_sms_consent" 
             style="line-height:1.35;cursor:pointer;user-select:none;">
        \${CONFIG.consentText}
      </label>
    \`;

    // Insert using optimal placement strategy
    debug('💾 Inserting consent wrapper into DOM...');
    
    if (placement.insertAfter) {
      debug('Insertion method: insertAfter last form field');
      debug('Target element:', placement.insertAfter.tagName, placement.insertAfter.className || 'no-class');
      debug('Target parent:', placement.insertAfter.parentElement?.tagName);
      
      // Insert after the target element - use the target's parent for insertion
      const targetParent = placement.insertAfter.parentElement;
      if (targetParent && placement.insertAfter.nextElementSibling) {
        targetParent.insertBefore(consentWrapper, placement.insertAfter.nextElementSibling);
        debug('✅ Inserted using insertBefore with nextSibling');
      } else if (targetParent) {
        targetParent.appendChild(consentWrapper);
        debug('✅ Inserted using appendChild to target parent');
      } else {
        // Fallback to container
        placement.container.appendChild(consentWrapper);
        debug('⚠️ Fallback: inserted using container appendChild');
      }
    } else if (placement.insertBefore) {
      debug('Insertion method: insertBefore button');
      debug('Target element:', placement.insertBefore.tagName, placement.insertBefore.className || 'no-class');
      debug('Target parent:', placement.insertBefore.parentElement?.tagName);
      
      // Insert before the button - use the button's parent for insertion
      const targetParent = placement.insertBefore.parentElement;
      if (targetParent) {
        targetParent.insertBefore(consentWrapper, placement.insertBefore);
        debug('✅ Inserted using target parent insertBefore');
      } else {
        // Fallback to container
        placement.container.insertBefore(consentWrapper, placement.insertBefore);
        debug('⚠️ Fallback: inserted using container insertBefore');
      }
    } else {
      debug('Insertion method: fallback append');
      placement.container.appendChild(consentWrapper);
    }
    
    debugSuccess('✅ SMS consent checkbox injected successfully!');
    debug('Wrapper ID:', consentWrapper.id);
    debug('Wrapper position in DOM:', consentWrapper.parentElement?.tagName);
    
    const consentCheckbox = utils.qs('#wf_sms_consent');
    if (consentCheckbox) {
      debugSuccess('✅ Consent checkbox found in DOM after injection');
      consentCheckbox.addEventListener('change', function() {
        debug('📱 SMS consent changed:', this.checked);
      });
    } else {
      debugError('❌ Consent checkbox NOT found after injection!');
    }

    return consentCheckbox;
  }

  // ========== ENHANCED WEBINAR FUEL FETCH INTERCEPTION ==========
  function setupFetchInterception(consentCheckbox) {
    const WF_ENDPOINT_PATTERNS = [
      /embed\\.webby\\.app/i,
      /webinarfuel\\.com/i,
      /d3pw37i36t41cq\\.cloudfront\\.net/i,
      /api\\.webinarfuel/i
    ];

    const originalFetch = window.fetch;
    
    window.fetch = async function(input, init) {
      try {
        const url = typeof input === 'string' ? input : (input && input.url) || '';
        const isWFEndpoint = WF_ENDPOINT_PATTERNS.some(pattern => pattern.test(url));
        
        debug('Fetch intercepted:', { url, isWFEndpoint, method: init?.method });
        
        if (isWFEndpoint && init && init.method && init.method.toUpperCase() === 'POST') {
          if (init.body && typeof init.body === 'string') {
            try {
              const payload = JSON.parse(init.body);
              
              // WebinarFuel phone handling: only send if SMS consent given
              if (payload && payload.viewer) {
                const hasConsent = consentCheckbox && consentCheckbox.checked;
                const hasPhone = payload.viewer.phone;
                
                if (hasPhone && !hasConsent) {
                  const originalPhone = payload.viewer.phone;
                  payload.viewer.phone = "";
                  debug('📵 WEBINARFUEL: Phone redacted (no SMS consent) -', originalPhone, '-> (empty)');
                  debug('📋 KEAP: Will still receive phone + consent status');
                  init = { ...init, body: JSON.stringify(payload) };
                } else if (hasPhone && hasConsent) {
                  debug('✅ WEBINARFUEL: Phone included (SMS consent given)');
                  debug('📋 KEAP: Will receive phone + consent=YES');
                } else {
                  debug('ℹ️ WEBINARFUEL: No phone to process');
                }
              }
            } catch (e) {
              debug('Non-JSON WebinarFuel payload, skipping phone redaction');
            }
          }
        }
      } catch (error) {
        debug('Fetch interception error:', error);
      }

      return originalFetch.apply(this, arguments);
    };

    debug('Fetch interception setup complete');
  }

  // ========== BULLETPROOF KEAP FORM SUBMISSION ==========
  function submitToKeap(formData, consentChecked) {
    return new Promise((resolve, reject) => {
      debug('Starting Keap submission:', { formData, consentChecked });
      
      const keapForm = utils.qs(\`#\${CONFIG.keapFormId}\`);
      const keapFrame = utils.qs('#inf_sink_iframe');

      if (!keapForm) {
        const error = new Error('Keap form not found: ' + CONFIG.keapFormId);
        debug('Keap form missing');
        reject(error);
        return;
      }

      // Populate form fields with validation
      const { first, last } = utils.parseName(formData.name);
      
      const fieldMappings = [
        { selector: '#inf_field_FirstName', value: first, name: 'First Name' },
        { selector: '#inf_field_LastName', value: last, name: 'Last Name' },
        { selector: '#inf_field_Email', value: formData.email, name: 'Email' },
        { selector: '#inf_field_Phone1', value: utils.normalizePhone(formData.phone), name: 'Phone' }
      ];

      fieldMappings.forEach(({ selector, value, name }) => {
        const field = utils.qs(selector);
        if (field) {
          field.value = value || '';
          debug(\`Set \${name}: \${field.value}\`);
        } else {
          debug(\`Field not found: \${selector} (\${name})\`);
        }
      });

      // Set SMS consent in Keap form with enhanced debugging using dynamic field info
      let keapConsentField = null;
      
      if (CONFIG.consentFieldInfo) {
        // Try to find by ID first, then by name
        keapConsentField = utils.qs(\`#\${CONFIG.consentFieldInfo.id}\`) || 
                          utils.qs(\`[name="\${CONFIG.consentFieldInfo.name}"]\`);
                          
        if (keapConsentField) {
          debug('📋 BEFORE setting Keap consent field:', {
            fieldId: CONFIG.consentFieldInfo.id,
            fieldName: CONFIG.consentFieldInfo.name,
            fieldValue: CONFIG.consentFieldInfo.value,
            currentChecked: keapConsentField.checked,
            currentValue: keapConsentField.value,
            willSetTo: consentChecked
          });
          
          // Set both checked state AND proper value for form submission
          keapConsentField.checked = consentChecked;
          if (consentChecked) {
            // When checked, ensure the field has the correct value for submission
            keapConsentField.value = CONFIG.consentFieldInfo.value;
          }
          
          debug('📋 AFTER setting Keap consent field:', {
            fieldId: CONFIG.consentFieldInfo.id,
            fieldName: CONFIG.consentFieldInfo.name,
            actualChecked: keapConsentField.checked,
            actualValue: keapConsentField.value,
            expectedChecked: consentChecked,
            expectedValue: CONFIG.consentFieldInfo.value,
            success: keapConsentField.checked === consentChecked
          });
          
          // Double-check by re-querying the field
          const verifyField = utils.qs(\`#\${CONFIG.consentFieldInfo.id}\`) || 
                             utils.qs(\`[name="\${CONFIG.consentFieldInfo.name}"]\`);
          debug('📋 VERIFICATION: Re-queried Keap consent field:', {
            exists: !!verifyField,
            checked: verifyField ? verifyField.checked : 'N/A',
            value: verifyField ? verifyField.value : 'N/A',
            name: verifyField ? verifyField.name : 'N/A'
          });
        } else {
          debugError('📋 Keap consent field not found using dynamic info:', CONFIG.consentFieldInfo);
        }
      } else {
        // Fallback to old method
        keapConsentField = utils.qs(\`#\${CONFIG.keapConsentFieldId}\`);
        if (keapConsentField) {
          keapConsentField.checked = consentChecked;
          debug('📋 Used fallback method to set consent field');
        } else {
          debugError('📋 Keap consent field not found:', CONFIG.keapConsentFieldId);
        }
      }
      
      if (!keapConsentField) {
        debugError('📋 Available checkboxes in form:', Array.from(utils.qsa('input[type="checkbox"]')).map(cb => ({
          id: cb.id,
          name: cb.name,
          value: cb.value,
          type: cb.type
        })));
      }

      // Populate only the tracking fields that exist in this Keap form
      const allTrackingData = {
        'inf_custom_GaSource': trackingData.utm_source,
        'inf_custom_GaMedium': trackingData.utm_medium,
        'inf_custom_GaCampaign': trackingData.utm_campaign,
        'inf_custom_GaTerm': trackingData.utm_term,
        'inf_custom_GaContent': trackingData.utm_content,
        'inf_custom_GaCampaignID': trackingData.utm_id,
        'inf_custom_GaReferurl': trackingData.referrer,
        'inf_custom_fbclid': trackingData.fbclid,
        'inf_custom_gclid': trackingData.gclid,
        'inf_custom_msclkid': trackingData.msclkid,
        'inf_custom_ttclid': trackingData.ttclid,
        'inf_custom_SessionId': trackingData.sessionId,
        'inf_custom_PageUrl': trackingData.pageUrl,
        'inf_custom_Timestamp': trackingData.timestamp
      };

      // Only set fields that actually exist in the Keap form
      const existingFields = ${JSON.stringify(config.existingCustomFields || [])};
      existingFields.forEach(fieldName => {
        const value = allTrackingData[fieldName];
        if (value !== undefined) {
          utils.setHiddenField(fieldName, value || 'null');
        } else {
          debug('No tracking data for field:', fieldName);
          utils.setHiddenField(fieldName, 'null');
        }
      });
      
      debug('Available custom fields in form:', existingFields);
      debug('Populated tracking fields:', existingFields.length);

      // Enhanced submission tracking
      let submitted = false;
      let acknowledged = false;
      let submissionStartTime = Date.now();

      const markSuccess = (method) => {
        if (!submitted) {
          submitted = true;
          const duration = Date.now() - submissionStartTime;
          debug(\`Keap submission successful via \${method} (took \${duration}ms)\`);
          resolve(true);
        }
      };

      const markFailure = (error, method) => {
        if (!submitted) {
          submitted = true;
          const duration = Date.now() - submissionStartTime;
          debug(\`Keap submission failed via \${method} after \${duration}ms:\`, error);
          reject(error);
        }
      };

      // Enhanced iframe load detection
      if (keapFrame) {
        const onFrameLoad = () => {
          acknowledged = true;
          markSuccess('iframe');
          cleanup();
        };
        
        keapFrame.addEventListener('load', onFrameLoad, { once: true });
        keapFrame.addEventListener('error', (e) => {
          debug('Iframe error:', e);
          if (!acknowledged && !submitted) {
            sendBackup('iframe-error');
          }
        }, { once: true });
      }

      // Comprehensive cleanup
      const cleanup = () => {
        if (keapFrame) {
          keapFrame.removeEventListener('load', () => {});
          keapFrame.removeEventListener('error', () => {});
        }
        document.removeEventListener('visibilitychange', onVisibilityChange);
        window.removeEventListener('beforeunload', onBeforeUnload);
        window.removeEventListener('pagehide', onPageHide);
        clearTimeout(timeoutId);
        clearTimeout(backupTimeoutId);
      };

      // Enhanced backup submission with multiple methods
      const sendBackup = (reason) => {
        if (submitted || acknowledged) return;

        debug(\`Sending backup submission due to: \${reason}\`);

        // FINAL VERIFICATION: Check consent field state right before submission
        let finalConsentCheck = null;
        let consentFieldName = 'unknown';
        
        if (CONFIG.consentFieldInfo) {
          finalConsentCheck = utils.qs(\`#\${CONFIG.consentFieldInfo.id}\`) || 
                             utils.qs(\`[name="\${CONFIG.consentFieldInfo.name}"]\`);
          consentFieldName = CONFIG.consentFieldInfo.name;
        } else {
          finalConsentCheck = utils.qs(\`#\${CONFIG.keapConsentFieldId}\`);
          consentFieldName = CONFIG.keapConsentFieldId;
        }
        
        debug('🔍 FINAL CHECK before submission:', {
          reason: reason,
          fieldName: consentFieldName,
          consentFieldExists: !!finalConsentCheck,
          consentFieldChecked: finalConsentCheck ? finalConsentCheck.checked : 'N/A',
          consentFieldValue: finalConsentCheck ? finalConsentCheck.value : 'N/A',
          expectedChecked: consentChecked,
          matchesExpected: finalConsentCheck ? (finalConsentCheck.checked === consentChecked) : false
        });

        try {
          const formData = new FormData(keapForm);
          
          // Log what's actually being submitted
          const formDataEntries = {};
          for (const [key, value] of formData.entries()) {
            formDataEntries[key] = value;
          }
          debug('📤 ACTUAL FORM DATA being submitted:', formDataEntries);
          
          // Method 1: sendBeacon (most reliable)
          if (navigator.sendBeacon) {
            const params = new URLSearchParams();
            for (const [key, value] of formData.entries()) {
              params.append(key, value);
            }
            const blob = new Blob([params.toString()], { 
              type: 'application/x-www-form-urlencoded;charset=UTF-8' 
            });
            
            if (navigator.sendBeacon(keapForm.action, blob)) {
              debug('Backup via sendBeacon successful');
              markSuccess('sendBeacon');
              return;
            }
          }

          // Method 2: Fetch with keepalive
          fetch(keapForm.action, {
            method: 'POST',
            body: formData,
            mode: 'no-cors',
            keepalive: true,
            credentials: 'same-origin'
          }).then(() => {
            debug('Backup via fetch successful');
            markSuccess('fetch-keepalive');
          }).catch((error) => {
            debug('Backup fetch failed:', error);
            markFailure(error, 'backup-failed');
          });

        } catch (error) {
          debug('Backup submission error:', error);
          markFailure(error, 'backup-error');
        }
      };

      // Page lifecycle handlers
      const onVisibilityChange = () => {
        if (document.visibilityState === 'hidden' && !acknowledged && !submitted) {
          sendBackup('page-hidden');
        }
      };

      const onBeforeUnload = () => {
        if (!acknowledged && !submitted) {
          sendBackup('before-unload');
        }
      };

      const onPageHide = () => {
        if (!acknowledged && !submitted) {
          sendBackup('page-hide');
        }
      };

      // Register event listeners
      document.addEventListener('visibilitychange', onVisibilityChange);
      window.addEventListener('beforeunload', onBeforeUnload);
      window.addEventListener('pagehide', onPageHide);

      // Timeouts
      const timeoutId = setTimeout(() => {
        if (!acknowledged && !submitted && document.visibilityState === 'hidden') {
          sendBackup('primary-timeout');
        }
      }, CONFIG.timeoutMs);

      const backupTimeoutId = setTimeout(() => {
        if (!acknowledged && !submitted) {
          sendBackup('backup-timeout');
        }
        cleanup();
      }, CONFIG.timeoutMs * 3);

      // Note: Primary form submission removed to prevent double submission
      // The form data is submitted via fetch/sendBeacon methods above
      debug('Keap submission handled via fetch/sendBeacon - avoiding duplicate form.submit()');
    });
  }

  // ========== MAIN INITIALIZATION ==========
  utils.waitForElements(({ button, nameField, emailField, phoneField }) => {
    debugSuccess('🚀 Bridge initialization starting...');
    debug('Elements found:', {
      button: !!button,
      nameField: !!nameField, 
      emailField: !!emailField,
      phoneField: !!phoneField
    });

    // Inject SMS consent
    debug('📱 About to inject SMS consent checkbox...');
    const consentCheckbox = injectSMSConsent(button);
    
    if (consentCheckbox) {
      debugSuccess('✅ SMS consent injection completed successfully');
    } else {
      debugError('❌ SMS consent injection FAILED - checkbox not found after injection');
    }

    // Setup fetch interception
    setupFetchInterception(consentCheckbox);

    // ========== WEBINARFUEL CID HANDLING ==========
    // Ensure WebinarFuel gets the _wf_cid parameter for confirmation pages
    if (trackingData._wf_cid) {
      debug('🎯 WebinarFuel CID detected:', trackingData._wf_cid);
      
      // Ensure WebinarFuel's _wf global receives the CID
      try {
        // Initialize _wf array if it doesn't exist
        if (!window._wf) {
          window._wf = [];
        }
        
        // Find existing config for this target ID
        const existingConfigIndex = window._wf.findIndex(config => 
          config && config.id === '${config.wfTargetId}'
        );
        
        if (existingConfigIndex >= 0) {
          // Update existing config with CID
          window._wf[existingConfigIndex].cid = trackingData._wf_cid;
          debug('✅ Updated existing WebinarFuel config with CID');
        } else {
          // Add new config with CID
          window._wf.push({ 
            id: '${config.wfTargetId}', 
            cid: trackingData._wf_cid 
          });
          debug('✅ Added new WebinarFuel config with CID');
        }
        
        // Also set data attributes on WebinarFuel target elements
        const wfTargets = utils.qsa(\`[class*="wf_target_${config.wfTargetId}"], [class*="wf_target"]\`);
        wfTargets.forEach(target => {
          target.setAttribute('data-wf-cid', trackingData._wf_cid);
          debug('✅ Set data-wf-cid attribute on target element');
        });
        
        // Force WebinarFuel to reinitialize if it's already loaded
        if (window.WF && typeof window.WF.refresh === 'function') {
          setTimeout(() => {
            window.WF.refresh();
            debug('✅ Refreshed WebinarFuel with new CID');
          }, 100);
        }
        
        debugSuccess('🎯 WebinarFuel CID handling complete:', trackingData._wf_cid);
        
      } catch (error) {
        debugError('⚠️ Error setting WebinarFuel CID:', error);
      }
    } else {
      debug('ℹ️ No WebinarFuel CID in URL parameters - this is normal for registration pages');
    }

    // Enhanced button click handler
    button.addEventListener('click', async function(event) {
      debugSuccess('🖱️ WebinarFuel button clicked!');
      debug('Event details:', {
        type: event.type,
        target: event.target.tagName,
        timeStamp: new Date(event.timeStamp).toISOString(),
        isTrusted: event.isTrusted
      });
      
      // Check SMS consent first - with enhanced debugging
      const consentChecked = consentCheckbox && consentCheckbox.checked;
      debug('📱 SMS consent status:', consentChecked);
      
      // Double-check the actual DOM element state
      if (consentCheckbox) {
        debug('📱 Consent element details:', {
          id: consentCheckbox.id,
          checked: consentCheckbox.checked,
          value: consentCheckbox.value,
          type: consentCheckbox.type
        });
      } else {
        debugError('📱 Consent checkbox element not found!');
      }
      
      // Capture original phone for processing
      const originalPhone = phoneField ? phoneField.value.trim() : '';
      debug('📞 Original phone number:', originalPhone ? 'present' : 'none');
      
      const formData = {
        name: nameField.value.trim(),
        email: emailField.value.trim(),
        phone: originalPhone // Always capture original for Keap
      };
      
      debug('📝 Form data for Keap (always includes phone):', formData);

      // Enhanced validation
      if (!formData.name) {
        event.stopImmediatePropagation();
        event.preventDefault();
        alert('Please enter your full name.');
        nameField.focus();
        return;
      }

      if (!utils.validateEmail(formData.email)) {
        event.stopImmediatePropagation();
        event.preventDefault();
        alert('Please enter a valid email address.');
        emailField.focus();
        return;
      }

      // Clear phone from WebinarFuel form if no consent
      if (phoneField && !consentChecked && originalPhone) {
        phoneField.value = '';
        
        // Trigger events to update WebinarFuel
        ['input', 'change', 'blur', 'keyup'].forEach(eventType => {
          phoneField.dispatchEvent(new Event(eventType, { bubbles: true }));
        });
        
        debug('📞 Phone cleared from WebinarFuel field:', originalPhone, '-> (empty)');
        debug('📞 Phone will still be sent to Keap with consent status');
      } else if (consentChecked) {
        debug('📞 Phone will be sent to both WebinarFuel and Keap (consent given)');
      } else {
        debug('📞 No phone number to process');
      }

      // Submit to Keap with original phone and consent status (SINGLE SUBMISSION)
      try {
        debug('📋 KEAP SUBMISSION: Phone always sent +', consentChecked ? 'consent=YES' : 'consent=NO');
        debug('🔧 Using single submission path to prevent duplicates');
        await submitToKeap(formData, consentChecked);
        debug('✅ Keap submission completed successfully (no duplicates)');
      } catch (error) {
        console.error('[WF Bridge] Keap submission failed:', error);
        // Continue with WebinarFuel anyway
      }

      // Let WebinarFuel proceed (with phone only if consent given)
      debug('🚀 WEBINARFUEL SUBMISSION: Phone', consentChecked ? 'INCLUDED' : 'EXCLUDED', '(consent=' + (consentChecked ? 'YES' : 'NO') + ')');
    }, true);

    console.log('[WF Bridge] Bridge fully initialized for ${config.companyName}');
    
    // Debug mode instructions
    if (CONFIG.debugMode) {
      console.log('%c[WF Bridge] 🐛 DEBUG MODE ACTIVE - Comprehensive logging enabled', 'color: #ff6b35; font-weight: bold; font-size: 12px;');
      console.log('%c[WF Bridge] 🔧 Debug Commands:', 'color: #ff6b35; font-weight: bold;');
      console.log('  • localStorage.removeItem("wf_bridge_debug") - Disable debug mode');
      console.log('  • console.clear() - Clear console');
      console.log('  • Add ?debug=true to URL to enable debug mode');
      debugSuccess('✅ Bridge initialization complete with debug logging');
    }
  });
});`;
  }

  /**
   * Generate the complete package
   */
  generateCompletePackage(wfCode, keapCode, userConfig = {}) {
    const wfConfig = this.parseWebinarFuelCode(wfCode);
    const keapConfig = this.parseKeapCode(keapCode);
    const config = this.mergeConfigs(wfConfig, keapConfig, userConfig);

    const bridgeScript = this.generateBulletproofCode(config);

    return {
      webinarFuelEmbed: this.cleanupWebinarFuelCode(wfCode),
      keapHiddenForm: this.cleanupKeapCode(keapCode),
      keapHelpers: this.generateKeapHelpers(config),
      bridgeScript: bridgeScript,
      completeHTML: this.generateCompleteHTML(wfCode, keapCode, bridgeScript, config)
    };
  }

  /**
   * Clean up WebinarFuel code
   */
  cleanupWebinarFuelCode(wfCode) {
    return wfCode.trim();
  }

  /**
   * Clean up Keap code
   */
  cleanupKeapCode(keapCode) {
    let cleanCode = keapCode.trim();
    
    if (!cleanCode.includes('inf_sink_iframe')) {
      cleanCode = `<!-- Keap hidden sink iframe -->
<iframe id="inf_sink_iframe" name="inf_sink" style="display:none" aria-hidden="true"></iframe>

` + cleanCode;
    }

    return cleanCode;
  }

  /**
   * Generate Keap helper scripts
   */
  generateKeapHelpers(config) {
    if (!config.keapSubdomain) return '';

    return `<!-- Keap helper scripts -->
<script src="https://${config.keapSubdomain}.infusionsoft.app/app/webTracking/getTrackingCode" type="text/javascript"></script>
<script src="https://${config.keapSubdomain}.infusionsoft.com/app/timezone/timezoneInputJs?xid=${config.keapFormId.replace('inf_form_', '')}" type="text/javascript"></script>
<script src="https://${config.keapSubdomain}.infusionsoft.com/js/jquery/jquery-3.3.1.js" type="text/javascript"></script>
<script src="https://${config.keapSubdomain}.infusionsoft.app/app/webform/overwriteRefererJs" type="text/javascript"></script>`;
  }

  /**
   * Generate complete HTML package
   */
  generateCompleteHTML(wfCode, keapCode, bridgeScript, config) {
    const wfEmbed = this.cleanupWebinarFuelCode(wfCode);
    const keapForm = this.cleanupKeapCode(keapCode);
    const keapHelpers = this.generateKeapHelpers(config);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WebinarFuel + Keap Integration - ${config.companyName}</title>
    <meta name="description" content="Register for our webinar - ${config.formName}">
</head>
<body>
    <!-- WebinarFuel Embed -->
    ${wfEmbed}
    
    <!-- Keap Hidden Form (place at end of body) -->
    ${keapForm}
    
    ${keapHelpers}
    
    <!-- WebinarFuel <-> Keap Bridge Script -->
    <script>
${bridgeScript}
    </script>
</body>
</html>`;
  }

  /**
   * Generate separate WebinarFuel embed and Keap form + script blocks
   * Returns an object with webinarFuelEmbed and keapFormWithScript
   */
  generateSeparateBlocks(wfCode, keapCode, userConfig = {}) {
    const wfConfig = this.parseWebinarFuelCode(wfCode);
    const keapConfig = this.parseKeapCode(keapCode);
    const config = this.mergeConfigs(wfConfig, keapConfig, userConfig);
    
    // Validate required fields
    const errors = this.validateConfig(config);
    if (errors.length > 0) {
      throw new Error('Configuration errors: ' + errors.join(', '));
    }

    // Generate the bulletproof bridge script
    const bridgeScript = this.generateBulletproofCode(config);
    
    // Clean up the WebinarFuel code (remove any extra whitespace/comments)
    const cleanWfCode = wfCode.trim();
    
    // Generate the hidden Keap form with enhanced features
    const hiddenKeapForm = this.cleanupKeapCode(keapCode);
    const keapHelpers = this.generateKeapHelpers(config);
    
    // Combine Keap form with bridge script
    const keapFormWithScript = `<!-- Hidden Infusionsoft/Keap Form with SMS Consent -->
${hiddenKeapForm}

${keapHelpers}

<!-- WebinarFuel <-> Keap Bridge Script -->
<script>
${bridgeScript}
</script>`;

    return {
      webinarFuelEmbed: cleanWfCode,
      keapFormWithScript: keapFormWithScript
    };
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WFKeapBridgeGenerator;
} else if (typeof window !== 'undefined') {
  window.WFKeapBridgeGenerator = WFKeapBridgeGenerator;
}