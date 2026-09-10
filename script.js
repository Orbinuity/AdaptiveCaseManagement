const generateId = () => '_' + Math.random().toString(36).substr(2, 9);

let folders = JSON.parse(localStorage.getItem('acm_folders')) || [{ id: 'default', name: 'My Cases', sharedWith: [] }];
let cases = JSON.parse(localStorage.getItem('acm_cases')) || [];

cases.forEach(c => { if (!c.folderId) c.folderId = 'default'; });

let activeCaseId = null;
let editingBlockId = null;
let currentImageDataUrl = null;
let currentTheme = localStorage.getItem('acm_theme') || 'light';
let currentLang = localStorage.getItem('acm_lang') || 'en';

const API_BASE = 'https://api.orbinuity.nl:34430/api';
let orbinuityToken = localStorage.getItem('acm_token') || null;
let currentUser = JSON.parse(localStorage.getItem('acm_user')) || null;
let targetShareFolderId = null; 
let pendingLoginUserId = null; 

const sidebarContent = document.getElementById('sidebar-content');
const activeCaseView = document.getElementById('active-case-view');
const noCaseView = document.getElementById('no-case-selected');
const blocksContainer = document.getElementById('blocks-container');
const languageSelect = document.getElementById('language-select');

const settingsModal = document.getElementById('settings-modal');
const shareModal = document.getElementById('share-modal');
const blockModal = document.getElementById('block-modal');
const blockModalTitle = document.getElementById('block-modal-title');

const translations = {
    en: {
        appTitle: "ACM System", defaultFolder: "My Cases", newFolder: "+ New Folder", emptyState: "Select or create a case to begin",
        addInfoBlock: "+ Add Info Block", createBlockTitle: "Create Info Block", editBlockTitle: "Edit Info Block", editBtn: "Edit",
        blockType: "Block Type", typePerson: "Person / Subject", typeGeneral: "General Information", typeLocation: "Location",
        titleName: "Title / Name", picture: "Picture", description: "Description",
        additionalInfo: "Custom Fields", addCustomField: "+ Add Custom Field", saveBlock: "Save Info Block",
        settingsTitle: "Settings", appearance: "Appearance & Localization", language: "Language",
        toggleTheme: "Toggle Theme", cloudSyncTitle: "Orbinuity Cloud Sync",
        identifier: "Username or Email", password: "Password", loginBtn: "Login to Orbinuity",
        noAccount: "Don't have an account?", makeAccount: "Make one at Orbinuity",
        otpCode: "6-Digit 2FA Code", otpSentDesc: "A code was sent to your email.", verifyBtn: "Verify & Login",
        syncUp: "Push Data to Cloud", syncDown: "Pull Data from Cloud",
        disconnect: "Disconnect", notLoggedIn: "Not connected.", loggedInAs: "Connected as:",
        shareFolderTitle: "Share Folder", shareFolderDesc: "Look up a user by their Orbinuity username to invite them.",
        search: "Search", addUser: "Add User", sharedWithTitle: "Shared With:",
        promptNewFolder: "Enter Folder Name:", promptNewCase: "Enter new Case Name:", 
        confirmDeleteBlock: "Delete this block?", confirmDeleteCase: "Delete this case?", confirmDeleteFolder: "Delete this folder and all its cases?"
    },
    nl: {
        appTitle: "ACM Systeem", defaultFolder: "Mijn Zaken", newFolder: "+ Nieuwe Map", emptyState: "Selecteer een zaak om te beginnen",
        addInfoBlock: "+ Info Blok", createBlockTitle: "Info Blok Aanmaken", editBlockTitle: "Info Blok Bewerken", editBtn: "Bewerken",
        settingsTitle: "Instellingen", cloudSyncTitle: "Orbinuity Cloud Sync", identifier: "Gebruikersnaam of E-mail", password: "Wachtwoord",
        loginBtn: "Inloggen", syncUp: "Push naar Cloud", syncDown: "Pull van Cloud",
        promptNewFolder: "Map naam:", promptNewCase: "Zaak naam:"
    },
    es: {
        appTitle: "Sistema ACM", defaultFolder: "Mis Casos", newFolder: "+ Nueva Carpeta", emptyState: "Seleccione un caso para comenzar",
        addInfoBlock: "+ Bloque de Info", createBlockTitle: "Crear Bloque", editBlockTitle: "Editar Bloque", editBtn: "Editar",
        settingsTitle: "Configuración", cloudSyncTitle: "Nube Orbinuity", promptNewFolder: "Nombre de la carpeta:", promptNewCase: "Nombre del caso:"
    },
    fr: {
        appTitle: "Système ACM", defaultFolder: "Mes Dossiers", newFolder: "+ Nouveau Dossier", emptyState: "Sélectionnez un cas pour commencer",
        addInfoBlock: "+ Ajouter un Bloc", createBlockTitle: "Créer un Bloc", editBlockTitle: "Modifier le Bloc", editBtn: "Modifier",
        settingsTitle: "Paramètres", cloudSyncTitle: "Nuage Orbinuity", promptNewFolder: "Nom du dossier:", promptNewCase: "Nom du cas:"
    },
    de: {
        appTitle: "ACM-System", defaultFolder: "Meine Fälle", newFolder: "+ Neuer Ordner", emptyState: "Fall auswählen um zu beginnen",
        addInfoBlock: "+ Info-Block", createBlockTitle: "Block Erstellen", editBlockTitle: "Block Bearbeiten", editBtn: "Bearbeiten",
        settingsTitle: "Einstellungen", cloudSyncTitle: "Orbinuity Cloud Sync", promptNewFolder: "Ordnername:", promptNewCase: "Fallname:"
    }
};

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

