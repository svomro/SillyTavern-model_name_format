import { getContext, extension_settings, renderExtensionTemplateAsync } from '/scripts/extensions.js';
import { eventSource, event_types } from '/script.js';

const SETTINGS_KEY = 'model_name_formatter';

function resolveExtensionPathName() {
    const marker = '/scripts/extensions/';
    const pathname = new URL(import.meta.url).pathname;
    const markerIndex = pathname.indexOf(marker);

    if (markerIndex < 0) {
        return SETTINGS_KEY;
    }

    const tail = pathname.slice(markerIndex + marker.length);
    const parts = tail.split('/').filter(Boolean);

    // Remove current filename (typically index.js)
    if (parts.length > 0) {
        parts.pop();
    }

    return parts.join('/') || SETTINGS_KEY;
}

const EXTENSION_PATH_NAME = resolveExtensionPathName();
const DEFAULT_SETTINGS = {
    showModelName: true,
    showChName: false,
    splitLevel: 2,
};

function clampSplitLevel(value) {
    const level = Number.parseInt(value, 10);
    if (Number.isNaN(level)) return DEFAULT_SETTINGS.splitLevel;
    return Math.min(3, Math.max(0, level));
}

function getSettings() {
    const settings = extension_settings[SETTINGS_KEY] ?? {};

    // Backward compatibility for old `enabled` key.
    if (typeof settings.showModelName !== 'boolean') {
        settings.showModelName = typeof settings.enabled === 'boolean'
            ? settings.enabled
            : DEFAULT_SETTINGS.showModelName;
    }
    if (typeof settings.showChName !== 'boolean') {
        settings.showChName = DEFAULT_SETTINGS.showChName;
    }

    settings.splitLevel = clampSplitLevel(settings.splitLevel ?? DEFAULT_SETTINGS.splitLevel);
    delete settings.enabled;

    extension_settings[SETTINGS_KEY] = settings;
    return settings;
}

function keepAfterFirstDash(text) {
    const input = String(text ?? '').trim();
    const index = input.indexOf(' - ');
    if (index < 0) return input;
    return input.slice(index + 3).trim();
}

function keepAfterFirstSlash(text) {
    const input = String(text ?? '').trim();
    const index = input.indexOf('/');
    if (index < 0) return input;
    return input.slice(index + 1).trim();
}

// Metadata suffix patterns stripped by level 3.
// Each regex anchors to $ and starts with a dash.
const SUFFIX_PATTERNS = [
    /-\d{4}-\d{2}-\d{2}$/,                        // ISO date: -2025-04-16
    /-\d{2}-\d{2}$/,                               // Short date: -05-06
    /-\d{8}$/,                                     // Compact date: -20241022
    /-\d{4}$/,                                     // 4-digit date/version: -2411, -0324
    /-a\d+[bB]$/i,                                 // Compound param size: -a22b
    /-\d{1,4}[bBkK]$/,                             // Param/context size: -32b, -128k
    /-(?:preview|latest|instruct|online|free)$/i,  // Metadata tags
];

function stripMetadataSuffixes(text) {
    const input = String(text ?? '').trim();
    if (!input) return input;

    let result = input;
    let changed = true;

    while (changed) {
        changed = false;
        for (const pattern of SUFFIX_PATTERNS) {
            if (pattern.test(result)) {
                const candidate = result.replace(pattern, '').trim();
                if (candidate.length > 0) {
                    result = candidate;
                    changed = true;
                    break;
                }
            }
        }
    }

    return result;
}

// Split levels:
// 0 -> no split: keep original
// 1 -> first split: keep content after first " - "
// 2 -> level1 + second split: keep after first "/" else after first " - "
// 3 -> level2 + third split: strip trailing date / size / tag suffixes
function formatModelName(rawName, splitLevel) {
    const level = clampSplitLevel(splitLevel);
    const original = String(rawName ?? '').trim();
    if (!original) return '';

    let result = original;

    if (level >= 1) {
        result = keepAfterFirstDash(result);
    }

    if (level >= 2) {
        result = result.includes('/')
            ? keepAfterFirstSlash(result)
            : keepAfterFirstDash(result);
    }

    if (level >= 3) {
        result = stripMetadataSuffixes(result);
    }

    return result || original;
}

