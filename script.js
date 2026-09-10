// --- DATA STATE ---
const generateId = () => '_' + Math.random().toString(36).substr(2, 9);

let folders = JSON.parse(localStorage.getItem('acm_folders')) || [{ id: 'default', name: 'My Cases', sharedWith: [] }];
let cases = JSON.parse(localStorage.getItem('acm_cases')) || [];

// Migration for old data (put standalone cases into default folder)
cases.forEach(c => { if (!c.folderId) c.folderId = 'default'; });

let activeCaseId = null;
let currentImageDataUrl = null;
let currentTheme = localStorage.getItem('acm_theme') || 'light';
let currentLang = localStorage.getItem('acm_lang') || 'en';

// --- CLOUD CONFIG ---
const API_BASE = 'https://api.orbinuity.nl:34430/api';
let orbinuityToken = localStorage.getItem('acm_token') || null;
let currentUser = JSON.parse(localStorage.getItem('acm_user')) || null;
let targetShareFolderId = null; 

// --- DOM ELEMENTS ---
const sidebarContent = document.getElementById('sidebar-content');
const activeCaseView = document.getElementById('active-case-view');
const noCaseView = document.getElementById('no-case-selected');
const blocksContainer = document.getElementById('blocks-container');
const languageSelect = document.getElementById('language-select');

// Modals
const settingsModal = document.getElementById('settings-modal');
const shareModal = document.getElementById('share-modal');
const blockModal = document.getElementById('block-modal');

// --- TRANSLATIONS ---
const translations = {
    en: {
        appTitle: "ACM System", newFolder: "+ New Folder", emptyState: "Select or create a case to begin",
        addInfoBlock: "+ Add Info Block", createBlockTitle: "Create Info Block", blockType: "Block Type",
        typePerson: "Person / Subject", typeGeneral: "General Information", typeLocation: "Location",
        titleName: "Title / Name", picture: "Picture", description: "Description",
        additionalInfo: "Custom Fields", addCustomField: "+ Add Custom Field", saveBlock: "Save Info Block",
        settingsTitle: "Settings", appearance: "Appearance & Localization", language: "Language",
        toggleTheme: "🌙 Toggle Theme", cloudSyncTitle: "Orbinuity Cloud Sync", jwtToken: "JWT Bearer Token",
        connectCloud: "Connect to Orbinuity", syncUp: "⬆️ Push Data to Cloud", syncDown: "⬇️ Pull Data from Cloud",
        disconnect: "Disconnect", notLoggedIn: "Not connected.", loggedInAs: "Connected as:",
        shareFolderTitle: "Share Folder", shareFolderDesc: "Look up a user by their Orbinuity username to invite them.",
        search: "Search", addUser: "Add User", sharedWithTitle: "Shared With:",
        promptNewFolder: "Enter Folder Name:", promptNewCase: "Enter new Case Name:", 
        confirmDeleteBlock: "Delete this block?", confirmDeleteCase: "Delete this case?", confirmDeleteFolder: "Delete this folder and all its cases?"
    },
    // Adding minimal NL for brevity, handles fallback to EN
    nl: {
        appTitle: "ACM Systeem", newFolder: "+ Nieuwe Map", emptyState: "Selecteer een zaak om te beginnen",
        addInfoBlock: "+ Info Blok", createBlockTitle: "Info Blok Aanmaken", settingsTitle: "Instellingen",
        cloudSyncTitle: "Orbinuity Cloud Sync", syncUp: "⬆️ Push naar Cloud", syncDown: "⬇️ Pull van Cloud",
        promptNewFolder: "Map naam:", promptNewCase: "Zaak naam:"
    }
};

// --- INITIALIZATION ---
function init() {
    applyTheme(currentTheme);
    applyLanguage(currentLang);
    renderSidebar();
    updateCloudUI();
    if (cases.length > 0 && !activeCaseId) selectCase(cases[0].id);
}

function saveState() {
    localStorage.setItem('acm_folders', JSON.stringify(folders));
    localStorage.setItem('acm_cases', JSON.stringify(cases));
}