function renderSidebar() {
    sidebarContent.innerHTML = '';
    const t = translations[currentLang] || translations['en'];
    
    folders.forEach(folder => {
        const folderDiv = document.createElement('div');
        folderDiv.className = 'folder-group';
        
        const header = document.createElement('div');
        header.className = 'folder-header';
        
        const folderNameSpan = document.createElement('span');
        folderNameSpan.textContent = folder.id === 'default' ? (t.defaultFolder || 'My Cases') : folder.name;
        
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'folder-actions';
        
        const shareBtn = document.createElement('button');
        shareBtn.className = 'small-btn';
        shareBtn.textContent = 'Share';
        shareBtn.title = 'Share Folder';
        shareBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openShareModal(folder.id);
        });
        
        const addCaseBtn = document.createElement('button');
        addCaseBtn.className = 'small-btn';
        addCaseBtn.textContent = '+ Case';
        addCaseBtn.title = 'Add Case';
        addCaseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            createCase(folder.id);
        });
        
        actionsDiv.appendChild(shareBtn);
        actionsDiv.appendChild(addCaseBtn);
        
        if (folder.id !== 'default') {
            const delFolderBtn = document.createElement('button');
            delFolderBtn.className = 'small-btn small-danger';
            delFolderBtn.textContent = 'X';
            delFolderBtn.title = 'Delete Folder';
            delFolderBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteFolder(folder.id);
            });
            actionsDiv.appendChild(delFolderBtn);
        }
        
        header.appendChild(folderNameSpan);
        header.appendChild(actionsDiv);
        folderDiv.appendChild(header);

        const ul = document.createElement('ul');
        ul.className = 'case-list';
        
        const folderCases = cases.filter(c => c.folderId === folder.id);
        folderCases.forEach(c => {
            const li = document.createElement('li');
            li.className = `case-item ${c.id === activeCaseId ? 'active' : ''}`;
            
            const titleSpan = document.createElement('span');
            titleSpan.className = 'case-item-title';
            titleSpan.textContent = c.title;
            
            const delCaseBtn = document.createElement('button');
            delCaseBtn.className = 'delete-item-btn';
            delCaseBtn.textContent = 'X';
            delCaseBtn.title = 'Delete Case';
            delCaseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteCase(c.id);
            });
            
            li.appendChild(titleSpan);
            li.appendChild(delCaseBtn);
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

        const cardActions = document.createElement('div');
        cardActions.className = 'card-actions';

        const editBtn = document.createElement('button');
        editBtn.className = 'small-btn';
        editBtn.textContent = t.editBtn || 'Edit';
        editBtn.title = 'Edit Block';
        editBtn.addEventListener('click', () => editBlock(currentCase.id, block.id));

        const delBtn = document.createElement('button');
        delBtn.className = 'delete-block-btn';
        delBtn.textContent = 'X';
        delBtn.title = 'Delete Block';
        delBtn.addEventListener('click', () => deleteBlock(currentCase.id, block.id));

        cardActions.appendChild(editBtn);
        cardActions.appendChild(delBtn);
        card.appendChild(cardActions);

        let fieldsHTML = block.customFields.map(f => `<div class="custom-field-display"><strong>${f.key}:</strong> <span>${f.value}</span></div>`).join('');
        const imgHTML = block.image ? `<img src="${block.image}" class="info-card-img">` : `<div class="info-card-img">${block.title.substring(0,2).toUpperCase()}</div>`;

        const headerDiv = document.createElement('div');
        headerDiv.className = 'info-card-header';
        headerDiv.innerHTML = `${imgHTML}<div><h3>${block.title}</h3><span class="info-type">${block.type.toUpperCase()}</span></div>`;
        card.appendChild(headerDiv);

        if(block.description) {
            const descP = document.createElement('p');
            descP.className = 'info-desc';
            descP.textContent = `"${block.description}"`;
            card.appendChild(descP);
        }

        const fieldsDiv = document.createElement('div');
        fieldsDiv.className = 'info-custom-fields';
        fieldsDiv.innerHTML = fieldsHTML;
        card.appendChild(fieldsDiv);

        blocksContainer.appendChild(card);
    });
}

