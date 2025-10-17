/**
 * WebinarFuel <-> Keap/Infusionsoft Bridge Code Generator (Fixed Version)
 * Generates bulletproof bridge code for SMS consent integration
 * 
 * Note: This is a backup/legacy version. Use enhanced-bridge-generator.js for production.
 */

class BridgeGenerator {
  constructor() {
    this.version = '1.0.0';
  }

  /**
   * Parse WebinarFuel embed code to extract configuration
   */
  parseWebinarFuelCode(wfCode) {
    const config = {};
    
    // Extract WebinarFuel ID from _wf.push({id:"..."})
    const wfIdMatch = wfCode.match(/_wf\.push\(\{id:\s*["']([^"']+)["']/);
    if (wfIdMatch) {
      config.wfTargetId = wfIdMatch[1];
    }
    
    return config;
  }

  /**
   * Parse Keap form code to extract configuration
   */
  parseKeapCode(keapCode) {
    const config = {};
    
    // Extract form ID
    const formIdMatch = keapCode.match(/id=["']inf_form_([^"']+)["']/);
    if (formIdMatch) {
      config.keapFormId = formIdMatch[1];
    }
    
    // Extract action URL
    const actionMatch = keapCode.match(/action=["']([^"']+)["']/);
    if (actionMatch) {
      config.keapActionUrl = actionMatch[1];
      
      // Extract subdomain from action URL
      const subdomainMatch = actionMatch[1].match(/https?:\/\/([^.]+)\.infusionsoft\.com/);
      if (subdomainMatch) {
        config.keapSubdomain = subdomainMatch[1];
      }
    }
    
    // Find consent checkbox
    const consentMatch = keapCode.match(/id=["']inf_option_([^"']+)["']/);
    if (consentMatch) {
      config.keapConsentFieldId = consentMatch[1];
    }
    
    // Extract consent text from label
    const labelMatch = keapCode.match(/<label[^>]*for=["']inf_option_[^"']+["'][^>]*>([^<]+)</);
    if (labelMatch) {
      config.consentText = labelMatch[1].trim();
      
      // Extract company name from consent text
      const companyMatch = config.consentText.match(/from\s+([^.]+)/i);
      if (companyMatch) {
        config.companyName = companyMatch[1].trim();
      }
    }
    
    return config;
  }

  /**
   * Generate the complete bridge code
   */
  generateBridgeCode(wfCode, keapCode, userConfig = {}) {
    const wfConfig = this.parseWebinarFuelCode(wfCode);
    const keapConfig = this.parseKeapCode(keapCode);
    const config = { ...wfConfig, ...keapConfig, ...userConfig };
    
    return this.generateCode(config);
  }

  /**
   * Generate the JavaScript code with the given configuration
   */
  generateCode(config) {
    return `/**
 * WebinarFuel <-> Keap/Infusionsoft Bridge (Auto-Generated v1.0)
 * Generated on: ${new Date().toISOString()}
 */

document.addEventListener('DOMContentLoaded', function () {
  console.log('[WF Bridge] Bridge loaded for ${config.companyName || 'Unknown Company'}');

  // Configuration
  const CONFIG = {
    wfTargetId: '${config.wfTargetId || ''}',
    keapFormId: '${config.keapFormId || ''}',
    keapConsentFieldId: '${config.keapConsentFieldId || ''}',
    keapSubdomain: '${config.keapSubdomain || ''}',
    keapActionUrl: '${config.keapActionUrl || ''}',
    consentText: '${(config.consentText || '').replace(/'/g, "\\'")}',
    companyName: '${config.companyName || ''}'
  };

  // Find WebinarFuel button
  function findWFButton() {
    // Try multiple strategies to find the button
    let button = document.querySelector('button[id*="wf_element"]');
    if (!button) {
      button = document.querySelector('.wf_target button');
    }
    if (!button) {
      button = document.querySelector('button[data-wf-button]');
    }
    return button;
  }

  // Setup bridge
  function setupBridge() {
    const wfButton = findWFButton();
    if (!wfButton) {
      console.warn('[WF Bridge] WebinarFuel button not found');
      return;
    }

    wfButton.addEventListener('click', function(e) {
      console.log('[WF Bridge] WebinarFuel button clicked');
      
      // Submit to Keap/Infusionsoft
      const keapForm = document.getElementById('inf_form_' + CONFIG.keapFormId);
      if (keapForm) {
        keapForm.submit();
        console.log('[WF Bridge] Form submitted to Keap');
      }
    });
  }

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupBridge);
  } else {
    setupBridge();
  }
});`;
  }
}

module.exports = BridgeGenerator;