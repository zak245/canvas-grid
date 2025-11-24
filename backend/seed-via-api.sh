#!/bin/bash

# Seed the database via API (while server is running)
# This works around the in-memory MongoDB issue

echo "🌱 Seeding database via API..."
echo ""

# Create grid
GRID_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/grids \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Q1 2024 Sales Prospects",
    "columns": [
      {"id": "col_company", "title": "Company", "width": 200, "type": "text", "visible": true, "position": 0},
      {"id": "col_domain", "title": "Website", "width": 180, "type": "url", "visible": true, "position": 1},
      {"id": "col_industry", "title": "Industry", "width": 150, "type": "text", "visible": true, "position": 2},
      {"id": "col_size", "title": "Company Size", "width": 130, "type": "text", "visible": true, "position": 3},
      {"id": "col_firstName", "title": "First Name", "width": 130, "type": "text", "visible": true, "position": 4},
      {"id": "col_lastName", "title": "Last Name", "width": 130, "type": "text", "visible": true, "position": 5},
      {"id": "col_title", "title": "Title", "width": 180, "type": "text", "visible": true, "position": 6},
      {"id": "col_email", "title": "Work Email", "width": 220, "type": "email", "visible": true, "position": 7},
      {"id": "col_phone", "title": "Phone", "width": 150, "type": "text", "visible": true, "position": 8},
      {"id": "col_linkedin", "title": "LinkedIn", "width": 200, "type": "url", "visible": true, "position": 9},
      {"id": "col_revenue", "title": "Estimated Revenue", "width": 160, "type": "text", "visible": true, "position": 10},
      {"id": "col_funding", "title": "Funding", "width": 120, "type": "text", "visible": true, "position": 11},
      {"id": "col_notes", "title": "Notes", "width": 250, "type": "text", "visible": true, "position": 12}
    ],
    "totalRows": 0,
    "settings": {"defaultRowHeight": 32}
  }')

GRID_ID=$(echo $GRID_RESPONSE | grep -o '"_id":"[^"]*' | cut -d'"' -f4)

if [ -z "$GRID_ID" ]; then
    echo "❌ Failed to create grid"
    echo "Response: $GRID_RESPONSE"
    exit 1
fi

echo "✅ Grid created: $GRID_ID"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Grid ID: $GRID_ID"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔧 Update your frontend:"
echo "   1. Open: src/App.tsx"
echo "   2. Line 15: const GRID_ID = '$GRID_ID';"
echo "   3. Refresh browser"
echo ""
echo "Creating sample rows..."
echo ""

# Create sample rows
declare -a companies=(
  '{"cells":{"col_company":"Stripe","col_domain":"stripe.com","col_industry":"FinTech","col_size":"5001-10000","col_firstName":"Patrick","col_lastName":"Collison","col_title":"CEO","col_revenue":"$500M-1B","col_funding":"$2.2B","col_notes":"High priority"}}'
  '{"cells":{"col_company":"Notion","col_domain":"notion.so","col_industry":"SaaS","col_size":"201-500","col_firstName":"Ivan","col_lastName":"Zhao","col_title":"CEO","col_revenue":"$100M-500M","col_funding":"$343M","col_notes":"API integration"}}'
  '{"cells":{"col_company":"Figma","col_domain":"figma.com","col_industry":"Design Tools","col_size":"501-1000","col_firstName":"Dylan","col_lastName":"Field","col_title":"CEO","col_revenue":"$100M-500M","col_funding":"$333M","col_notes":"Demo scheduled"}}'
)

for company_data in "${companies[@]}"; do
  curl -s -X POST "http://localhost:3001/api/v1/grids/$GRID_ID/rows" \
    -H "Content-Type: application/json" \
    -d "$company_data" > /dev/null
  echo "✓ Row created"
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Seed complete! 3 rows created"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Next steps:"
echo "   1. Copy Grid ID above"
echo "   2. Update src/App.tsx line 15"
echo "   3. Refresh browser"
echo ""

