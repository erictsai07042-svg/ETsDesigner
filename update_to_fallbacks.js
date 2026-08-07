const fs = require('fs');
const file = 'templates/page.equipment-rental.json';
const json = JSON.parse(fs.readFileSync(file, 'utf8'));

let html = json.sections.main.blocks.er_cards_xK9mLp.settings.custom_liquid;

const newLoop = `
    {% assign product_handles = "gear-rental,snow-wear,helmet,gear-rental-protection,goggles,full-set-bundle,protection-gear,ski-protection,gear-rent-sboard-boots,gear-rent-jacket-pant,gear-rent-helmet,gear-rent-glass" | split: "," %}
    {% assign rendered_ids = "" %}
    {% assign count = 0 %}
    {% for handle in product_handles %}
      {% if count >= 6 %}{% break %}{% endif %}
      {% assign product = all_products[handle] %}
      {% if product != blank %}
        {% assign pid = product.id | append: "," %}
        {% unless rendered_ids contains pid %}
          {% assign rendered_ids = rendered_ids | append: pid %}
          {% assign count = count | plus: 1 %}
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
        {% endunless %}
      {% endif %}
    {% endfor %}
`;

// Replace the previous loop with the new fallback logic loop
html = html.replace(/{% assign product_handles = "gear-rent-sboard-boots[\s\S]*?{% endfor %}/, newLoop.trim());

json.sections.main.blocks.er_cards_xK9mLp.settings.custom_liquid = html;
fs.writeFileSync(file, JSON.stringify(json, null, 2));
console.log("Updated loop with fallbacks and deduplication successfully!");
