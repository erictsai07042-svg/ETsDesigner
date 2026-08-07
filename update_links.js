const fs = require('fs');
const file = 'templates/page.equipment-rental.json';
const json = JSON.parse(fs.readFileSync(file, 'utf8'));

let html = json.sections.main.blocks.er_cards_xK9mLp.settings.custom_liquid;

// Card 1
html = html.replace(
  /<div class="er-name">單板鞋組<\/div>[\s\S]*?<a class="er-btn" href="\/products\/gear-rent-protect">/,
  match => match.replace('/products/gear-rent-protect', '/products/gear-rent-sboard-boots')
);

// Card 2
html = html.replace(
  /<div class="er-name">雪服<\/div>[\s\S]*?<a class="er-btn" href="\/products\/gear-rent-protect">/,
  match => match.replace('/products/gear-rent-protect', '/products/gear-rent-jacket-pant')
);

// Card 3
html = html.replace(
  /<div class="er-name">安全帽<\/div>[\s\S]*?<a class="er-btn" href="\/products\/gear-rent-protect">/,
  match => match.replace('/products/gear-rent-protect', '/products/gear-rent-helmet')
);

// Card 4
html = html.replace(
  /<div class="er-name">滑雪護具<\/div>[\s\S]*?<a class="er-btn" href="\/products\/gear-rent-protect">/,
  match => match.replace('/products/gear-rent-protect', '/products/gear-rental-protection')
);

// Card 5
html = html.replace(
  /<div class="er-name">雪鏡<\/div>[\s\S]*?<a class="er-btn" href="\/products\/gear-rent-protect">/,
  match => match.replace('/products/gear-rent-protect', '/products/gear-rent-glass')
);

// Card 6
html = html.replace(
  /<div class="er-name">雪服帽鏡組<\/div>[\s\S]*?<a class="er-btn" href="\/products\/gear-rent-protect">/,
  match => match.replace('/products/gear-rent-protect', '/products/full-set-bundle')
);

json.sections.main.blocks.er_cards_xK9mLp.settings.custom_liquid = html;
fs.writeFileSync(file, JSON.stringify(json, null, 2));
console.log("Updated URLs successfully!");
