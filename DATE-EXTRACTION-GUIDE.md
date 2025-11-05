# WebinarFuel Date Extraction Guide

This guide explains how to extract the webinar date from your WebinarFuel widget and display it dynamically on your page.

## 🎯 Overview

The WFBridge now includes utilities to:
- Extract webinar dates/schedules from WebinarFuel widgets
- Automatically update page elements with the extracted date
- Support custom formatting and prefixes/suffixes

## 📋 API Reference

### `WFBridge.getWebinarDate(targetId)`

Extracts the webinar date from the WebinarFuel widget.

**Parameters:**
- `targetId` (optional): The WebinarFuel target ID. If not provided, uses the configured default.

**Returns:** 
- String containing the date/schedule, or `null` if not found

**Example:**
```javascript
// Get the date from the default WebinarFuel widget
const webinarDate = WFBridge.getWebinarDate();
console.log(webinarDate); // e.g., "December 15, 2025 at 2:00 PM EST"
```

---

### `WFBridge.updateElementWithDate(selector, options)`

Updates a page element with the extracted webinar date.

**Parameters:**
- `selector` (required): CSS selector for the element to update
- `options` (optional): Configuration object with the following properties:
  - `targetId` (string): WebinarFuel target ID (defaults to configured ID)
  - `format` (function): Custom formatting function for the date
  - `prefix` (string): Text to add before the date
  - `suffix` (string): Text to add after the date
  - `attribute` (string): Update an attribute instead of textContent

**Returns:** 
- `true` if successful, `false` if element not found or date unavailable

**Examples:**

#### Basic Usage
```javascript
// Update a headline with the webinar date
WFBridge.updateElementWithDate('.webinar-headline');
```

#### With Prefix/Suffix
```javascript
// Add "Join us on " before the date
WFBridge.updateElementWithDate('.webinar-date', {
  prefix: 'Join us on ',
  suffix: ' - Register now!'
});
```

#### Custom Formatting
```javascript
// Format the date with a custom function
WFBridge.updateElementWithDate('.webinar-date', {
  prefix: 'Save the date: ',
  format: function(dateStr) {
    // Your custom formatting logic
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }
});
```

#### Update Attribute Instead of Text
```javascript
// Update a data attribute
WFBridge.updateElementWithDate('.webinar-container', {
  attribute: 'data-webinar-date'
});
```

---

## 🚀 Common Use Cases

### 1. Dynamic Headline
Replace a static headline with the selected webinar date:

```html
<h1 class="webinar-headline">Upcoming Webinar</h1>

<script>
  // Wait for bridge to initialize
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
      WFBridge.updateElementWithDate('.webinar-headline', {
        prefix: 'Join us on '
      });
    }, 2000); // Give WebinarFuel time to load
  });
</script>
```

### 2. Multiple Elements
Update several elements with the same date:

```javascript
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(function() {
    const selectors = ['.hero-date', '.footer-date', '.countdown-date'];
    selectors.forEach(function(selector) {
      WFBridge.updateElementWithDate(selector, {
        prefix: 'Next session: '
      });
    });
  }, 2000);
});
```

### 3. Conditional Display
Show/hide elements based on whether a date is available:

```javascript
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(function() {
    const date = WFBridge.getWebinarDate();
    
    if (date) {
      // Update element with date
      WFBridge.updateElementWithDate('.webinar-info', {
        prefix: 'Next webinar: '
      });
      
      // Show the element
      document.querySelector('.webinar-info').style.display = 'block';
    } else {
      // Hide if no date available
      document.querySelector('.webinar-info').style.display = 'none';
    }
  }, 2000);
});
```

---

## 🔍 How It Works

The date extraction uses multiple strategies to find the webinar date:

1. **Strategy 1:** Checks `window._wf` array for schedule data
2. **Strategy 2:** Searches DOM elements within the WebinarFuel container for date/time/schedule classes
3. **Strategy 3:** Checks data attributes on the container
4. **Strategy 4:** Attempts to call `window.WF.getSchedule()` if available

This ensures maximum compatibility across different WebinarFuel configurations.

---

## ⚙️ Technical Notes

- **Timing:** WebinarFuel widgets load asynchronously. Always wait 1-2 seconds after page load before extracting dates
- **Multiple Widgets:** If you have multiple WebinarFuel widgets on the same page, specify the `targetId` parameter
- **Debug Mode:** Enable debug mode (`?debug=true` in URL) to see detailed logs about date extraction
- **Browser Compatibility:** Works in all modern browsers

---

## 🐛 Troubleshooting

### Date not appearing?

1. **Check timing:** Make sure you're waiting long enough for WebinarFuel to load
   ```javascript
   setTimeout(function() {
     WFBridge.updateElementWithDate('.my-headline');
   }, 3000); // Try increasing the delay
   ```

2. **Enable debug mode:** Add `?debug=true` to your URL and check the console for logs

3. **Verify selector:** Ensure your CSS selector matches the element you want to update
   ```javascript
   const element = document.querySelector('.my-headline');
   console.log(element); // Should not be null
   ```

4. **Check WebinarFuel data:** Manually inspect the date
   ```javascript
   const date = WFBridge.getWebinarDate();
   console.log('Extracted date:', date);
   ```

### Multiple widgets not working?

Specify the target ID explicitly:
```javascript
WFBridge.updateElementWithDate('.headline', {
  targetId: 'your-specific-wf-target-id'
});
```

---

## 📞 Support

For issues or questions, enable debug mode and check the browser console for detailed logs.

### Debug Commands (when debug mode is on):
```javascript
// Get date with full logging
WFBridge.getWebinarDate();

// Check available data
console.log(window._wf);
console.log(window.WF);
```