document.getElementById('new-folder-btn').addEventListener('click', () => {
    const t = translations[currentLang] || translations['en'];
    const name = prompt(t.promptNewFolder || "Folder name:");
    if (name) {
        folders.push({ id: generateId(), name: name.trim(), sharedWith: [] });
        saveState(); renderSidebar();
    }
});

function createCase(folderId) {
    const t = translations[currentLang] || translations['en'];
    const title = prompt(t.promptNewCase || "Case name:");
    if (title) {
        const newCase = { id: generateId(), folderId, title: title.trim(), blocks: [] };
        cases.push(newCase);
        saveState(); selectCase(newCase.id);
    }
}

function deleteFolder(id) {
    if (confirm((translations[currentLang]||translations.en).confirmDeleteFolder)) {
        folders = folders.filter(f => f.id !== id);
        cases = cases.filter(c => c.folderId !== id);
        if(cases.length === 0) activeCaseId = null;
        saveState(); renderSidebar(); renderActiveCase();
    }
}

function deleteCase(id) {
    if (confirm((translations[currentLang]||translations.en).confirmDeleteCase)) {
        cases = cases.filter(c => c.id !== id);
        if (activeCaseId === id) activeCaseId = cases.length > 0 ? cases[0].id : null;
        saveState(); renderSidebar(); renderActiveCase();
    }
}

function deleteBlock(caseId, blockId) {
    if (confirm((translations[currentLang]||translations.en).confirmDeleteBlock)) {
        const c = cases.find(c => c.id === caseId);
        if (c) {
            c.blocks = c.blocks.filter(b => b.id !== blockId);
            saveState(); renderActiveCase();
        }
    }
}

function editBlock(caseId, blockId) {
    const currentCase = cases.find(c => c.id === caseId);
    if (!currentCase) return;
    const block = currentCase.blocks.find(b => b.id === blockId);
    if (!block) return;

    editingBlockId = block.id;
    const t = translations[currentLang] || translations['en'];
    blockModalTitle.textContent = t.editBlockTitle || "Edit Info Block";

    document.getElementById('block-type').value = block.type;
    document.getElementById('block-title').value = block.title;
    document.getElementById('block-description').value = block.description || '';
    
    currentImageDataUrl = block.image || null;
    const imgPreview = document.getElementById('image-preview');
    if (currentImageDataUrl) {
        imgPreview.src = currentImageDataUrl;
        imgPreview.classList.remove('hidden');
    } else {
        imgPreview.src = '';
        imgPreview.classList.add('hidden');
    }

    const customContainer = document.getElementById('custom-fields-container');
    customContainer.innerHTML = '';
    block.customFields.forEach(field => {
        addCustomFieldRow(field.key, field.value);
    });

    blockModal.classList.remove('hidden');
}

