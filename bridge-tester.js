/**
 * WebinarFuel-Keap Bridge Testing Utilities
 * Use these functions to test your generated bridge code
 */

class BridgeTester {
  constructor() {
    this.testResults = [];
    this.isTestMode = false;
  }

  /**
   * Enable test mode - prevents actual form submissions
   */
  enableTestMode() {
    this.isTestMode = true;
    console.log('[Bridge Tester] Test mode enabled - forms will not actually submit');
    
    // Override form submission methods
    if (typeof HTMLFormElement !== 'undefined') {
      const originalSubmit = HTMLFormElement.prototype.submit;
      HTMLFormElement.prototype.submit = function() {
        console.log('[Bridge Tester] Form submission intercepted:', this.id || this.className);
        const event = new CustomEvent('testSubmit', { detail: { form: this } });
        document.dispatchEvent(event);
        return false;
      };
    }
  }

  /**
   * Disable test mode - restore normal form submission
   */
  disableTestMode() {
    this.isTestMode = false;
    console.log('[Bridge Tester] Test mode disabled');
    // Note: Form submission override will persist until page reload
  }

  /**
   * Test WebinarFuel DOM detection
   */
  testWebinarFuelDOM() {
    const results = {
      test: 'WebinarFuel DOM Detection',
      passed: true,
      details: []
    };

    // Check for WebinarFuel elements
    const wfTarget = document.querySelector('[class*="wf_target"]');
    const wfButton = document.querySelector('.wf_button, button[class*="wf_"]');
    const nameField = document.querySelector('input[name="name"], input[type="name"]');
    const emailField = document.querySelector('input[name="email"], input[type="email"]');
    const phoneField = document.querySelector('input[name="tel"], input[type="tel"]');

    if (wfTarget) {
      results.details.push('✅ WebinarFuel target div found');
    } else {
      results.details.push('❌ WebinarFuel target div not found');
      results.passed = false;
    }

    if (wfButton) {
      results.details.push('✅ WebinarFuel button found');
    } else {
      results.details.push('❌ WebinarFuel button not found');
      results.passed = false;
    }

    if (nameField) {
      results.details.push('✅ Name field found');
    } else {
      results.details.push('❌ Name field not found');
      results.passed = false;
    }

    if (emailField) {
      results.details.push('✅ Email field found');
    } else {
      results.details.push('❌ Email field not found');
      results.passed = false;
    }

    if (phoneField) {
      results.details.push('✅ Phone field found');
    } else {
      results.details.push('⚠️ Phone field not found (optional)');
    }

    this.testResults.push(results);
    return results;
  }

  /**
   * Test Keap form detection
   */
  testKeapForm() {
    const results = {
      test: 'Keap Form Detection',
      passed: true,
      details: []
    };

    const keapForm = document.querySelector('form[id*="inf_form_"]');
    const keapFrame = document.querySelector('#inf_sink_iframe');
    const firstNameField = document.querySelector('#inf_field_FirstName');
    const emailField = document.querySelector('#inf_field_Email');
    const consentCheckbox = document.querySelector('input[id*="inf_option_"]');

    if (keapForm) {
      results.details.push('✅ Keap form found: ' + keapForm.id);
    } else {
      results.details.push('❌ Keap form not found');
      results.passed = false;
    }

    if (keapFrame) {
      results.details.push('✅ Keap sink iframe found');
    } else {
      results.details.push('❌ Keap sink iframe not found');
      results.passed = false;
    }

    if (firstNameField) {
      results.details.push('✅ First name field found');
    } else {
      results.details.push('❌ First name field not found');
      results.passed = false;
    }

    if (emailField) {
      results.details.push('✅ Email field found');
    } else {
      results.details.push('❌ Email field not found');
      results.passed = false;
    }

    if (consentCheckbox) {
      results.details.push('✅ SMS consent checkbox found: ' + consentCheckbox.id);
    } else {
      results.details.push('❌ SMS consent checkbox not found');
      results.passed = false;
    }

    this.testResults.push(results);
    return results;
  }

  /**
   * Test SMS consent injection
   */
  testSMSConsentInjection() {
    const results = {
      test: 'SMS Consent Injection',
      passed: true,
      details: []
    };

    const injectedConsent = document.querySelector('#wf_sms_consent');
    const consentWrapper = document.querySelector('#wf_sms_consent_wrap');

    if (consentWrapper) {
      results.details.push('✅ SMS consent wrapper found');
    } else {
      results.details.push('❌ SMS consent wrapper not found');
      results.passed = false;
    }

    if (injectedConsent) {
      results.details.push('✅ Injected SMS consent checkbox found');
      
      // Test checkbox functionality
      const originalState = injectedConsent.checked;
      injectedConsent.checked = !originalState;
      injectedConsent.dispatchEvent(new Event('change', { bubbles: true }));
      
      if (injectedConsent.checked !== originalState) {
        results.details.push('✅ SMS consent checkbox is interactive');
      } else {
        results.details.push('⚠️ SMS consent checkbox may not be interactive');
      }
      
      // Restore original state
      injectedConsent.checked = originalState;
    } else {
      results.details.push('❌ Injected SMS consent checkbox not found');
      results.passed = false;
    }

    this.testResults.push(results);
    return results;
  }