// --- UI RENDER LOGIC ---
function renderSidebar() {
    sidebarContent.innerHTML = '';
    const t = translations[currentLang] || translations['en'];

    folders.forEach(folder => {
        const folderDiv = document.createElement('div');
        folderDiv.className = 'folder-group';
        
        // Folder Header
        const header = document.createElement('div');
        header.className = 'folder-header';
        header.innerHTML = `
            <span>📁 ${folder.name}</span>
            <div class="folder-actions">
                <button onclick="openShareModal('${folder.id}')" title="Share Folder">👤</button>
                <button onclick="createCase('${folder.id}')" title="Add Case">➕</button>
                ${folder.id !== 'default' ? `<button onclick="deleteFolder('${folder.id}')" title="Delete Folder">🗑️</button>` : ''}
            </div>
        `;
        folderDiv.appendChild(header);

        // Cases List
        const ul = document.createElement('ul');
        ul.className = 'case-list';
        
        const folderCases = cases.filter(c => c.folderId === folder.id);
        folderCases.forEach(c => {
            const li = document.createElement('li');
            li.className = `case-item ${c.id === activeCaseId ? 'active' : ''}`;
            li.innerHTML = `<span class="case-item-title">${c.title}</span><button class="delete-item-btn" onclick="event.stopPropagation(); deleteCase('${c.id}')">🗑️</button>`;
            li.addEventListener('click', () => selectCase(c.id));
            ul.appendChild(li);
        });

        folderDiv.appendChild(ul);
        sidebarContent.appendChild(folderDiv);
    });
}

function selectCase(id) {
    activeCaseId = id;
    renderSidebar();
    renderActiveCase();
}

function renderActiveCase() {
    if (!activeCaseId) {
        noCaseView.classList.remove('hidden');
        activeCaseView.classList.add('hidden');
        return;
    }
    const currentCase = cases.find(c => c.id === activeCaseId);
    if(!currentCase) return;

    noCaseView.classList.add('hidden');
    activeCaseView.classList.remove('hidden');
    document.getElementById('active-case-title').textContent = currentCase.title;
    
    blocksContainer.innerHTML = '';
    const t = translations[currentLang] || translations['en'];

    currentCase.blocks.forEach(block => {
        const card = document.createElement('div');
        card.className = 'info-card';

        let fieldsHTML = block.customFields.map(f => `<div class="custom-field-display"><strong>${f.key}:</strong> <span>${f.value}</span></div>`).join('');
        const imgHTML = block.image ? `<img src="${block.image}" class="info-card-img">` : `<div class="info-card-img">${block.title.substring(0,2).toUpperCase()}</div>`;

        card.innerHTML = `
            <button class="delete-block-btn" onclick="deleteBlock('${currentCase.id}', '${block.id}')">🗑️</button>
            <div class="info-card-header">${imgHTML}<div><h3>${block.title}</h3><span class="info-type">${block.type.toUpperCase()}</span></div></div>
            ${block.description ? `<p class="info-desc">"${block.description}"</p>` : ''}
            <div class="info-custom-fields">${fieldsHTML}</div>
        `;
        blocksContainer.appendChild(card);
    });
}

// --- CRUD OPERATIONS ---
document.getElementById('new-folder-btn').addEventListener('click', () => {
    const t = translations[currentLang] || translations['en'];
    const name = prompt(t.promptNewFolder || "Folder name:");
    if (name) {
        folders.push({ id: generateId(), name: name.trim(), sharedWith: [] });
        saveState(); renderSidebar();
    }
});

window.createCase = (folderId) => {
    const t = translations[currentLang] || translations['en'];
    const title = prompt(t.promptNewCase || "Case name:");
    if (title) {
        const newCase = { id: generateId(), folderId, title: title.trim(), blocks: [] };
        cases.push(newCase);
        saveState(); selectCase(newCase.id);
    }
};