function addCustomFieldRow(key = '', val = '') {
    const div = document.createElement('div');
    div.className = 'custom-field-input';
    div.innerHTML = `<input type="text" placeholder="Key" class="field-key" value="${key}" required><input type="text" placeholder="Value" class="field-val" value="${val}" required><button type="button" class="remove-field" title="Remove">X</button>`;
    div.querySelector('.remove-field').addEventListener('click', () => div.remove());
    document.getElementById('custom-fields-container').appendChild(div);
}

async function apiCall(endpoint, method = 'GET', body = null) {
    if (!orbinuityToken) throw new Error("No token provided");
    const options = { method, headers: { 'Authorization': `Bearer ${orbinuityToken}`, 'Content-Type': 'application/json' } };
    if (body) options.body = JSON.stringify(body);
    
    const res = await fetch(`${API_BASE}${endpoint}`, options);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    return res.json();
}

document.getElementById('cloud-login-btn').addEventListener('click', async () => {
    const identifier = document.getElementById('login-identifier').value.trim();
    const password = document.getElementById('login-password').value.trim();
    
    if(!identifier || !password) return alert("Enter identifier and password.");
    
    try {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier, password })
        });
        
        if (!res.ok) throw new Error("Login failed. Please check your credentials.");
        
        const data = await res.json();
        
        if (data.requiresTwoFactor) {
            pendingLoginUserId = data.userId;
            document.getElementById('cloud-login-form').classList.add('hidden');
            document.getElementById('cloud-2fa-form').classList.remove('hidden');
        } 
        else {
            await finalizeLogin(data.token || data);
        }
    } catch (e) {
        alert(e.message);
    }
});

document.getElementById('cloud-verify-btn').addEventListener('click', async () => {
    const code = document.getElementById('login-otp').value.trim();
    if(!code || !pendingLoginUserId) return alert("Enter 2FA Code.");

    try {
        const res = await fetch(`${API_BASE}/auth/login/2fa`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: pendingLoginUserId, code })
        });
        
        if (!res.ok) throw new Error("Invalid 2FA code.");
        
        const data = await res.json();
        await finalizeLogin(data.token || data);
    } catch (e) {
        alert(e.message);
    }
});

async function finalizeLogin(tokenObject) {
    const actualToken = typeof tokenObject === 'string' ? tokenObject : tokenObject.token;
    orbinuityToken = actualToken;
    localStorage.setItem('acm_token', actualToken);
    
    try {
        const profile = await apiCall('/account/me'); 
        localStorage.setItem('acm_user', JSON.stringify(profile));
        currentUser = profile;
        pendingLoginUserId = null;
        updateCloudUI();
        alert(`Connected as @${profile.username}`);
    } catch (e) {
        orbinuityToken = null;
        localStorage.removeItem('acm_token');
        alert("Failed to load user profile after login.");
    }
}

document.getElementById('cloud-logout-btn').addEventListener('click', () => {
    orbinuityToken = null; currentUser = null;
    localStorage.removeItem('acm_token'); localStorage.removeItem('acm_user');
    updateCloudUI();
});

document.getElementById('sync-up-btn').addEventListener('click', async () => {
    try {
        const payload = { folders, cases };
        await apiCall('/external/acm_app', 'PUT', payload);
        alert("Successfully pushed to Orbinuity Cloud!");
    } catch (e) { alert("Sync UP failed: " + e.message); }
});