function getRawModelName(messageElement, chatMessages) {
    const messageIdText = messageElement.getAttribute('mesid');
    const messageId = Number.parseInt(String(messageIdText ?? ''), 10);

    if (!Number.isNaN(messageId) && Array.isArray(chatMessages)) {
        const message = chatMessages[messageId];
        const api = message?.extra?.api;
        const model = message?.extra?.model;

        if (model) {
            return `${api ? `${api} - ` : ''}${model}`;
        }
    }

    const timestampEl = messageElement.querySelector('.timestamp');
    return timestampEl?.getAttribute('title')?.trim() ?? '';
}

function upsertModelName(messageElement, splitLevel, chatMessages) {
    const timestampEl = messageElement.querySelector('.timestamp');
    const rawModelName = getRawModelName(messageElement, chatMessages);
    if (!rawModelName) return;

    // Keep tooltip source aligned with actual message metadata when available.
    if (timestampEl && timestampEl.getAttribute('title') !== rawModelName) {
        timestampEl.setAttribute('title', rawModelName);
    }

    const displayName = formatModelName(rawModelName, splitLevel);
    if (!displayName) return;

    const nameContainer = messageElement.querySelector('.ch_name .alignItemsBaseline') || messageElement.querySelector('.ch_name');
    if (!nameContainer) return;

    let modelNameSpan = messageElement.querySelector('.clean_model_name');
    if (!modelNameSpan) {
        modelNameSpan = document.createElement('span');
        modelNameSpan.className = 'clean_model_name';
        const nameTextEl = messageElement.querySelector('.name_text');
        if (nameTextEl && nameTextEl.parentElement === nameContainer) {
            nameContainer.insertBefore(modelNameSpan, nameTextEl);
        } else {
            nameContainer.prepend(modelNameSpan);
        }
    }

    modelNameSpan.textContent = displayName;
}

// Inject or update model names in AI messages
function injectModelNames() {
    const settings = getSettings();
    const context = getContext();
    const chatMessages = context.chat;
    const aiMessages = document.querySelectorAll('.mes:not([is_user="true"])');
    aiMessages.forEach(mes => upsertModelName(mes, settings.splitLevel, chatMessages));
}

function initUI() {
    const context = getContext();
    const settings = getSettings();

    const showModelToggle = document.getElementById('mnf_show_model_toggle');
    if (showModelToggle) {
        showModelToggle.checked = settings.showModelName;
        showModelToggle.addEventListener('change', (e) => {
            settings.showModelName = Boolean(e.target.checked);
            context.saveSettingsDebounced();
            applyState();
        });
    }

    const showChNameToggle = document.getElementById('mnf_show_ch_name_toggle');
    if (showChNameToggle) {
        showChNameToggle.checked = settings.showChName;
        showChNameToggle.addEventListener('change', (e) => {
            settings.showChName = Boolean(e.target.checked);
            context.saveSettingsDebounced();
            applyState();
        });
    }

    const splitLevelSelect = document.getElementById('mnf_split_level');
    if (splitLevelSelect) {
        splitLevelSelect.value = String(settings.splitLevel);
        splitLevelSelect.addEventListener('change', (e) => {
            settings.splitLevel = clampSplitLevel(e.target.value);
            context.saveSettingsDebounced();
            injectModelNames();
            applyState();
        });
    }
}

function applyState() {
    const settings = getSettings();
    document.body.classList.toggle('mnf-show-model', settings.showModelName);
    document.body.classList.toggle('mnf-show-ch-name', settings.showChName);
    injectModelNames();
}

jQuery(async () => {
    const htmlText = await renderExtensionTemplateAsync(EXTENSION_PATH_NAME, 'index');
    $('#extensions_settings').append(htmlText);

    initUI();
    applyState();

    const scheduleRefresh = (delayMs = 100) => setTimeout(injectModelNames, delayMs);
    eventSource.on(event_types.MESSAGE_RECEIVED, () => scheduleRefresh(100));
    eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, () => scheduleRefresh(100));
    eventSource.on(event_types.MESSAGE_UPDATED, () => scheduleRefresh(100));
    eventSource.on(event_types.MESSAGE_SWIPED, () => scheduleRefresh(100));
    eventSource.on(event_types.CHAT_CHANGED, () => scheduleRefresh(300));
    eventSource.on(event_types.GENERATION_ENDED, () => scheduleRefresh(100));
    eventSource.on(event_types.GENERATION_STOPPED, () => scheduleRefresh(100));
    eventSource.on(event_types.CHATCOMPLETION_MODEL_CHANGED, () => scheduleRefresh(50));

    const chatRoot = document.getElementById('chat');
    if (chatRoot) {
        const observer = new MutationObserver(() => scheduleRefresh(30));
        observer.observe(chatRoot, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeFilter: ['title', 'mesid', 'is_user'],
        });
    }
});
