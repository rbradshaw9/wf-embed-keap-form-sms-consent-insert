# WebinarFuel API & Data Structure Notes

## Key Findings from embed_v2.js Analysis

### Global Variables
WebinarFuel stores configuration data in several global objects:

1. **`window._wf`** (Array)
   - Contains configuration objects for each widget instance
   - Each object has properties like:
     - `id` - Widget ID
     - `cid` - Session CID
     - `target` - Target element selector or ID
     - `hash` - Optional hash identifier
     - More properties available from API response

2. **`window.WF_API`** (Object)
   - Methods:
     - `getSession(callback, cid)` - Fetches session data by CID
     - `all()` - Returns all widget instances
     - `find(uniqId)` - Finds specific widget instance

3. **`window.WF`** (May not always be available)
   - Not consistently available across all implementations

### API Endpoints Used by embed_v2.js

**Fetch Widget Data:**
```
GET https://embed.webby.app/embed/v2/widgets/{widget_id}
Query Params:
  - tz: timezone (URL encoded)
  - rf: referrer (full URL)
  - rp: referrer path
  - cid: session CID (optional)
  - version_id: specific version ID (optional)
  - preview: true/false
```

**Response Structure:**
```javascript
{
  version: {
    id: Number,
    widget_id: Number,
    name: String,
    locale: String, // "en", "fr", "de", etc.
    widget_type: String, // "floater", "modal", "embed", "thank_you", "registration_page"
    formatted_sessions: Array<{
      id: Number,
      scheduled_at: String, // ISO8601: "2025-11-08T15:00:00Z"
      formatted_scheduled_at: String, // Human-readable: "Sat, Nov 8th 2025 @ 3:00 PM AST"
      type: String,
      running: Boolean
    }>,
    webinar: {
      id: Number,
      account_id: Number,
      cid: String,
      name: String,
      hosts: Array<{
        email: String,
        first_name: String,
        last_name: String,
        avatar_url: String
      }>,
      integration_html_forms: Array // Custom forms data
    },
    options: {
      layout: {
        width: String,
        align: String,
        // ...more layout options
      },
      handler: {}, // For floater type
      // ...element configurations
    },
    steps: Array<{
      id: Number,
      slug: String,
      success: Boolean,
      rows: Array<{
        columns: Array<{
          elements: Array<{
            type: String, // "Widget::ElementDatetime", etc.
            options: Object
          }>
        }>
      }>
    }>
  },
  thank_you_data: {
    cid: String,
    email: String,
    first_name: String,
    last_name: String,
    session: {
      id: Number,
      scheduled_at: String,
      formatted_scheduled_at: String,
      join_url: String,
      calendar_urls: {
        ics: String,
        google: String,
        vcs: String
      }
    },
    join_url: String
  }
}
```

**Track Viewer:**
```
GET https://embed.webby.app/embed/v2/viewers/track
Query Params:
  - type: "impression" | "visit"
  - wid: webinar_id
  - aid: account_id
  - wiid: widget_id
  - wivid: widget_version_id
  - wsid: webinar_session_id
  - source: source identifier
  - token: visitor token
```

**Get Session:**
```
GET https://embed.webby.app/embed/v2/sessions/{cid}
```

**Subscribe (Register):**
```
POST https://embed.webby.app/embed/v2/widgets/{widget_id}/subscribe
Body: {
  token: String,
  version_id: Number,
  viewer: {
    webinar_session_id: Number,
    scheduled_at: String,
    sent_at: String,
    is_valid: Boolean,
    time_zone: String,
    email: String,
    phone: String,
    first_name: String,
    last_name: String,
    custom_fields: Object,
    // ...more fields
  },
  recaptcha_token: String,
  recaptcha_action: String
}
```

### Date Storage Priority (Most Reliable → Least Reliable)

1. **`window._wf` array** - Primary data store
   - Check each object's `version.formatted_sessions` array
   - Each session has both `scheduled_at` (ISO) and `formatted_scheduled_at` (readable)
   
2. **API Response** - When widget loads
   - `response.version.formatted_sessions[0].formatted_scheduled_at`
   - `response.thank_you_data.session.formatted_scheduled_at` (on thank you page)

3. **DOM Elements** - Fallback only
   - `.wf_datetime` - Contains formatted date after modal renders
   - `.wf_dropdown_value` - Alternative location in date selector

### Date Formats

**ISO8601 (scheduled_at):**
```
"2025-11-08T15:00:00Z"
"2025-11-08T15:00:00-04:00"
```

**Human-Readable (formatted_scheduled_at):**
```
"Sat, Nov 8th 2025 @ 3:00 PM AST"
"Mon, Dec 2nd 2025 @ 2:00 PM EST"
```

### Implementation Notes

**Best Practice for Date Extraction:**
1. Check `window._wf` array first (available immediately)
2. Look for `formatted_scheduled_at` in session data
3. Fallback to DOM scraping only if needed
4. Handle both date formats (ISO8601 + WebinarFuel text format)

**Why window._wf is Most Reliable:**
- Populated immediately when embed loads
- Contains full API response data
- Doesn't require DOM to be fully rendered
- Works even if date selector is hidden/excluded from widget

**Current Generator Implementation:**
✅ Checks `window._wf` first
✅ Handles both date formats
✅ Falls back to DOM if needed
✅ Includes localStorage check
✅ Comprehensive logging for debugging

### Cookie/Storage Keys Used by WebinarFuel

- `_webby_visitor_token` - Visitor tracking token (30 day expiry)
- `_webby_visitor_visitedWidgets` - JSON array of visited widget IDs
- `_wf_cid` - Sequence CID in localStorage (if `forwardCid` enabled)
- `_fbp` - Facebook Pixel data
- `clickmagick_cmc` - ClickMagick tracking

### Timezone Handling

WebinarFuel uses **Day.js** with timezone plugin:
- Default: Browser's `Intl.DateTimeFormat().resolvedOptions().timeZone`
- Fallback: "UTC" if unknown
- API accepts `tz` parameter for conversion

### Element Classes for DOM Scraping (Fallback)

```css
.wf_datetime          /* Contains formatted date in modal */
.wf_dropdown_value    /* Alternative date location */
.wf_element           /* Widget elements */
.wf_row               /* Layout rows */
.wf_column            /* Layout columns */
.wf_target_{id}       /* Target container */
```

---

## Recommendations for Our Bridge

1. **Primary Strategy:** Check `window._wf[0].version.formatted_sessions[0].formatted_scheduled_at`
2. **Retry Logic:** WebinarFuel data populates asynchronously, so retry mechanism is still needed
3. **Format Handling:** Our parseWFDate() already handles both ISO and text formats ✅
4. **Error Recovery:** If `window._wf` is empty, fall back to DOM scraping

This approach ensures date extraction works even when:
- Date selector is excluded from widget
- Modal hasn't been opened yet
- Page loads slowly
- Multiple embeds on same page
