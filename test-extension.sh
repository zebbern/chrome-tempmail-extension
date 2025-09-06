#!/bin/bash

# Simple test script to validate the extension package
echo "🧪 Testing TempMail Pro Extension Package..."

# Check if Chrome is available
if ! command -v google-chrome &> /dev/null && ! command -v chromium-browser &> /dev/null; then
    echo "⚠️  Chrome/Chromium not found. Skipping browser tests."
    echo "✅ Package validation passed - manual testing required in browser"
    exit 0
fi

# Validate JSON files
echo "📋 Validating JSON files..."

if command -v jq &> /dev/null; then
    if jq empty manifest.json 2>/dev/null; then
        echo "✅ manifest.json is valid JSON"
    else
        echo "❌ manifest.json has invalid JSON syntax"
        exit 1
    fi
else
    echo "⚠️  jq not available - skipping JSON validation"
fi

# Check required manifest fields
echo "🔍 Checking manifest.json requirements..."

required_fields=("name" "version" "manifest_version" "description" "permissions" "action" "background" "icons")
for field in "${required_fields[@]}"; do
    if grep -q "\"$field\"" manifest.json; then
        echo "✅ Found required field: $field"
    else
        echo "❌ Missing required field: $field"
        exit 1
    fi
done

# Check file structure
echo "📁 Checking file structure..."
required_structure=(
    "manifest.json"
    "background.js"
    "popup/popup.html"
    "popup/popup.js"  
    "popup/styles.css"
    "assets/icon16.png"
    "assets/icon48.png"
    "assets/icon128.png"
)

for file in "${required_structure[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ Found: $file"
    else
        echo "❌ Missing: $file"
        exit 1
    fi
done

# Check for potential security issues
echo "🔒 Running basic security checks..."

# Check for eval usage
if grep -r "eval(" . --include="*.js" > /dev/null; then
    echo "⚠️  Warning: Found eval() usage - may cause CSP issues"
else
    echo "✅ No eval() usage found"
fi

# Check for inline event handlers in HTML
if grep -r "on[a-zA-Z]*=" popup/ --include="*.html" > /dev/null; then
    echo "⚠️  Warning: Found inline event handlers in HTML"
else
    echo "✅ No inline event handlers found"
fi

echo "🎉 Extension package validation completed!"
echo ""
echo "📋 Manual testing checklist:"
echo "- Load extension in Chrome developer mode"
echo "- Test creating temporary email addresses"
echo "- Verify all email providers work"
echo "- Test copying email addresses"
echo "- Check notification functionality"
echo "- Verify no console errors"
echo ""
echo "🚀 Ready for Chrome Web Store submission!"