document.getElementById('sync-down-btn').addEventListener('click', async () => {
    try {
        const data = await apiCall('/external/acm_app', 'GET'); 
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
        document.getElementById('cloud-2fa-form').classList.add('hidden');
        document.getElementById('cloud-actions').classList.remove('hidden');
    } else {
        statusText.textContent = t.notLoggedIn;
        document.getElementById('cloud-login-form').classList.remove('hidden');
        document.getElementById('cloud-2fa-form').classList.add('hidden');
        document.getElementById('cloud-actions').classList.add('hidden');
        
        document.getElementById('login-identifier').value = '';
        document.getElementById('login-password').value = '';
        document.getElementById('login-otp').value = '';
    }
}

function openShareModal(folderId) {
    targetShareFolderId = folderId;
    document.getElementById('share-result').classList.add('hidden');
    document.getElementById('share-username-input').value = '';
    
    const folder = folders.find(f => f.id === folderId);
    const ul = document.getElementById('shared-users-list');
    ul.innerHTML = folder && folder.sharedWith.length ? folder.sharedWith.map(id => `<li>ID: ${id}</li>`).join('') : '<li style="color:var(--text-light)">None yet</li>';

    shareModal.classList.remove('hidden');
}

let pendingLookupUser = null;
document.getElementById('lookup-user-btn').addEventListener('click', async () => {
    if(!orbinuityToken) return alert("You must connect to Orbinuity Cloud first in Settings.");
    const username = document.getElementById('share-username-input').value.replace('@','').trim();
    if(!username) return;

    try {
        const user = await apiCall(`/users/lookup?username=${username}`);
        pendingLookupUser = user;
        document.getElementById('found-user-display').innerHTML = `Found: <strong>@${user.username}</strong> (ID: ${user.id})`;
        document.getElementById('share-result').classList.remove('hidden');
    } catch (e) { alert("User not found or lookup failed."); }
});

document.getElementById('add-collaborator-btn').addEventListener('click', () => {
    if(pendingLookupUser && targetShareFolderId) {
        const folder = folders.find(f => f.id === targetShareFolderId);
        if(folder && !folder.sharedWith.includes(pendingLookupUser.id)) {
            folder.sharedWith.push(pendingLookupUser.id);
            saveState();
            alert(`Added @${pendingLookupUser.username} to folder! Sync UP to save to cloud.`);
            openShareModal(targetShareFolderId); 
        }
    }
});

document.getElementById('open-settings-btn').addEventListener('click', () => settingsModal.classList.remove('hidden'));
document.querySelectorAll('.close-settings').forEach(b => b.addEventListener('click', () => settingsModal.classList.add('hidden')));
document.querySelectorAll('.close-share').forEach(b => b.addEventListener('click', () => shareModal.classList.add('hidden')));

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
    renderSidebar();
}
languageSelect.addEventListener('change', (e) => applyLanguage(e.target.value));

function applyTheme(theme) { document.documentElement.setAttribute('data-theme', theme); localStorage.setItem('acm_theme', theme); }
document.getElementById('theme-toggle-btn').addEventListener('click', () => {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light'; applyTheme(currentTheme);
});

document.getElementById('add-block-btn').addEventListener('click', () => {
    editingBlockId = null;
    const t = translations[currentLang] || translations['en'];
    blockModalTitle.textContent = t.createBlockTitle || "Create Info Block";
    document.getElementById('block-form').reset();
    document.getElementById('custom-fields-container').innerHTML = '';
    document.getElementById('image-preview').classList.add('hidden');
    currentImageDataUrl = null;
    blockModal.classList.remove('hidden');
});

document.getElementById('close-modal').addEventListener('click', () => {
    editingBlockId = null;
    blockModal.classList.add('hidden');
});

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

document.getElementById('add-field-btn').addEventListener('click', () => addCustomFieldRow());

document.getElementById('block-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const customFields = [];
    document.querySelectorAll('.custom-field-input').forEach(row => {
        const key = row.querySelector('.field-key').value; const val = row.querySelector('.field-val').value;
        if(key && val) customFields.push({ key, value: val });
    });

    const c = cases.find(c => c.id === activeCaseId);
    if (!c) return;

    if (editingBlockId) {
        const block = c.blocks.find(b => b.id === editingBlockId);
        if (block) {
            block.type = document.getElementById('block-type').value;
            block.title = document.getElementById('block-title').value;
            block.description = document.getElementById('block-description').value;
            block.image = currentImageDataUrl;
            block.customFields = customFields;
        }
        editingBlockId = null;
    } else {
        const newBlock = {
            id: generateId(),
            type: document.getElementById('block-type').value,
            title: document.getElementById('block-title').value,
            description: document.getElementById('block-description').value,
            image: currentImageDataUrl, 
            customFields
        };
        c.blocks.push(newBlock);
    }

    saveState(); renderActiveCase(); blockModal.classList.add('hidden');
});

init();