const fs = require('fs');

function isDark(colorStr) {
  if (!colorStr) return false;
  colorStr = colorStr.trim().toLowerCase();
  
  if (colorStr.startsWith('rgba') || colorStr === 'transparent') {
    return false;
  }
  
  if (colorStr.startsWith('#')) {
    let hex = colorStr.slice(1);
    if (hex.length === 3) hex = hex.split('').map(c => c+c).join('');
    if (hex.length === 8) hex = hex.slice(0, 6);
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0,2), 16);
      const g = parseInt(hex.slice(2,4), 16);
      const b = parseInt(hex.slice(4,6), 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      return brightness < 128;
    }
  }
  return false;
}

const file = 'c:/Users/erict/shopify-theme/config/settings_data.json';
const rawContent = fs.readFileSync(file, 'utf8');

const match = rawContent.match(/^(\/\*[\s\S]*?\*\/\s*)([\s\S]*)$/);
let comments = '';
let jsonContent = rawContent;

if (match) {
  comments = match[1];
  jsonContent = match[2];
}

const data = JSON.parse(jsonContent);
const schemes = data.current.color_schemes;

for (const [key, val] of Object.entries(schemes)) {
  const bg = val.settings.background;
  const dark = isDark(bg);
  
  if (dark) {
    val.settings.primary_button_background = '#3a7ab5';
    val.settings.primary_button_text = '#ffffff';
    val.settings.primary_button_border = '#3a7ab5';
    val.settings.primary_button_hover_background = '#7ab3d4';
    val.settings.primary_button_hover_text = '#1a2e4a';
    val.settings.primary_button_hover_border = '#7ab3d4';
    
    val.settings.secondary_button_background = 'rgba(0,0,0,0)';
    val.settings.secondary_button_text = '#e8f4fa';
    val.settings.secondary_button_border = '#e8f4fa';
    val.settings.secondary_button_hover_background = '#e8f4fa';
    val.settings.secondary_button_hover_text = '#1a2e4a';
    val.settings.secondary_button_hover_border = '#e8f4fa';
  } else {
    val.settings.primary_button_background = '#1a2e4a';
    val.settings.primary_button_text = '#ffffff';
    val.settings.primary_button_border = '#1a2e4a';
    val.settings.primary_button_hover_background = '#2d5f8a';
    val.settings.primary_button_hover_text = '#ffffff';
    val.settings.primary_button_hover_border = '#2d5f8a';
    
    val.settings.secondary_button_background = '#e8f4fa';
    val.settings.secondary_button_text = '#1a2e4a';
    val.settings.secondary_button_border = '#b8d9ed';
    val.settings.secondary_button_hover_background = '#ffffff';
    val.settings.secondary_button_hover_text = '#1a2e4a';
    val.settings.secondary_button_hover_border = '#3a7ab5';
  }
}

fs.writeFileSync(file, comments + JSON.stringify(data, null, 2) + '\n');
console.log('Successfully updated settings_data.json!');