window.deleteFolder = (id) => {
    if (confirm((translations[currentLang]||translations.en).confirmDeleteFolder)) {
        folders = folders.filter(f => f.id !== id);
        cases = cases.filter(c => c.folderId !== id);
        if(cases.length === 0) activeCaseId = null;
        saveState(); renderSidebar(); renderActiveCase();
    }
};

window.deleteCase = (id) => {
    if (confirm((translations[currentLang]||translations.en).confirmDeleteCase)) {
        cases = cases.filter(c => c.id !== id);
        if (activeCaseId === id) activeCaseId = cases.length > 0 ? cases[0].id : null;
        saveState(); renderSidebar(); renderActiveCase();
    }
};

window.deleteBlock = (caseId, blockId) => {
    if (confirm((translations[currentLang]||translations.en).confirmDeleteBlock)) {
        const c = cases.find(c => c.id === caseId);
        c.blocks = c.blocks.filter(b => b.id !== blockId);
        saveState(); renderActiveCase();
    }
};

// --- ORBINUITY CLOUD API WRAPPER ---
async function apiCall(endpoint, method = 'GET', body = null) {
    if (!orbinuityToken) throw new Error("No token provided");
    const options = { method, headers: { 'Authorization': `Bearer ${orbinuityToken}`, 'Content-Type': 'application/json' } };
    if (body) options.body = JSON.stringify(body);
    
    const res = await fetch(`${API_BASE}${endpoint}`, options);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    return res.json();
}

document.getElementById('cloud-connect-btn').addEventListener('click', async () => {
    const token = document.getElementById('jwt-input').value.trim();
    if(!token) return alert("Enter a token.");
    orbinuityToken = token;
    try {
        const profile = await apiCall('/account/me'); // 1. User Profile Retrieval
        localStorage.setItem('acm_token', token);
        localStorage.setItem('acm_user', JSON.stringify(profile));
        currentUser = profile;
        updateCloudUI();
        alert(`Connected as ${profile.username}`);
    } catch (e) {
        orbinuityToken = null;
        alert("Connection failed. Check token or CORS.");
    }
});

document.getElementById('cloud-logout-btn').addEventListener('click', () => {
    orbinuityToken = null; currentUser = null;
    localStorage.removeItem('acm_token'); localStorage.removeItem('acm_user');
    updateCloudUI();
});

document.getElementById('sync-up-btn').addEventListener('click', async () => {
    try {
        const payload = { folders, cases };
        await apiCall('/external/acm_app', 'PUT', payload); // 3. Save App Storage
        alert("Successfully pushed to Orbinuity Cloud!");
    } catch (e) { alert("Sync UP failed: " + e.message); }
});

document.getElementById('sync-down-btn').addEventListener('click', async () => {
    try {
        const data = await apiCall('/external/acm_app', 'GET'); // 3. Fetch App Storage
        if(data && data.folders && data.cases) {
            folders = data.folders; cases = data.cases;
            saveState(); init();
            alert("Successfully pulled from Cloud!");
        } else {
            alert("No existing cloud data found for ACM.");
        }
    } catch (e) { alert("Sync DOWN failed: " + e.message); }
});

function updateCloudUI() {
    const statusText = document.getElementById('cloud-status');
    const t = translations[currentLang] || translations['en'];
    if (currentUser) {
        statusText.textContent = `${t.loggedInAs || 'Connected as:'} @${currentUser.username}`;
        document.getElementById('cloud-login-form').classList.add('hidden');
        document.getElementById('cloud-actions').classList.remove('hidden');
    } else {
        statusText.textContent = t.notLoggedIn;
        document.getElementById('cloud-login-form').classList.remove('hidden');
        document.getElementById('cloud-actions').classList.add('hidden');
    }
}

// --- SHARING FOLDERS (Orbinuity Lookup) ---
window.openShareModal = (folderId) => {
    targetShareFolderId = folderId;
    document.getElementById('share-result').classList.add('hidden');
    document.getElementById('share-username-input').value = '';
    
    // Render current shared users
    const folder = folders.find(f => f.id === folderId);
    const ul = document.getElementById('shared-users-list');
    ul.innerHTML = folder.sharedWith.map(id => `<li>ID: ${id}</li>`).join(''); // Without batch-lookup implemented, showing raw IDs

    shareModal.classList.remove('hidden');
};

