/**
 * WebinarFuel <-> Keap/Infusionsoft Bridge (Bulletproof Version)
 * Handles SMS consent integration and reliable form submission
 */

document.addEventListener('DOMContentLoaded', function () {
  console.log('[WF Bridge] Bulletproof bridge loaded');

  // ========== CONFIGURATION (will be dynamically generated) ==========
  const CONFIG = {
    wfTargetId: 'LY6KyvxuWicTQtyH1PEDMpdh', // WebinarFuel embed ID
    keapFormId: 'inf_form_2f18e509cdad61f2c980454fd61236d3', // Keap form ID
    keapConsentFieldId: 'inf_option_BycheckingthisboxIagreetoreceivetextmessagessuchasremindersupdatesandpromotionaloffersfromTheCashFlowAcademyatthemobilenumberprovidedMessageanddataratesmayapplyMessagefrequencyvariesConsentisnotaconditionofpurchaseReplySTOPtounsubscribe',
    wfButtonSelector: '#wf_element_863324 button', // WebinarFuel button selector
    consentText: 'By checking this box, I agree to receive text messages (such as reminders, updates, and promotional offers) from The Cash Flow Academy at the mobile number provided. Message and data rates may apply. Message frequency varies. Consent is not a condition of purchase. Reply STOP to unsubscribe.',
    companyName: 'The Cash Flow Academy',
    maxRetries: 3,
    timeoutMs: 1000
  };

  // ========== UTILITIES ==========
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
        return true;
      }
      console.warn('[WF Bridge] Hidden field not found:', name);
      return false;
    },

    parseName: (fullName) => {
      const parts = (fullName || '').trim().split(/\s+/);
      return {
        first: parts.shift() || '',
        last: parts.join(' ')
      };
    },

    normalizePhone: (rawPhone) => {
      if (!rawPhone) return '';
      
      const stripped = rawPhone.replace(/[^\d+]/g, '');
      const digitsOnly = stripped.replace(/\D/g, '');
      
      if (!stripped) return '';
      if (stripped.startsWith('+')) return stripped;
      if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) return '+' + digitsOnly;
      if (digitsOnly.length === 10) return '+1' + digitsOnly;
      return stripped;
    },

    validateEmail: (email) => {
      return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },

    debounce: (func, wait) => {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    }
  };

  // ========== UTM AND TRACKING CAPTURE ==========
  const trackingData = {
    utm_source: utils.getUrlParam('utm_source'),
    utm_medium: utils.getUrlParam('utm_medium'),
    utm_campaign: utils.getUrlParam('utm_campaign'),
    utm_term: utils.getUrlParam('utm_term'),
    utm_content: utils.getUrlParam('utm_content'),
    utm_id: utils.getUrlParam('utm_id'),
    fbclid: utils.getUrlParam('fbclid'),
    gclid: utils.getUrlParam('gclid'),
    referrer: document.referrer || window.location.href,
    timestamp: new Date().toISOString()
  };

  console.log('[WF Bridge] Tracking data captured:', trackingData);

  // ========== WEBINAR FUEL DOM WAITING ==========
  function waitForWebinarFuelDOM(callback, maxAttempts = 100) {
    let attempts = 0;

    const checkDOM = () => {
      attempts++;
      
      // Look for WebinarFuel elements more comprehensively
      const button = utils.qs(CONFIG.wfButtonSelector) || utils.qs('.wf_button') || utils.qs('button[class*="wf_"]');
      const nameField = utils.qs('input[name="name"]') || utils.qs('input[type="name"]');
      const emailField = utils.qs('input[name="email"]') || utils.qs('input[type="email"]');
      const phoneField = utils.qs('input[name="tel"]') || utils.qs('input[type="tel"]');

      if (button && nameField && emailField) {
        console.log('[WF Bridge] WebinarFuel DOM found');
        return callback({
          button,
          nameField,
          emailField,
          phoneField
        });
      }

      if (attempts >= maxAttempts) {
        console.error('[WF Bridge] WebinarFuel DOM not found after', maxAttempts, 'attempts');
        return;
      }

      setTimeout(checkDOM, 250);
    };

    checkDOM();
  }

  // ========== SMS CONSENT INJECTION ==========
  function injectSMSConsent(button) {
    if (utils.qs('#wf_sms_consent_wrap')) {
      console.log('[WF Bridge] SMS consent already exists');
      return utils.qs('#wf_sms_consent');
    }

    const buttonContainer = button.closest('[id*="wf_element"]') || button.parentElement || button;
    const parentContainer = buttonContainer.parentElement || document.body;

    const consentWrapper = document.createElement('div');
    consentWrapper.id = 'wf_sms_consent_wrap';
    consentWrapper.style.cssText = `
      margin: 8px 10px 0;
      font-family: Montserrat, system-ui, -apple-system, sans-serif;
      font-size: 13px;
      color: #333;
      display: flex;
      gap: 8px;
      align-items: flex-start;
      line-height: 1.4;
    `;

    consentWrapper.innerHTML = `
      <input id="wf_sms_consent" type="checkbox" style="width:16px;height:16px;margin-top:2px;flex-shrink:0;">
      <label for="wf_sms_consent" style="line-height:1.35;cursor:pointer;user-select:none;">
        ${CONFIG.consentText}
      </label>
    `;

    parentContainer.insertBefore(consentWrapper, buttonContainer);
    console.log('[WF Bridge] SMS consent checkbox injected');

    return utils.qs('#wf_sms_consent');
  }

  // ========== WEBINAR FUEL FETCH INTERCEPTION ==========
  function setupFetchInterception(consentCheckbox) {
    const WF_ENDPOINT_PATTERNS = [
      /embed\.webby\.app\/embed\/v2\/viewers/i,
      /webinarfuel\.com/i,
      /d3pw37i36t41cq\.cloudfront\.net/i
    ];

    const originalFetch = window.fetch;
    
    window.fetch = async function(input, init) {
      try {
        const url = typeof input === 'string' ? input : (input && input.url) || '';
        const isWFEndpoint = WF_ENDPOINT_PATTERNS.some(pattern => pattern.test(url));
        
        if (isWFEndpoint && init && init.method && init.method.toUpperCase() === 'POST') {
          if (init.body && typeof init.body === 'string') {
            try {
              const payload = JSON.parse(init.body);
              
              // If no SMS consent, redact phone from WebinarFuel submission
              if (payload && payload.viewer && (!consentCheckbox || !consentCheckbox.checked)) {
                payload.viewer.phone = "";
                init = { ...init, body: JSON.stringify(payload) };
                console.log('[WF Bridge] Phone redacted from WebinarFuel (no SMS consent)');
              }
            } catch (e) {
              console.warn('[WF Bridge] Could not parse WebinarFuel payload:', e);
            }
          }
        }
      } catch (error) {
        console.warn('[WF Bridge] Fetch interception error:', error);
      }

      return originalFetch.apply(this, arguments);
    };

    console.log('[WF Bridge] Fetch interception setup complete');
  }

  // ========== KEAP FORM SUBMISSION ==========
  function submitToKeap(formData, consentChecked) {
    return new Promise((resolve, reject) => {
      const keapForm = utils.qs(`#${CONFIG.keapFormId}`);
      const keapFrame = utils.qs('#inf_sink_iframe');

      if (!keapForm) {
        reject(new Error('Keap form not found'));
        return;
      }

      // Populate form fields
      const { first, last } = utils.parseName(formData.name);
      
      utils.qs('#inf_field_FirstName').value = first;
      utils.qs('#inf_field_LastName').value = last;
      utils.qs('#inf_field_Email').value = formData.email;
      utils.qs('#inf_field_Phone1').value = utils.normalizePhone(formData.phone);

      // Set SMS consent
      const keapConsentField = utils.qs(`#${CONFIG.keapConsentFieldId}`);
      if (keapConsentField) {
        keapConsentField.checked = consentChecked;
      }

      // Populate tracking fields
      utils.setHiddenField('inf_custom_GaSource', trackingData.utm_source || 'null');
      utils.setHiddenField('inf_custom_GaMedium', trackingData.utm_medium || 'null');
      utils.setHiddenField('inf_custom_GaCampaign', trackingData.utm_campaign || 'null');
      utils.setHiddenField('inf_custom_GaTerm', trackingData.utm_term || 'null');
      utils.setHiddenField('inf_custom_GaContent', trackingData.utm_content || 'null');
      utils.setHiddenField('inf_custom_GaCampaignID', trackingData.utm_id || 'null');
      utils.setHiddenField('inf_custom_GaReferurl', trackingData.referrer);
      utils.setHiddenField('inf_custom_fbclid', trackingData.fbclid || 'null');

      // Setup success/failure tracking
      let submitted = false;
      let acknowledged = false;

      const markSuccess = () => {
        if (!submitted) {
          submitted = true;
          console.log('[WF Bridge] Keap submission successful');
          resolve(true);
        }
      };

      const markFailure = (error) => {
        if (!submitted) {
          submitted = true;
          console.error('[WF Bridge] Keap submission failed:', error);
          reject(error);
        }
      };

      // Listen for iframe load (success indicator)
      if (keapFrame) {
        const onFrameLoad = () => {
          acknowledged = true;
          markSuccess();
          cleanup();
        };
        keapFrame.addEventListener('load', onFrameLoad, { once: true });
      }

      // Cleanup function
      const cleanup = () => {
        if (keapFrame) keapFrame.removeEventListener('load', () => {});
        document.removeEventListener('visibilitychange', onVisibilityChange);
        window.removeEventListener('pagehide', onPageHide);
        clearTimeout(timeoutId);
      };

      // Backup submission handlers
      const sendBackup = () => {
        if (submitted || acknowledged) return;

        try {
          const formData = new FormData(keapForm);
          
          // Try sendBeacon first
          if (navigator.sendBeacon) {
            const params = new URLSearchParams();
            for (const [key, value] of formData.entries()) {
              params.append(key, value);
            }
            const blob = new Blob([params.toString()], { 
              type: 'application/x-www-form-urlencoded;charset=UTF-8' 
            });
            
            if (navigator.sendBeacon(keapForm.action, blob)) {
              console.log('[WF Bridge] Backup via sendBeacon successful');
              markSuccess();
              return;
            }
          }

          // Fallback to fetch with keepalive
          fetch(keapForm.action, {
            method: 'POST',
            body: formData,
            mode: 'no-cors',
            keepalive: true
          }).then(() => {
            console.log('[WF Bridge] Backup via fetch successful');
            markSuccess();
          }).catch((error) => {
            console.warn('[WF Bridge] Backup fetch failed:', error);
            markFailure(error);
          });

        } catch (error) {
          console.error('[WF Bridge] Backup submission error:', error);
          markFailure(error);
        }
      };

      // Page visibility/unload handlers
      const onVisibilityChange = () => {
        if (document.visibilityState === 'hidden' && !acknowledged && !submitted) {
          sendBackup();
        }
      };

      const onPageHide = () => {
        if (!acknowledged && !submitted) {
          sendBackup();
        }
      };

      document.addEventListener('visibilitychange', onVisibilityChange);
      window.addEventListener('pagehide', onPageHide);

      // Timeout handler
      const timeoutId = setTimeout(() => {
        if (!acknowledged && !submitted) {
          if (document.visibilityState === 'hidden') {
            sendBackup();
          } else {
            markFailure(new Error('Submission timeout'));
          }
        }
        cleanup();
      }, CONFIG.timeoutMs);

      // Primary submission
      try {
        keapForm.submit();
        console.log('[WF Bridge] Primary Keap submission initiated');
      } catch (error) {
        console.error('[WF Bridge] Primary submission failed:', error);
        markFailure(error);
      }
    });
  }

  // ========== MAIN INITIALIZATION ==========
  waitForWebinarFuelDOM(({ button, nameField, emailField, phoneField }) => {
    console.log('[WF Bridge] Initializing bridge');

    // Inject SMS consent
    const consentCheckbox = injectSMSConsent(button);

    // Setup fetch interception
    setupFetchInterception(consentCheckbox);

    // Handle button click
    button.addEventListener('click', async function(event) {
      const formData = {
        name: nameField.value.trim(),
        email: emailField.value.trim(),
        phone: phoneField ? phoneField.value.trim() : ''
      };

      // Validation
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

      const consentChecked = consentCheckbox && consentCheckbox.checked;

      // If no consent, clear phone visually
      if (phoneField && !consentChecked) {
        phoneField.value = '';
        // Trigger events to update WebinarFuel's state
        ['input', 'change', 'blur'].forEach(eventType => {
          phoneField.dispatchEvent(new Event(eventType, { bubbles: true }));
        });
      }

      // Submit to Keap
      try {
        await submitToKeap(formData, consentChecked);
        console.log('[WF Bridge] Form bridge completed successfully');
      } catch (error) {
        console.error('[WF Bridge] Form bridge failed:', error);
        // Continue with WebinarFuel submission even if Keap fails
      }

      // Let WebinarFuel proceed normally (don't preventDefault)
    }, true); // Use capture phase

    console.log('[WF Bridge] Bridge initialization complete');
  });
});