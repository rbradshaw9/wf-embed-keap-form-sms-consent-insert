# WebinarFuel ↔ Keap Bridge Generator

🚀 **Bulletproof integration bridge** for connecting WebinarFuel forms to Keap/Infusionsoft with SMS consent handling.

## ✨ Features

- **🔧 Bulletproof Integration**: Multiple fallback strategies ensure reliable form submissions
- **📱 SMS Consent Management**: Automatic SMS consent checkbox injection with compliance handling  
- **🎯 UTM Tracking**: Preserves all referral tracking, UTM parameters, and campaign data
- **🐛 Debug Mode**: Comprehensive logging with `?debug=true` URL parameter
- **🎨 Smart Placement**: Intelligent SMS consent positioning (just above submit button)
- **📞 Phone Number Logic**: Conditional phone sharing based on consent status
- **🚀 No Double Submissions**: Single submission path prevents duplicate leads

## 🛠️ How It Works

1. **Paste WebinarFuel embed code** → Get enhanced version with bridge
2. **Paste Keap form HTML** → Get custom HTML block with hidden form  
3. **Deploy both blocks** → Automatic bridging with SMS consent
4. **Monitor with debug mode** → `?debug=true` for detailed logging

## 📋 Submission Flow

- **User fills WebinarFuel form** → Name, email, phone captured
- **SMS consent checkbox appears** → Just above submit button (clean, no borders)
- **Form submits to Keap** → Always includes phone + consent status
- **Form submits to WebinarFuel** → Only includes phone if consent given
- **UTM tracking preserved** → All referral data passed through

## 🎯 SMS Consent Logic

- **Keap/Infusionsoft**: Always receives phone number + consent checkbox status
- **WebinarFuel**: Only receives phone number if SMS consent is checked
- **Compliance**: Phone is cleared from WebinarFuel if no consent given

## 🚀 Live Demo

Visit the deployed generator: [Your Vercel URL here]

## � Debug Mode

Add `?debug=true` to any page URL to see:
- Element detection strategies
- SMS consent injection process  
- Phone number handling decisions
- Form submission flow
- UTM parameter capture
- Error handling and fallbacks

## 🔧 Recent Fixes

- ✅ **DOM Insertion Fix**: Resolved SMS consent placement errors
- ✅ **Double Submission Fix**: Eliminated duplicate Infusionsoft submissions  
- ✅ **Placement Optimization**: Consent appears exactly above submit button
- ✅ **Clean Styling**: Removed horizontal borders for professional appearance

## 📱 Browser Support

- ✅ Chrome/Safari/Firefox/Edge (modern versions)
- ✅ Mobile responsive
- ✅ Cross-origin compatible
- ✅ Ad-blocker resistant

---

**Built with ❤️ for reliable WebinarFuel → Keap integrations**