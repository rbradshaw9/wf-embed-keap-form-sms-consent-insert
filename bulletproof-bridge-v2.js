/**
 * WebinarFuel <-> Keap/Infusionsoft Bridge (Bulletproof Version 2.0)
 * Enhanced for dynamic button detection and maximum reliability
 */

document.addEventListener('DOMContentLoaded', function () {
  console.log('[WF Bridge] Bulletproof bridge v2.0 loaded');

  // ========== CONFIGURATION (will be dynamically generated) ==========
  const CONFIG = {
    wfTargetId: 'PLACEHOLDER_WF_TARGET_ID',
    keapFormId: 'PLACEHOLDER_KEAP_FORM_ID',
    keapConsentFieldId: 'PLACEHOLDER_KEAP_CONSENT_FIELD_ID',
    keapSubdomain: 'PLACEHOLDER_KEAP_SUBDOMAIN',
    keapActionUrl: 'PLACEHOLDER_KEAP_ACTION_URL',
    consentText: 'PLACEHOLDER_CONSENT_TEXT',
    companyName: 'PLACEHOLDER_COMPANY_NAME',
    maxRetries: 3,
    timeoutMs: 1000,
    debugMode: localStorage.getItem('wf_bridge_debug') === 'true'
  };

  // Debug logging
  const debug = (...args) => {
    if (CONFIG.debugMode) console.log('[WF Bridge Debug]', ...args);
  };

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
      const field = utils.qs(`input[name="${name}"]`);
      if (field) {
        field.value = value != null ? String(value) : 'null';
        debug(`Set hidden field ${name} = ${field.value}`);
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

    // Enhanced element detection
    findWebinarFuelElements: () => {
      debug('Starting WebinarFuel element detection');
      
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
          const wfContainer = utils.qs(`.wf_target_${CONFIG.wfTargetId}`) || 
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
        debug(`Trying detection strategy ${i + 1}`);
        const result = strategies[i]();
        
        if (result && result.button && result.nameField && result.emailField) {
          debug(`Strategy ${i + 1} successful:`, {
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
        debug(`Element detection attempt ${attempts}/${maxAttempts}`);
        
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
    if (utils.qs('#wf_sms_consent_wrap')) {
      debug('SMS consent already exists');
      return utils.qs('#wf_sms_consent');
    }

    // Find the best parent container for the consent checkbox
    const findBestParent = (element) => {
      // Try to find form-like containers
      let current = element;
      while (current && current !== document.body) {
        if (current.classList.contains('wf_column') || 
            current.classList.contains('wf_form') ||
            current.classList.contains('wf_step') ||
            current.tagName === 'FORM') {
          return current;
        }
        current = current.parentElement;
      }
      
      // Fallback to button's immediate container
      return element.closest('[id*="wf_element"]') || 
             element.parentElement || 
             element;
    };

    const buttonContainer = findBestParent(button);
    const parentContainer = buttonContainer.parentElement || document.body;

    const consentWrapper = document.createElement('div');
    consentWrapper.id = 'wf_sms_consent_wrap';
    consentWrapper.style.cssText = `
      margin: 8px 10px 0;
      font-family: Montserrat, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      color: #333;
      display: flex;
      gap: 8px;
      align-items: flex-start;
      line-height: 1.4;
      z-index: 1000;
      position: relative;
    `;

    consentWrapper.innerHTML = `
      <input id="wf_sms_consent" 
             type="checkbox" 
             style="width:16px;height:16px;margin-top:2px;flex-shrink:0;cursor:pointer;"
             aria-describedby="wf_sms_consent_label">
      <label id="wf_sms_consent_label" 
             for="wf_sms_consent" 
             style="line-height:1.35;cursor:pointer;user-select:none;">
        ${CONFIG.consentText}
      </label>
    `;

    // Insert before the button container
    parentContainer.insertBefore(consentWrapper, buttonContainer);
    
    debug('SMS consent checkbox injected before:', buttonContainer.className || buttonContainer.tagName);
    
    // Add event listener for consent changes
    const consentCheckbox = utils.qs('#wf_sms_consent');
    consentCheckbox.addEventListener('change', function() {
      debug('SMS consent changed:', this.checked);
    });

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
          if (init.body) {
            try {
              let payload;
              let modified = false;
              
              // Handle different body types
              if (typeof init.body === 'string') {
                try {
                  payload = JSON.parse(init.body);
                } catch (e) {
                  // Not JSON, might be form data
                  debug('Non-JSON body, skipping modification');
                }
              }
              
              // If no SMS consent, redact phone from WebinarFuel submission
              if (payload && payload.viewer && (!consentCheckbox || !consentCheckbox.checked)) {
                if (payload.viewer.phone) {
                  payload.viewer.phone = "";
                  modified = true;
                  debug('Phone redacted from WebinarFuel payload');
                }
              }
              
              if (modified) {
                init = { ...init, body: JSON.stringify(payload) };
              }
            } catch (e) {
              debug('Error processing WebinarFuel payload:', e);
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
      
      const keapForm = utils.qs(`#${CONFIG.keapFormId}`);
      const keapFrame = utils.qs('#inf_sink_iframe');

      if (!keapForm) {
        const error = new Error('Keap form not found: ' + CONFIG.keapFormId);
        debug('Keap form missing');
        reject(error);
        return;
      }

      if (!keapFrame) {
        console.warn('[WF Bridge] Keap iframe not found - submission may not work properly');
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
          debug(`Set ${name}: ${field.value}`);
        } else {
          debug(`Field not found: ${selector} (${name})`);
        }
      });

      // Set SMS consent in Keap form
      const keapConsentField = utils.qs(`#${CONFIG.keapConsentFieldId}`);
      if (keapConsentField) {
        keapConsentField.checked = consentChecked;
        debug('Keap consent field set:', consentChecked);
      } else {
        debug('Keap consent field not found:', CONFIG.keapConsentFieldId);
      }

      // Populate ALL tracking fields comprehensively
      const trackingFields = {
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

      Object.entries(trackingFields).forEach(([fieldName, value]) => {
        utils.setHiddenField(fieldName, value || 'null');
      });

      // Enhanced submission tracking
      let submitted = false;
      let acknowledged = false;
      let submissionStartTime = Date.now();

      const markSuccess = (method) => {
        if (!submitted) {
          submitted = true;
          const duration = Date.now() - submissionStartTime;
          debug(`Keap submission successful via ${method} (took ${duration}ms)`);
          resolve(true);
        }
      };

      const markFailure = (error, method) => {
        if (!submitted) {
          submitted = true;
          const duration = Date.now() - submissionStartTime;
          debug(`Keap submission failed via ${method} after ${duration}ms:`, error);
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
        
        // Use both load and error events
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
        if (submitted || acknowledged) {
          debug('Backup skipped - already submitted/acknowledged');
          return;
        }

        debug(`Sending backup submission due to: ${reason}`);

        try {
          const formData = new FormData(keapForm);
          let backupSuccess = false;
          
          // Method 1: sendBeacon (most reliable for page unload)
          if (navigator.sendBeacon) {
            const params = new URLSearchParams();
            for (const [key, value] of formData.entries()) {
              params.append(key, value);
            }
            const blob = new Blob([params.toString()], { 
              type: 'application/x-www-form-urlencoded;charset=UTF-8' 
            });
            
            backupSuccess = navigator.sendBeacon(keapForm.action, blob);
            if (backupSuccess) {
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
            
            // Method 3: Last resort - sync XHR (deprecated but works)
            try {
              const xhr = new XMLHttpRequest();
              xhr.open('POST', keapForm.action, false); // Synchronous
              xhr.send(formData);
              debug('Backup via sync XHR completed');
              markSuccess('sync-xhr');
            } catch (xhrError) {
              debug('All backup methods failed:', xhrError);
              markFailure(xhrError, 'all-backups-failed');
            }
          });

        } catch (error) {
          debug('Backup submission error:', error);
          markFailure(error, 'backup-error');
        }
      };

      // Enhanced page lifecycle handlers
      const onVisibilityChange = () => {
        if (document.visibilityState === 'hidden' && !acknowledged && !submitted) {
          debug('Page hidden, triggering backup');
          sendBackup('page-hidden');
        }
      };

      const onBeforeUnload = () => {
        if (!acknowledged && !submitted) {
          debug('Before unload, triggering backup');
          sendBackup('before-unload');
        }
      };

      const onPageHide = () => {
        if (!acknowledged && !submitted) {
          debug('Page hide, triggering backup');
          sendBackup('page-hide');
        }
      };

      // Register all event listeners
      document.addEventListener('visibilitychange', onVisibilityChange);
      window.addEventListener('beforeunload', onBeforeUnload);
      window.addEventListener('pagehide', onPageHide);

      // Primary timeout (shorter)
      const timeoutId = setTimeout(() => {
        if (!acknowledged && !submitted) {
          debug('Primary timeout reached, checking page state');
          if (document.visibilityState === 'hidden') {
            sendBackup('primary-timeout-hidden');
          } else {
            // Page still visible, give it more time
            debug('Page visible, extending timeout');
          }
        }
      }, CONFIG.timeoutMs);

      // Backup timeout (longer)
      const backupTimeoutId = setTimeout(() => {
        if (!acknowledged && !submitted) {
          debug('Backup timeout reached, forcing submission');
          sendBackup('backup-timeout');
        }
        cleanup();
      }, CONFIG.timeoutMs * 3);

      // Primary form submission with enhanced error handling
      try {
        debug('Submitting primary form');
        keapForm.submit();
        debug('Primary Keap submission initiated');
      } catch (error) {
        debug('Primary submission failed immediately:', error);
        markFailure(error, 'primary-submit');
      }
    });
  }

  // ========== MAIN INITIALIZATION ==========
  utils.waitForElements(({ button, nameField, emailField, phoneField }) => {
    debug('Initializing bridge with elements:', {
      button: button.tagName + (button.className ? '.' + button.className : ''),
      nameField: nameField.name,
      emailField: emailField.name,
      phoneField: phoneField ? phoneField.name : 'none'
    });

    // Inject SMS consent
    const consentCheckbox = injectSMSConsent(button);

    // Setup fetch interception
    setupFetchInterception(consentCheckbox);

    // Enhanced button click handler
    button.addEventListener('click', async function(event) {
      debug('Button clicked, processing form data');
      
      const formData = {
        name: nameField.value.trim(),
        email: emailField.value.trim(),
        phone: phoneField ? phoneField.value.trim() : ''
      };

      debug('Form data collected:', formData);

      // Enhanced validation
      if (!formData.name) {
        event.stopImmediatePropagation();
        event.preventDefault();
        alert('Please enter your full name.');
        nameField.focus();
        debug('Validation failed: missing name');
        return;
      }

      if (!utils.validateEmail(formData.email)) {
        event.stopImmediatePropagation();
        event.preventDefault();
        alert('Please enter a valid email address.');
        emailField.focus();
        debug('Validation failed: invalid email');
        return;
      }

      const consentChecked = consentCheckbox && consentCheckbox.checked;
      debug('SMS consent status:', consentChecked);

      // If no consent, clear phone visually with enhanced event triggering
      if (phoneField && !consentChecked) {
        const originalValue = phoneField.value;
        phoneField.value = '';
        
        // Trigger comprehensive events to ensure WebinarFuel updates
        const events = ['input', 'change', 'blur', 'keyup', 'paste'];
        events.forEach(eventType => {
          phoneField.dispatchEvent(new Event(eventType, { bubbles: true, cancelable: true }));
        });
        
        debug(`Phone cleared due to no consent: '${originalValue}' -> ''`);
      }

      // Submit to Keap with comprehensive error handling
      try {
        debug('Starting Keap submission process');
        await submitToKeap(formData, consentChecked);
        debug('Keap submission completed successfully');
      } catch (error) {
        console.error('[WF Bridge] Keap submission failed:', error);
        debug('Keap submission failed, but continuing with WebinarFuel');
        // Continue with WebinarFuel submission even if Keap fails
      }

      debug('Allowing WebinarFuel submission to proceed');
      // Let WebinarFuel proceed normally (no preventDefault)
    }, true); // Use capture phase to ensure we run first

    console.log('[WF Bridge] Bridge initialization complete for', CONFIG.companyName);
    debug('Bridge fully initialized and ready');
  });
});