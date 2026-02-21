import { getContext, extension_settings } from '../../../extensions.js';
import { eventSource, event_types } from '../../../../script.js';

const EXTENSION_NAME = 'model_name_formatter';
const DEFAULT_SETTINGS = { enabled: true };

// Clean up model names based on specific regex rules
function formatModelName(rawName) {
    if (!rawName) return "";

    let name = String(rawName);

    // 1. Remove common prefixes before the first hyphen (e.g., "openrouter - ")
    const prefixSlashMatch = name.match(/^[^/]*\/([^-]*)-/);
    if(prefixSlashMatch) {
         name = name.replace(/^[^/]*\//, '');
    } else {
         name = name.replace(/^[\w\s]+ \- /, '');
    }
    
    // 2. Remove any remaining prefix before a slash if it exists
    if (name.includes('/')) {
        name = name.split('/').pop();
    }

    // 3. Remove trailing dates or version numbers (e.g., "- 0901", "- 20241022")
    name = name.replace(/[- ]+\d{4,8}$/, '');
    
    // 4. Optionally ignore "-32b", "8b" flags ending
    name = name.replace(/[- ]+\d{1,3}[BbmMkK]$/, '');

    return name.trim();
}

// Inject model names into AI messages
function injectModelNames() {
    // Only process AI messages
    const aiMessages = document.querySelectorAll('.mes:not([is_user="true"])');
    
    aiMessages.forEach(mes => {
        const timestampEl = mes.querySelector('.timestamp[title]');
        const nameContainer = mes.querySelector('.alignItemsBaseline');
        
        // Skip if elements are missing or title is empty
        if (!timestampEl || !nameContainer || !timestampEl.getAttribute('title')) return;
        
        // Skip if already injected
        if (mes.querySelector('.clean_model_name')) return;
        
        const rawModelName = timestampEl.getAttribute('title');
        const cleanName = formatModelName(rawModelName);
        
        // Create span to hold clean model name
        const modelNameSpan = document.createElement('span');
        modelNameSpan.className = 'clean_model_name';
        modelNameSpan.textContent = cleanName;
        
        // Insert it right before the original name_text
        const nameTextEl = mes.querySelector('.name_text');
        if (nameTextEl) {
            nameContainer.insertBefore(modelNameSpan, nameTextEl);
        } else {
            // Fallback just prepend
            nameContainer.prepend(modelNameSpan);
        }
    });
}

// Init UI toggle switch in extension panel
function initUI() {
    const context = getContext();
    if (typeof extension_settings[EXTENSION_NAME] === 'undefined') {
        extension_settings[EXTENSION_NAME] = DEFAULT_SETTINGS;
    }

    const toggleBtn = document.getElementById('mnf_enable_toggle');
    if (toggleBtn) {
        toggleBtn.checked = extension_settings[EXTENSION_NAME].enabled;
        
        toggleBtn.addEventListener('change', (e) => {
            extension_settings[EXTENSION_NAME].enabled = e.target.checked;
            context.saveSettings();
            applyState();
        });
    }
}

// Toggle body class so CSS activates/deactivates visibility
function applyState() {
    if (extension_settings[EXTENSION_NAME].enabled) {
        document.body.classList.add('mnf-enabled');
        injectModelNames(); // Inject immediately if already loaded
    } else {
        document.body.classList.remove('mnf-enabled');
    }
}

// Mount point for SillyTavern extension
jQuery(async () => {
    // Parse HTML UI
    const htmlResponse = await fetch('/scripts/extensions/model_name_formatter/index.html');
    const htmlText = await htmlResponse.text();
    $('#extensions_settings').append(htmlText);

    initUI();
    applyState();

    // Hook into message receive and chat updates
    eventSource.on(event_types.MESSAGE_RECEIVED, () => setTimeout(injectModelNames, 100));
    eventSource.on(event_types.CHAT_CHANGED, () => setTimeout(injectModelNames, 300));
    eventSource.on(event_types.MESSAGE_UPDATED, () => setTimeout(injectModelNames, 100));
});