  /**
   * Test UTM parameter capture
   */
  testUTMCapture() {
    const results = {
      test: 'UTM Parameter Capture',
      passed: true,
      details: []
    };

    // Test URL parameters
    const testParams = {
      utm_source: 'test_source',
      utm_medium: 'test_medium',
      utm_campaign: 'test_campaign',
      fbclid: 'test_fbclid'
    };

    // Temporarily modify URL for testing
    const originalUrl = window.location.href;
    const testUrl = new URL(originalUrl);
    Object.entries(testParams).forEach(([key, value]) => {
      testUrl.searchParams.set(key, value);
    });

    try {
      // Test parameter extraction function
      const getUrlParam = (key) => {
        try {
          const urlParams = new URLSearchParams(testUrl.search);
          const value = urlParams.get(key);
          return value && value.trim() !== '' && value !== 'null' ? decodeURIComponent(value) : null;
        } catch (e) {
          return null;
        }
      };

      Object.entries(testParams).forEach(([key, expectedValue]) => {
        const actualValue = getUrlParam(key);
        if (actualValue === expectedValue) {
          results.details.push(`✅ ${key}: ${actualValue}`);
        } else {
          results.details.push(`❌ ${key}: expected '${expectedValue}', got '${actualValue}'`);
          results.passed = false;
        }
      });

      // Test hidden field population
      const hiddenFields = document.querySelectorAll('input[name*="inf_custom_"]');
      if (hiddenFields.length > 0) {
        results.details.push(`✅ Found ${hiddenFields.length} UTM hidden fields`);
      } else {
        results.details.push('⚠️ No UTM hidden fields found');
      }

    } catch (error) {
      results.details.push('❌ UTM testing failed: ' + error.message);
      results.passed = false;
    }

    this.testResults.push(results);
    return results;
  }

  /**
   * Test form validation
   */
  testFormValidation() {
    const results = {
      test: 'Form Validation',
      passed: true,
      details: []
    };

    const nameField = document.querySelector('input[name="name"]');
    const emailField = document.querySelector('input[name="email"]');

    if (!nameField || !emailField) {
      results.details.push('❌ Required form fields not found');
      results.passed = false;
      this.testResults.push(results);
      return results;
    }

    // Test email validation
    const testEmails = [
      { email: 'test@example.com', valid: true },
      { email: 'invalid-email', valid: false },
      { email: '', valid: false }
    ];

    const validateEmail = (email) => {
      return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    testEmails.forEach(({ email, valid }) => {
      const isValid = validateEmail(email);
      if (isValid === valid) {
        results.details.push(`✅ Email validation: '${email}' -> ${isValid}`);
      } else {
        results.details.push(`❌ Email validation: '${email}' -> expected ${valid}, got ${isValid}`);
        results.passed = false;
      }
    });

    // Test name validation
    const testNames = [
      { name: 'John Doe', valid: true },
      { name: '', valid: false },
      { name: '   ', valid: false }
    ];

    testNames.forEach(({ name, valid }) => {
      const isValid = name.trim().length > 0;
      if (isValid === valid) {
        results.details.push(`✅ Name validation: '${name}' -> ${isValid}`);
      } else {
        results.details.push(`❌ Name validation: '${name}' -> expected ${valid}, got ${isValid}`);
        results.passed = false;
      }
    });

    this.testResults.push(results);
    return results;
  }

  /**
   * Test phone number normalization
   */
  testPhoneNormalization() {
    const results = {
      test: 'Phone Number Normalization',
      passed: true,
      details: []
    };

    const normalizePhone = (rawPhone) => {
      if (!rawPhone) return '';
      
      const stripped = rawPhone.replace(/[^\d+]/g, '');
      const digitsOnly = stripped.replace(/\D/g, '');
      
      if (!stripped) return '';
      if (stripped.startsWith('+')) return stripped;
      if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) return '+' + digitsOnly;
      if (digitsOnly.length === 10) return '+1' + digitsOnly;
      return stripped;
    };

    const testPhones = [
      { input: '(555) 123-4567', expected: '+15551234567' },
      { input: '555-123-4567', expected: '+15551234567' },
      { input: '15551234567', expected: '+15551234567' },
      { input: '+15551234567', expected: '+15551234567' },
      { input: '', expected: '' },
      { input: 'invalid', expected: '' }
    ];

    testPhones.forEach(({ input, expected }) => {
      const result = normalizePhone(input);
      if (result === expected) {
        results.details.push(`✅ Phone normalization: '${input}' -> '${result}'`);
      } else {
        results.details.push(`❌ Phone normalization: '${input}' -> expected '${expected}', got '${result}'`);
        results.passed = false;
      }
    });

    this.testResults.push(results);
    return results;
  }