let pendingLookupUser = null;
document.getElementById('lookup-user-btn').addEventListener('click', async () => {
    if(!orbinuityToken) return alert("You must connect to Orbinuity Cloud first in Settings.");
    const username = document.getElementById('share-username-input').value.replace('@','').trim();
    if(!username) return;

    try {
        // 2. Username Lookup
        const user = await apiCall(`/users/lookup?username=${username}`);
        pendingLookupUser = user;
        document.getElementById('found-user-display').innerHTML = `Found: <strong>@${user.username}</strong> (ID: ${user.id})`;
        document.getElementById('share-result').classList.remove('hidden');
    } catch (e) { alert("User not found or lookup failed."); }
});

document.getElementById('add-collaborator-btn').addEventListener('click', () => {
    if(pendingLookupUser && targetShareFolderId) {
        const folder = folders.find(f => f.id === targetShareFolderId);
        if(!folder.sharedWith.includes(pendingLookupUser.id)) {
            folder.sharedWith.push(pendingLookupUser.id);
            saveState();
            alert(`Added @${pendingLookupUser.username} to folder! Sync UP to save to cloud.`);
            openShareModal(targetShareFolderId); // refresh
        }
    }
});

// --- MODALS & FORMS ---
document.getElementById('open-settings-btn').addEventListener('click', () => settingsModal.classList.remove('hidden'));
document.querySelectorAll('.close-settings').forEach(b => b.addEventListener('click', () => settingsModal.classList.add('hidden')));
document.querySelectorAll('.close-share').forEach(b => b.addEventListener('click', () => shareModal.classList.add('hidden')));

// Themes & Langs
function applyLanguage(lang) {
    currentLang = lang; localStorage.setItem('acm_lang', lang); languageSelect.value = lang;
    const t = translations[lang] || translations['en'];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.placeholder = t[key];
            else el.textContent = t[key];
        }
    });
}
languageSelect.addEventListener('change', (e) => applyLanguage(e.target.value));

function applyTheme(theme) { document.documentElement.setAttribute('data-theme', theme); localStorage.setItem('acm_theme', theme); }
document.getElementById('theme-toggle-btn').addEventListener('click', () => {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light'; applyTheme(currentTheme);
});

// Blocks
document.getElementById('add-block-btn').addEventListener('click', () => {
    document.getElementById('block-form').reset();
    document.getElementById('custom-fields-container').innerHTML = '';
    document.getElementById('image-preview').classList.add('hidden');
    currentImageDataUrl = null;
    blockModal.classList.remove('hidden');
});
document.getElementById('close-modal').addEventListener('click', () => blockModal.classList.add('hidden'));

document.getElementById('block-image').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            currentImageDataUrl = event.target.result;
            const img = document.getElementById('image-preview');
            img.src = currentImageDataUrl; img.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
});

document.getElementById('add-field-btn').addEventListener('click', () => {
    const div = document.createElement('div');
    div.className = 'custom-field-input';
    div.innerHTML = `<input type="text" placeholder="Key" class="field-key" required><input type="text" placeholder="Value" class="field-val" required><button type="button" class="remove-field">X</button>`;
    div.querySelector('.remove-field').addEventListener('click', () => div.remove());
    document.getElementById('custom-fields-container').appendChild(div);
});

document.getElementById('block-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const customFields = [];
    document.querySelectorAll('.custom-field-input').forEach(row => {
        const key = row.querySelector('.field-key').value; const val = row.querySelector('.field-val').value;
        if(key && val) customFields.push({ key, value: val });
    });

    const newBlock = {
        id: generateId(),
        type: document.getElementById('block-type').value,
        title: document.getElementById('block-title').value,
        description: document.getElementById('block-description').value,
        image: currentImageDataUrl, customFields
    };

    const c = cases.find(c => c.id === activeCaseId);
    c.blocks.push(newBlock);
    saveState(); renderActiveCase(); blockModal.classList.add('hidden');
});

init();