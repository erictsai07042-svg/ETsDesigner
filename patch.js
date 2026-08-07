const fs = require('fs');
const file = 'c:/Users/erict/shopify-theme/templates/page.course-introduction.json';
let data = JSON.parse(fs.readFileSync(file, 'utf8'));

// Navigate to the custom_liquid section
const sections = data.sections;
let targetSection = null;

for (const key in sections) {
  if (sections[key].type === 'custom-liquid' && sections[key].settings && sections[key].settings.custom_liquid.includes('Life Chill Snow — Course Introduction Tab System')) {
    targetSection = sections[key];
    break;
  }
}

if (targetSection) {
  let html = targetSection.settings.custom_liquid;
  
  // Find the <script> block and replace it entirely
  const scriptStart = html.indexOf('<script>');
  const scriptEnd = html.indexOf('</script>') + 9;
  
  if (scriptStart !== -1 && scriptEnd !== -1) {
    const newScript = `<script>
(function(){
  var btns = document.querySelectorAll('.lcs-tab-btn');
  var contents = document.querySelectorAll('.lcs-tab-content');
  function activateTab(tabId) {
    var targetBtn = document.querySelector('.lcs-tab-btn[data-tab="' + tabId + '"]');
    if(!targetBtn) return;
    btns.forEach(function(b){ b.classList.remove('is-active'); });
    contents.forEach(function(c){ c.classList.remove('is-active'); });
    targetBtn.classList.add('is-active');
    document.querySelector('.lcs-tab-content[data-tab-content="' + tabId + '"]').classList.add('is-active');
  }
  btns.forEach(function(btn){
    btn.addEventListener('click', function(){
      activateTab(btn.getAttribute('data-tab'));
    });
  });
  if(window.location.hash === '#halfday') {
    activateTab('half');
  } else if(window.location.hash === '#fullday') {
    activateTab('full');
  }
})();
</script>`;
    
    html = html.substring(0, scriptStart) + newScript + html.substring(scriptEnd);
    targetSection.settings.custom_liquid = html;
    
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    console.log('Successfully updated script in JSON.');
  } else {
    console.log('Error: Could not find <script> tags in the custom_liquid.');
  }
} else {
  console.log('Error: Could not find the target custom_liquid section.');
}
