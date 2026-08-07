const fs = require('fs');
const file = 'templates/page.equipment-rental.json';
let json = JSON.parse(fs.readFileSync(file, 'utf8'));

let html = json.sections.main.blocks.er_cards_xK9mLp.settings.custom_liquid;

// Fix the handle
html = html.replace(
  /{% assign p4 = all_products\['gear-rental-protection'\] \| default: all_products\['protection-gear'\] \| default: all_products\['ski-protection'\] %}/g,
  "{% assign p4 = all_products['gear-rent-protect'] | default: all_products['gear-rental-protection'] | default: all_products['protection-gear'] | default: all_products['ski-protection'] %}"
);

// Fix the URL fallback
html = html.replace(
  /<a class="er-btn" href="{{ p4\.url \| default: '\/products\/gear-rental-protection' }}">/g,
  '<a class="er-btn" href="{{ p4.url | default: \'/products/gear-rent-protect\' }}">'
);

json.sections.main.blocks.er_cards_xK9mLp.settings.custom_liquid = html;
fs.writeFileSync(file, JSON.stringify(json, null, 2));
console.log("Fixed protective gear URL successfully!");
