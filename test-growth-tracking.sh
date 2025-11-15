#!/bin/bash

# Test the Plant Growth Tracking & Memory System
# Run this to verify everything is working

echo "================================================"
echo "PLANT GROWTH TRACKING VERIFICATION TEST"
echo "================================================"
echo ""

# Test 1: Check if server is running
echo "Test 1: Check if server is running..."
if curl -s http://localhost:3000/plants > /dev/null 2>&1; then
    echo "✅ Server is running"
else
    echo "❌ Server is NOT running. Start with: npm start"
    exit 1
fi

echo ""

# Test 2: Get plants and show current data
echo "Test 2: Retrieving current plants..."
echo ""
curl -s http://localhost:3000/plants | jq '.' 2>/dev/null || curl -s http://localhost:3000/plants

echo ""
echo "================================================"
echo ""

# Test 3: Show what to verify
echo "WHAT TO VERIFY IN THE OUTPUT ABOVE:"
echo ""
echo "1. PROFILE EXISTS?"
echo "   Look for 'profile' object in each plant"
echo "   Should contain: adoptedDate, careScore, healthStatus, careHistory"
echo ""
echo "2. GROWTH CALCULATED?"
echo "   For plants with 2+ images, check:"
echo "   - images[0].area = number (not null)"
echo "   - images[1].area = number (not null)"
echo "   - If both have areas, growth should calculate"
echo ""
echo "3. LAST WATERED SET?"
echo "   If you've asked the plant about watering:"
echo "   - profile.lastWatered should have a date"
echo "   - profile.careHistory should have entries"
echo ""
echo "4. SPECIES IN PROFILE?"
echo "   - Each plant should have 'species' field"
echo "   - Profile should include species info"
echo ""
echo "================================================"
echo ""
echo "NEXT STEPS:"
echo ""
echo "1. Upload a photo of 'My Plant' again"
echo "2. Open chat with the plant"
echo "3. Ask: 'What species are you?' or 'How much have I grown?'"
echo "4. The plant should mention:"
echo "   - Its nickname"
echo "   - Days since adoption"
echo "   - Growth percentage"
echo "   - Health status (thriving/stable/stressed)"
echo ""
echo "5. Type: 'I watered you yesterday'"
echo "6. Open db.json and verify:"
echo "   - profile.lastWatered was updated"
echo "   - careHistory has a new 'watered' entry"
echo ""
echo "================================================"
