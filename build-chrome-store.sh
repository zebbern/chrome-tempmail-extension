#!/bin/bash

# Chrome Web Store Package Builder for TempMail Pro
# This script creates a clean package ready for Chrome Web Store submission

echo "🚀 Building TempMail Pro for Chrome Web Store submission..."

# Create build directory
BUILD_DIR="chrome-store-package"
rm -rf $BUILD_DIR
mkdir -p $BUILD_DIR

echo "📁 Creating package directory..."

# Copy essential files for the extension
cp manifest.json $BUILD_DIR/
cp background.js $BUILD_DIR/
cp tempMailApis.js $BUILD_DIR/
cp -r popup/ $BUILD_DIR/
cp -r assets/ $BUILD_DIR/
cp -r api/ $BUILD_DIR/

# Copy documentation
cp LICENSE $BUILD_DIR/
cp README.md $BUILD_DIR/
cp PRIVACY_POLICY.md $BUILD_DIR/

echo "🔍 Validating package structure..."

# Check required files exist
required_files=(
    "manifest.json"
    "background.js"
    "popup/popup.html"
    "popup/popup.js"
    "popup/styles.css"
    "assets/icon16.png"
    "assets/icon48.png"
    "assets/icon128.png"
    "PRIVACY_POLICY.md"
)

all_files_present=true
for file in "${required_files[@]}"; do
    if [ ! -f "$BUILD_DIR/$file" ]; then
        echo "❌ Missing required file: $file"
        all_files_present=false
    else
        echo "✅ Found: $file"
    fi
done

if [ "$all_files_present" = true ]; then
    echo "🎉 All required files present!"
    
    # Create ZIP file for Chrome Web Store
    echo "📦 Creating ZIP package..."
    cd $BUILD_DIR
    zip -r "../tempmail-pro-chrome-store.zip" . -x "*.DS_Store" "*.git*"
    cd ..
    
    echo "✅ Package created: tempmail-pro-chrome-store.zip"
    echo "📊 Package size: $(du -h tempmail-pro-chrome-store.zip | cut -f1)"
    
    echo ""
    echo "📋 Next steps:"
    echo "1. Go to Chrome Web Store Developer Dashboard"
    echo "2. Upload tempmail-pro-chrome-store.zip"
    echo "3. Complete store listing with information from STORE_LISTING.md"
    echo "4. Add screenshots and promotional images"
    echo "5. Submit for review"
    echo ""
    echo "📚 For detailed instructions, see DEVELOPER_INFO.md"
    
else
    echo "❌ Package validation failed. Please fix missing files."
    exit 1
fi