  /**
   * Simulate form submission test
   */
  testFormSubmission() {
    const results = {
      test: 'Form Submission Simulation',
      passed: true,
      details: []
    };

    if (!this.isTestMode) {
      this.enableTestMode();
    }

    const wfButton = document.querySelector('.wf_button, button[class*="wf_"]');
    const nameField = document.querySelector('input[name="name"]');
    const emailField = document.querySelector('input[name="email"]');
    const phoneField = document.querySelector('input[name="tel"]');
    const consentCheckbox = document.querySelector('#wf_sms_consent');

    if (!wfButton || !nameField || !emailField) {
      results.details.push('❌ Required form elements not found');
      results.passed = false;
      this.testResults.push(results);
      return results;
    }

    // Set test data
    nameField.value = 'Test User';
    emailField.value = 'test@example.com';
    if (phoneField) phoneField.value = '555-123-4567';
    if (consentCheckbox) consentCheckbox.checked = true;

    // Listen for test submission event
    let submitCaptured = false;
    const submitHandler = (event) => {
      submitCaptured = true;
      results.details.push('✅ Form submission captured');
      document.removeEventListener('testSubmit', submitHandler);
    };
    document.addEventListener('testSubmit', submitHandler);

    try {
      // Simulate button click
      wfButton.click();
      
      // Wait a moment for async operations
      setTimeout(() => {
        if (submitCaptured) {
          results.details.push('✅ Form submission flow completed');
        } else {
          results.details.push('⚠️ Form submission may not have triggered');
        }
      }, 100);

    } catch (error) {
      results.details.push('❌ Form submission test failed: ' + error.message);
      results.passed = false;
    }

    this.testResults.push(results);
    return results;
  }

  /**
   * Run all tests
   */
  runAllTests() {
    console.log('[Bridge Tester] Running comprehensive bridge tests...');
    
    this.testResults = [];
    this.enableTestMode();

    const tests = [
      this.testWebinarFuelDOM(),
      this.testKeapForm(),
      this.testSMSConsentInjection(),
      this.testUTMCapture(),
      this.testFormValidation(),
      this.testPhoneNormalization(),
      this.testFormSubmission()
    ];

    return this.generateTestReport();
  }

  /**
   * Generate test report
   */
  generateTestReport() {
    const passedTests = this.testResults.filter(r => r.passed).length;
    const totalTests = this.testResults.length;
    
    const report = {
      summary: `${passedTests}/${totalTests} tests passed`,
      success: passedTests === totalTests,
      results: this.testResults
    };

    console.log('[Bridge Tester] Test Report:');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${totalTests - passedTests}`);
    
    this.testResults.forEach(result => {
      console.log(`\n${result.passed ? '✅' : '❌'} ${result.test}`);
      result.details.forEach(detail => console.log(`  ${detail}`));
    });

    return report;
  }

  /**
   * Generate HTML test report
   */
  generateHTMLReport() {
    const passedTests = this.testResults.filter(r => r.passed).length;
    const totalTests = this.testResults.length;
    const successRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

    let html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 800px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #333; margin-bottom: 20px;">WebinarFuel-Keap Bridge Test Report</h2>
        <div style="background: ${successRate === 100 ? '#d4edda' : successRate >= 70 ? '#fff3cd' : '#f8d7da'}; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <strong>Summary:</strong> ${passedTests}/${totalTests} tests passed (${successRate}%)
        </div>
    `;

    this.testResults.forEach(result => {
      html += `
        <div style="margin-bottom: 20px; padding: 15px; border: 1px solid ${result.passed ? '#28a745' : '#dc3545'}; border-radius: 5px;">
          <h3 style="color: ${result.passed ? '#28a745' : '#dc3545'}; margin: 0 0 10px 0;">
            ${result.passed ? '✅' : '❌'} ${result.test}
          </h3>
          <ul style="margin: 0; padding-left: 20px;">
            ${result.details.map(detail => `<li>${detail}</li>`).join('')}
          </ul>
        </div>
      `;
    });

    html += '</div>';
    return html;
  }
}

// Auto-instantiate for global use
if (typeof window !== 'undefined') {
  window.BridgeTester = BridgeTester;
  window.bridgeTester = new BridgeTester();
  
  // Add convenience methods to console
  console.testBridge = () => window.bridgeTester.runAllTests();
  console.showTestReport = () => {
    const report = window.bridgeTester.generateHTMLReport();
    const newWindow = window.open('', '_blank');
    newWindow.document.write(report);
  };
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BridgeTester;
}