const fs = require('fs');
const file = 'templates/page.equipment-rental.json';
const json = JSON.parse(fs.readFileSync(file, 'utf8'));

let html = json.sections.main.blocks.er_cards_xK9mLp.settings.custom_liquid;

const newContent = `
  <div class="er-grid">
    <!-- 1. 單板鞋組 -->
    {% assign p1 = all_products['gear-rent-sboard-boots'] | default: all_products['gear-rental'] | default: all_products['ski-board-shoes'] %}
    <div class="er-card">
      <div class="er-img">
        <img src="{% if p1 != blank and p1.featured_image %}{{ p1.featured_image | img_url: 'master' }}{% else %}https://cdn.shopify.com/s/files/1/0651/9413/1539/files/snowboard_08443b03-c1ad-4d0e-8871-86f7cb537a52.jpg?v=1777541521&width=800{% endif %}" alt="單板鞋組">
      </div>
      <div class="er-body">
        <div class="er-name">{{ p1.title | default: '單板鞋組' }}</div>
        <div class="er-desc">
          <span>高品質雪板搭配舒適雪鞋</span><br>
          <span>適合各程度滑雪者</span>
        </div>
        <hr class="er-hr">
        <div class="er-price-row">
          <span class="er-price">{% if p1 != blank %}{{ p1.price | money }}{% else %}NT$1,200{% endif %}</span>
        </div>
        <a class="er-btn" href="{{ p1.url | default: '/products/gear-rent-sboard-boots' }}">立即預訂 <span class="er-arr">→</span></a>
      </div>
    </div>

    <!-- 2. 雪服 -->
    {% assign p2 = all_products['gear-rent-jacket-pant'] | default: all_products['snow-wear'] | default: all_products['ski-wear-suit'] %}
    <div class="er-card">
      <div class="er-img">
        <img src="{% if p2 != blank and p2.featured_image %}{{ p2.featured_image | img_url: 'master' }}{% else %}https://cdn.shopify.com/s/files/1/0651/9413/1539/files/ski_jacket_a9ccc300-a237-4169-996b-4270d76df855.jpg?v=1765072903&width=800{% endif %}" alt="雪服">
      </div>
      <div class="er-body">
        <div class="er-name">{{ p2.title | default: '雪服' }}</div>
        <div class="er-desc">
          <span>防水透氣保暖材質</span><br>
          <span>多種顏色尺寸可選</span>
        </div>
        <hr class="er-hr">
        <div class="er-price-row">
          <span class="er-price">{% if p2 != blank %}{{ p2.price | money }}{% else %}NT$800{% endif %}</span>
        </div>
        <a class="er-btn" href="{{ p2.url | default: '/products/gear-rent-jacket-pant' }}">立即預訂 <span class="er-arr">→</span></a>
      </div>
    </div>

    <!-- 3. 安全帽 -->
    {% assign p3 = all_products['gear-rent-helmet'] | default: all_products['helmet'] | default: all_products['ski-helmet'] %}
    <div class="er-card">
      <div class="er-img">
        <img src="{% if p3 != blank and p3.featured_image %}{{ p3.featured_image | img_url: 'master' }}{% else %}https://cdn.shopify.com/s/files/1/0651/9413/1539/files/helm_7904803b-a415-496c-a907-782c0fb43585.jpg?v=1777541462&width=800{% endif %}" alt="安全帽">
      </div>
      <div class="er-body">
        <div class="er-name">{{ p3.title | default: '安全帽' }}</div>
        <div class="er-desc">
          <span>輕量舒適,安全防護</span><br>
          <span>可調式大小設計</span>
        </div>
        <hr class="er-hr">
        <div class="er-price-row">
          <span class="er-price">{% if p3 != blank %}{{ p3.price | money }}{% else %}NT$300{% endif %}</span>
        </div>
        <a class="er-btn" href="{{ p3.url | default: '/products/gear-rent-helmet' }}">立即預訂 <span class="er-arr">→</span></a>
      </div>
    </div>

    <!-- 4. 滑雪護具 -->
    {% assign p4 = all_products['gear-rental-protection'] | default: all_products['protection-gear'] | default: all_products['ski-protection'] %}
    <div class="er-card">
      <div class="er-img">
        <img src="{% if p4 != blank and p4.featured_image %}{{ p4.featured_image | img_url: 'master' }}{% else %}https://cdn.shopify.com/s/files/1/0651/9413/1539/files/protective_gear_34dd1ed9-61b2-4f85-a459-56738a94fe95.jpg?v=1765072901&width=800{% endif %}" alt="滑雪護具">
      </div>
      <div class="er-body">
        <div class="er-name">{{ p4.title | default: '滑雪護具' }}</div>
        <div class="er-desc">
          <span>加強防護設計</span><br>
          <span>減少摔側受傷風險</span>
        </div>
        <hr class="er-hr">
        <div class="er-price-row">
          <span class="er-price">{% if p4 != blank %}{{ p4.price | money }}{% else %}NT$200{% endif %}</span>
        </div>
        <a class="er-btn" href="{{ p4.url | default: '/products/gear-rental-protection' }}">立即預訂 <span class="er-arr">→</span></a>
      </div>
    </div>

    <!-- 5. 雪鏡 -->
    {% assign p5 = all_products['gear-rent-glass'] | default: all_products['goggles'] | default: all_products['ski-goggles'] %}
    <div class="er-card">
      <div class="er-img">
        <img src="{% if p5 != blank and p5.featured_image %}{{ p5.featured_image | img_url: 'master' }}{% else %}https://cdn.shopify.com/s/files/1/0651/9413/1539/files/goggle_7e348627-078f-4ce5-9800-7736a0be9957.jpg?v=1777541492&width=800{% endif %}" alt="雪鏡">
      </div>
      <div class="er-body">
        <div class="er-name">{{ p5.title | default: '雪鏡' }}</div>
        <div class="er-desc">
          <span>防曬抗 UV 鏡片</span><br>
          <span>清晰視野不刺眼</span>
        </div>
        <hr class="er-hr">
        <div class="er-price-row">
          <span class="er-price">{% if p5 != blank %}{{ p5.price | money }}{% else %}NT$300{% endif %}</span>
        </div>
        <a class="er-btn" href="{{ p5.url | default: '/products/gear-rent-glass' }}">立即預訂 <span class="er-arr">→</span></a>
      </div>
    </div>

    <!-- 6. 雪服帽鏡組 -->
    {% assign p6 = all_products['full-set-bundle'] | default: all_products['all-in-one-rental'] %}
    <div class="er-card">
      <div class="er-img">
        <img src="{% if p6 != blank and p6.featured_image %}{{ p6.featured_image | img_url: 'master' }}{% else %}https://cdn.shopify.com/s/files/1/0651/9413/1539/files/ski_jacket_7462d1af-30e7-419d-9b82-77a027ab7969.jpg?v=1765072902&width=800{% endif %}" alt="雪服帽鏡組">
      </div>
      <div class="er-body">
        <div class="er-name">{{ p6.title | default: '雪服帽鏡組' }}</div>
        <div class="er-desc">
          <span>一次租齊最劃算</span><br>
          <span>省時省力超方便</span>
        </div>
        <hr class="er-hr">
        <div class="er-price-row">
          <span class="er-price">{% if p6 != blank %}{{ p6.price | money }}{% else %}NT$1,000{% endif %}</span>
        </div>
        <a class="er-btn" href="{{ p6.url | default: '/products/full-set-bundle' }}">立即預訂 <span class="er-arr">→</span></a>
      </div>
    </div>

  </div>
</div>`;

// Replace everything inside er-grid (and trailing divs) with the bulletproof hardcoded layout
html = html.replace(/<div class="er-grid">[\s\S]*$/, newContent.trim());

json.sections.main.blocks.er_cards_xK9mLp.settings.custom_liquid = html;
fs.writeFileSync(file, JSON.stringify(json, null, 2));
console.log("Updated to hardcore one-to-one template perfectly!");
