const fs = require('fs');
let content = fs.readFileSync('c:/Users/erict/shopify-theme/config/settings_data.json', 'utf8');
content = content.replace(/\/\*[\s\S]*?\*\//, '').trim();

const data = JSON.parse(content);
const schemes = data.current.color_schemes;

for (const [key, val] of Object.entries(schemes)) {
  console.log(`\n--- ${key} ---`);
  console.log(`Background: ${val.settings.background}`);
  console.log(`Primary Btn Bg: ${val.settings.primary_button_background}`);
  console.log(`Primary Btn Text: ${val.settings.primary_button_text}`);
  console.log(`Primary Btn Hover Bg: ${val.settings.primary_button_hover_background}`);
  console.log(`Secondary Btn Bg: ${val.settings.secondary_button_background}`);
  console.log(`Secondary Btn Text: ${val.settings.secondary_button_text}`);
  console.log(`Secondary Btn Border: ${val.settings.secondary_button_border}`);
}
