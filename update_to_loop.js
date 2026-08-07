const fs = require('fs');
const file = 'templates/page.equipment-rental.json';
const json = JSON.parse(fs.readFileSync(file, 'utf8'));

let html = json.sections.main.blocks.er_cards_xK9mLp.settings.custom_liquid;

const newLoop = `
    {% assign rental_collection = collections['gear-rental'] %}
    {% for product in rental_collection.products %}
    <div class="er-card">
      <div class="er-img">
        <img src="{{ product.featured_image | img_url: 'master' }}" alt="{{ product.title }}">
      </div>
      <div class="er-body">
        <div class="er-name">{{ product.title }}</div>
        <div class="er-desc">
          {{ product.description }}
        </div>
        <hr class="er-hr">
        <div class="er-price-row">
          <span class="er-price">{{ product.price | money }}</span>
        </div>
        <a class="er-btn" href="{{ product.url }}">立即預訂 <span class="er-arr">→</span></a>
      </div>
    </div>
    {% endfor %}
`;

html = html.replace(/<div class="er-grid">[\s\S]*?<\/div>\s*<\/div>/, `<div class="er-grid">\n${newLoop}\n  </div>\n</div>`);

json.sections.main.blocks.er_cards_xK9mLp.settings.custom_liquid = html;
fs.writeFileSync(file, JSON.stringify(json, null, 2));
console.log("Updated to dynamic loop successfully!");
