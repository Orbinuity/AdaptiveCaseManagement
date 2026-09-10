const generateId = () => '_' + Math.random().toString(36).substr(2, 9);
const APP_ID = 'acm_app';

function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        let date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Lax";
}

function getCookie(name) {
    let nameEQ = name + "=";
    let ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

function eraseCookie(name) {
    document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
}

let folders = [{ id: 'default', name: 'My Cases', members: [] }];
let cases = [];

let activeCaseId = null;
let editingBlockId = null;
let editingCaseId = null;
let targetFolderIdForNewCase = null;
let currentImageDataUrl = null;
let currentTheme = 'light';
let currentLang = 'en';

const API_BASE = 'https://api.orbinuity.nl:34430/api';
let orbinuityToken = getCookie('acm_token') || null;
let currentUser = null;
let targetShareFolderId = null; 
let pendingLoginUserId = null; 
let autoSyncInterval = null;

const authScreen = document.getElementById('auth-screen');
const appContainer = document.getElementById('app-container');
const sidebarContent = document.getElementById('sidebar-content');
const activeCaseView = document.getElementById('active-case-view');
const noCaseView = document.getElementById('no-case-selected');
const blocksContainer = document.getElementById('blocks-container');
const languageSelect = document.getElementById('language-select');
const authLanguageSelect = document.getElementById('auth-language-select');

const settingsModal = document.getElementById('settings-modal');
const shareModal = document.getElementById('share-modal');
const blockModal = document.getElementById('block-modal');
const blockModalTitle = document.getElementById('block-modal-title');

const caseModal = document.getElementById('case-modal');
const caseModalTitle = document.getElementById('case-modal-title');
const caseTitleInput = document.getElementById('case-title-input');
const caseDescInput = document.getElementById('case-desc-input');
const caseForm = document.getElementById('case-form');

const translations = {
    en: {
        appTitle: "ACM System", defaultFolder: "My Cases", newFolder: "+ New Folder", emptyState: "Select or create a case to begin",
        addInfoBlock: "+ Add Info Block", createBlockTitle: "Create Info Block", editBlockTitle: "Edit Info Block", editBtn: "Edit",
        blockType: "Block Type", typePerson: "Person / Subject", typeGeneral: "General Information", typeLocation: "Location",
        titleName: "Title / Name", picture: "Picture", description: "Description",
        additionalInfo: "Custom Fields", addCustomField: "+ Add Custom Field", saveBlock: "Save Info Block",
        settingsTitle: "Settings", settingsBtn: "Settings", appearance: "Appearance & Localization", language: "Language",
        toggleTheme: "Toggle Theme", cloudSyncTitle: "Orbinuity Cloud Sync",
        identifier: "Username or Email", password: "Password", loginBtn: "Login to Orbinuity",
        noAccount: "Don't have an account?", makeAccount: "Make one at Orbinuity",
        otpCode: "6-Digit 2FA Code", otpSentDesc: "A code was sent to your email.", verifyBtn: "Verify & Login",
        disconnect: "Disconnect", notLoggedIn: "Not connected.", loggedInAs: "Connected as:",
        shareFolderTitle: "Share Folder", shareFolderDesc: "Look up a user by their Orbinuity username to invite them.",
        search: "Search", addUser: "Add User", sharedWithTitle: "Shared With:", shareBtn: "Share", addCaseBtn: "+ Case",
        promptNewFolder: "Enter Folder Name:", noneYet: "None yet",
        editCaseBtn: "Edit Case", createCaseTitle: "Create Case", editCaseTitle: "Edit Case", saveCase: "Save Case",
        confirmDeleteBlock: "Delete this block?", confirmDeleteCase: "Delete this case?", confirmDeleteFolder: "Delete this folder and all its cases?"
    },
    nl: {
        appTitle: "ACM Systeem", defaultFolder: "Mijn Zaken", newFolder: "+ Nieuwe Map", emptyState: "Selecteer een zaak om te beginnen",
        addInfoBlock: "+ Info Blok", createBlockTitle: "Info Blok Aanmaken", editBlockTitle: "Info Blok Bewerken", editBtn: "Bewerken",
        blockType: "Blok Type", typePerson: "Persoon / Onderwerp", typeGeneral: "Algemene Informatie", typeLocation: "Locatie",
        titleName: "Titel / Naam", picture: "Afbeelding", description: "Beschrijving",
        additionalInfo: "Aangepaste Velden", addCustomField: "+ Aangepast Veld", saveBlock: "Info Blok Opslaan",
        settingsTitle: "Instellingen", settingsBtn: "Instellingen", appearance: "Uiterlijk & Lokalisatie", language: "Taal",
        toggleTheme: "Thema Wisselen", cloudSyncTitle: "Orbinuity Cloud Sync",
        identifier: "Gebruikersnaam of E-mail", password: "Wachtwoord", loginBtn: "Inloggen bij Orbinuity",
        noAccount: "Nog geen account?", makeAccount: "Maak er een aan bij Orbinuity",
        otpCode: "6-Cijferige 2FA Code", otpSentDesc: "Er is een code naar je e-mail gestuurd.", verifyBtn: "Verifiëren & Inloggen",
        disconnect: "Uitloggen", notLoggedIn: "Niet verbonden.", loggedInAs: "Ingelogd als:",
        shareFolderTitle: "Map Delen", shareFolderDesc: "Zoek een gebruiker op Orbinuity gebruikersnaam om uit te nodigen.",
        search: "Zoeken", addUser: "Gebruiker Toevoegen", sharedWithTitle: "Gedeeld Met:", shareBtn: "Delen", addCaseBtn: "+ Zaak",
        promptNewFolder: "Voer mapnaam in:", noneYet: "Nog niemand",
        editCaseBtn: "Zaak Bewerken", createCaseTitle: "Zaak Aanmaken", editCaseTitle: "Zaak Bewerken", saveCase: "Zaak Opslaan",
        confirmDeleteBlock: "Weet u zeker dat u dit info blok wilt verwijderen?", confirmDeleteCase: "Weet u zeker dat u deze zaak wilt verwijderen?", confirmDeleteFolder: "Weet u zeker dat u deze map en alle zaken wilt verwijderen?"
    },
    es: {
        appTitle: "Sistema ACM", defaultFolder: "Mis Casos", newFolder: "+ Nueva Carpeta", emptyState: "Seleccione un caso para comenzar",
        addInfoBlock: "+ Bloque de Info", createBlockTitle: "Crear Bloque", editBlockTitle: "Editar Bloque", editBtn: "Editar",
        blockType: "Tipo de Bloque", typePerson: "Persona / Sujeto", typeGeneral: "Información General", typeLocation: "Ubicación",
        titleName: "Título / Nombre", picture: "Imagen", description: "Descripción",
        additionalInfo: "Campos Personalizados", addCustomField: "+ Añadir Campo", saveBlock: "Guardar Bloque",
        settingsTitle: "Configuración", settingsBtn: "Ajustes", appearance: "Apariencia y Localización", language: "Idioma",
        toggleTheme: "Cambiar Tema", cloudSyncTitle: "Nube Orbinuity",
        identifier: "Usuario o Email", password: "Contraseña", loginBtn: "Iniciar Sesión",
        noAccount: "¿No tienes cuenta?", makeAccount: "Crea una en Orbinuity",
        otpCode: "Código 2FA de 6 dígitos", otpSentDesc: "Se ha enviado un código a tu correo.", verifyBtn: "Verificar e Iniciar",
        disconnect: "Desconectar", notLoggedIn: "No conectado.", loggedInAs: "Conectado como:",
        shareFolderTitle: "Compartir Carpeta", shareFolderDesc: "Busca un usuario por su nombre de usuario de Orbinuity.",
        search: "Buscar", addUser: "Añadir Usuario", sharedWithTitle: "Compartido Con:", shareBtn: "Compartir", addCaseBtn: "+ Caso",
        promptNewFolder: "Nombre de la carpeta:", noneYet: "Aún nadie",
        editCaseBtn: "Editar Caso", createCaseTitle: "Crear Caso", editCaseTitle: "Editar Caso", saveCase: "Guardar Caso",
        confirmDeleteBlock: "¿Eliminar este bloque?", confirmDeleteCase: "¿Eliminar este caso?", confirmDeleteFolder: "¿Eliminar esta carpeta y todos sus casos?"
    },
    fr: {
        appTitle: "Système ACM", defaultFolder: "Mes Dossiers", newFolder: "+ Nouveau Dossier", emptyState: "Sélectionnez un cas pour commencer",
        addInfoBlock: "+ Ajouter un Bloc", createBlockTitle: "Créer un Bloc", editBlockTitle: "Modifier le Bloc", editBtn: "Modifier",
        blockType: "Type de Bloc", typePerson: "Personne / Sujet", typeGeneral: "Informations Générales", typeLocation: "Emplacement",
        titleName: "Titre / Nom", picture: "Image", description: "Description",
        additionalInfo: "Champs Personnalisés", addCustomField: "+ Ajouter un Champ", saveBlock: "Enregistrer",
        settingsTitle: "Paramètres", settingsBtn: "Paramètres", appearance: "Apparence & Localisation", language: "Langue",
        toggleTheme: "Changer de Thème", cloudSyncTitle: "Nuage Orbinuity",
        identifier: "Nom d'utilisateur ou Email", password: "Mot de passe", loginBtn: "Se connecter",
        noAccount: "Pas encore de compte ?", makeAccount: "Créer un compte sur Orbinuity",
        otpCode: "Code 2FA à 6 chiffres", otpSentDesc: "Un code a été envoyé par email.", verifyBtn: "Vérifier & Connexion",
        disconnect: "Déconnexion", notLoggedIn: "Non connecté.", loggedInAs: "Connecté en tant que :",
        shareFolderTitle: "Partager le Dossier", shareFolderDesc: "Recherchez un utilisateur par son nom d'utilisateur Orbinuity.",
        search: "Rechercher", addUser: "Ajouter L'utilisateur", sharedWithTitle: "Partagé Avec :", shareBtn: "Partager", addCaseBtn: "+ Cas",
        promptNewFolder: "Nom du dossier :", noneYet: "Aucun pour le moment",
        editCaseBtn: "Modifier le Cas", createCaseTitle: "Créer un Cas", editCaseTitle: "Modifier le Cas", saveCase: "Enregistrer",
        confirmDeleteBlock: "Supprimer ce bloc ?", confirmDeleteCase: "Supprimer ce cas ?", confirmDeleteFolder: "Supprimer ce dossier et tous ses cas ?"
    },
    de: {
        appTitle: "ACM-System", defaultFolder: "Meine Fälle", newFolder: "+ Neuer Ordner", emptyState: "Fall auswählen um zu beginnen",
        addInfoBlock: "+ Info-Block", createBlockTitle: "Block Erstellen", editBlockTitle: "Block Bearbeiten", editBtn: "Bearbeiten",
        blockType: "Block-Typ", typePerson: "Person / Subjekt", typeGeneral: "Allgemeine Info", typeLocation: "Standort",
        titleName: "Titel / Name", picture: "Bild", description: "Beschreibung",
        additionalInfo: "Benutzerdefinierte Felder", addCustomField: "+ Feld Hinzufügen", saveBlock: "Speichern",
        settingsTitle: "Einstellungen", settingsBtn: "Optionen", appearance: "Erscheinungsbild & Sprache", language: "Sprache",
        toggleTheme: "Design Wechseln", cloudSyncTitle: "Orbinuity Cloud Sync",
        identifier: "Benutzername oder E-Mail", password: "Passwort", loginBtn: "Anmelden",
        noAccount: "Noch kein Konto?", makeAccount: "Bei Orbinuity erstellen",
        otpCode: "6-stelliger 2FA-Code", otpSentDesc: "Ein Code wurde an Ihre E-Mail gesendet.", verifyBtn: "Bestätigen & Anmelden",
        disconnect: "Trennen", notLoggedIn: "Nicht verbunden.", loggedInAs: "Angemeldet als:",
        shareFolderTitle: "Ordner Teilen", shareFolderDesc: "Suchen Sie einen Benutzer nach seinem Orbinuity-Benutzernamen.",
        search: "Suchen", addUser: "Hinzufügen", sharedWithTitle: "Geteilt Mit:", shareBtn: "Teilen", addCaseBtn: "+ Fall",
        promptNewFolder: "Ordnername:", noneYet: "Noch niemand",
        editCaseBtn: "Fall Bearbeiten", createCaseTitle: "Fall Erstellen", editCaseTitle: "Fall Bearbeiten", saveCase: "Fall Speichern",
        confirmDeleteBlock: "Diesen Block löschen?", confirmDeleteCase: "Diesen Fall löschen?", confirmDeleteFolder: "Diesen Ordner und alle Fälle löschen?"
    }
};

function getTrans(key) {
    return (translations[currentLang] && translations[currentLang][key]) || translations['en'][key] || '';
}

function getTypeLabel(type) {
    if (type === 'person') return getTrans('typePerson');
    if (type === 'general') return getTrans('typeGeneral');
    if (type === 'location') return getTrans('typeLocation');
    return type;
}

async function init() {
    applyTheme(currentTheme);
    applyLanguage(currentLang, false);

    if (orbinuityToken) {
        try {
            currentUser = await apiCall('/account/me');
            authScreen.classList.add('hidden');
            appContainer.classList.remove('hidden');
            updateCloudUI();
            await autoPullCloud();
            startAutoSyncTimer();
        } catch (e) {
            eraseCookie('acm_token');
            orbinuityToken = null;
            currentUser = null;
            authScreen.classList.remove('hidden');
            appContainer.classList.add('hidden');
        }
    } else {
        authScreen.classList.remove('hidden');
        appContainer.classList.add('hidden');
    }
}

function saveState() {
    autoPushCloud();
}

function renderSidebar() {
    sidebarContent.innerHTML = '';
    
    folders.forEach(folder => {
        const folderDiv = document.createElement('div');
        folderDiv.className = 'folder-group';
        
        const header = document.createElement('div');
        header.className = 'folder-header';
        
        const folderNameSpan = document.createElement('span');
        folderNameSpan.textContent = folder.id === 'default' ? getTrans('defaultFolder') : folder.name;
        
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'folder-actions';
        
        if (folder.id !== 'default') {
            const shareBtn = document.createElement('button');
            shareBtn.className = 'small-btn';
            shareBtn.textContent = getTrans('shareBtn');
            shareBtn.title = 'Share Folder';
            shareBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openShareModal(folder.id);
            });
            actionsDiv.appendChild(shareBtn);
        }
        
        const addCaseBtn = document.createElement('button');
        addCaseBtn.className = 'small-btn';
        addCaseBtn.textContent = getTrans('addCaseBtn');
        addCaseBtn.title = 'Add Case';
        addCaseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            createCase(folder.id);
        });
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
    
    const descEl = document.getElementById('active-case-description');
    if (currentCase.description) {
        descEl.textContent = currentCase.description;
        descEl.classList.remove('hidden');
    } else {
        descEl.textContent = '';
        descEl.classList.add('hidden');
    }
    
    blocksContainer.innerHTML = '';
    
    currentCase.blocks.forEach(block => {
        const card = document.createElement('div');
        card.className = 'info-card';

        const cardActions = document.createElement('div');
        cardActions.className = 'card-actions';

        const editBtn = document.createElement('button');
        editBtn.className = 'small-btn';
        editBtn.textContent = getTrans('editBtn');
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

        const typeText = getTypeLabel(block.type).toUpperCase();

        const headerDiv = document.createElement('div');
        headerDiv.className = 'info-card-header';
        headerDiv.innerHTML = `${imgHTML}<div><h3>${block.title}</h3><span class="info-type">${typeText}</span></div>`;
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

document.getElementById('new-folder-btn').addEventListener('click', async () => {
    const name = prompt(getTrans('promptNewFolder'));
    if (name) {
        if (orbinuityToken) {
            try {
                const res = await apiCall('/external/rooms', 'POST', { name: name.trim(), description: "", appId: APP_ID });
                if (res && res.room) {
                    const newRoomFolder = { id: res.room.id, name: res.room.name, members: res.room.members || [] };
                    folders.push(newRoomFolder);
                    saveState();
                    await autoPullCloud();
                    renderSidebar();
                    return;
                }
            } catch (e) {}
        }
        folders.push({ id: generateId(), name: name.trim(), members: [] });
        saveState(); 
        renderSidebar();
    }
});

function createCase(folderId) {
    editingCaseId = null;
    targetFolderIdForNewCase = folderId;
    caseModalTitle.textContent = getTrans('createCaseTitle');
    caseForm.reset();
    caseModal.classList.remove('hidden');
}

function editCase(caseId) {
    const c = cases.find(item => item.id === caseId);
    if (!c) return;

    editingCaseId = c.id;
    caseModalTitle.textContent = getTrans('editCaseTitle');
    caseTitleInput.value = c.title || '';
    caseDescInput.value = c.description || '';
    caseModal.classList.remove('hidden');
}

document.getElementById('edit-case-btn').addEventListener('click', () => {
    if (activeCaseId) editCase(activeCaseId);
});

caseForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = caseTitleInput.value.trim();
    const description = caseDescInput.value.trim();

    if (!title) return;

    if (editingCaseId) {
        const c = cases.find(item => item.id === editingCaseId);
        if (c) {
            c.title = title;
            c.description = description;
        }
    } else {
        const newCase = {
            id: generateId(),
            folderId: targetFolderIdForNewCase || 'default',
            title,
            description,
            blocks: []
        };
        cases.push(newCase);
        activeCaseId = newCase.id;
    }

    saveState();
    renderSidebar();
    renderActiveCase();
    caseModal.classList.add('hidden');
});

function deleteFolder(id) {
    if (confirm(getTrans('confirmDeleteFolder'))) {
        folders = folders.filter(f => f.id !== id);
        cases = cases.filter(c => c.folderId !== id);
        if(cases.length === 0) activeCaseId = null;
        saveState(); renderSidebar(); renderActiveCase();
    }
}

function deleteCase(id) {
    if (confirm(getTrans('confirmDeleteCase'))) {
        cases = cases.filter(c => c.id !== id);
        if (activeCaseId === id) activeCaseId = cases.length > 0 ? cases[0].id : null;
        saveState(); renderSidebar(); renderActiveCase();
    }
}

function deleteBlock(caseId, blockId) {
    if (confirm(getTrans('confirmDeleteBlock'))) {
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
    blockModalTitle.textContent = getTrans('editBlockTitle');

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

async function autoPushCloud() {
    if (!orbinuityToken) return;
    try {
        const payload = { 
            folders, 
            cases,
            settings: {
                theme: currentTheme,
                lang: currentLang
            }
        };
        await apiCall(`/external/${APP_ID}`, 'PUT', payload);
    } catch (e) {}
}

async function autoPullCloud() {
    if (!orbinuityToken) return;
    try {
        let roomFolders = [];
        try {
            const roomData = await apiCall(`/external/rooms?appId=${APP_ID}`, 'GET');
            if (roomData && roomData.rooms) {
                roomFolders = roomData.rooms.map(r => ({
                    id: r.id,
                    name: r.name,
                    members: r.members || []
                }));
            }
        } catch (e) {}

        let data = null;
        try {
            data = await apiCall(`/external/${APP_ID}`, 'GET');
        } catch (e) {}

        const hasSavedData = data && (data.cases || data.folders || data.settings);

        if (hasSavedData) {
            if (data.cases) cases = data.cases;

            let cloudFolders = data.folders || [];
            const defaultFolder = cloudFolders.find(f => f.id === 'default') || { id: 'default', name: 'My Cases', members: [] };

            const folderMap = new Map();
            folderMap.set('default', defaultFolder);
            cloudFolders.forEach(f => folderMap.set(f.id, f));
            roomFolders.forEach(r => folderMap.set(r.id, r));
            folders = Array.from(folderMap.values());

            if (data.settings) {
                if (data.settings.theme) {
                    currentTheme = data.settings.theme;
                    applyTheme(currentTheme);
                }
                if (data.settings.lang) {
                    currentLang = data.settings.lang;
                    applyLanguage(currentLang, false);
                }
            }
        } else {
            const defaultFolder = { id: 'default', name: 'My Cases', members: [] };
            const folderMap = new Map();
            folderMap.set('default', defaultFolder);
            roomFolders.forEach(r => folderMap.set(r.id, r));
            folders = Array.from(folderMap.values());
            cases = [];
            currentTheme = 'light';
            currentLang = 'en';
            applyTheme(currentTheme);
            applyLanguage(currentLang, false);
            await autoPushCloud();
        }

        renderSidebar();
        if (activeCaseId && cases.some(c => c.id === activeCaseId)) {
            renderActiveCase();
        } else if (cases.length > 0) {
            selectCase(cases[0].id);
        } else {
            activeCaseId = null;
            renderActiveCase();
        }
    } catch (e) {
        folders = [{ id: 'default', name: 'My Cases', members: [] }];
        cases = [];
        currentTheme = 'light';
        currentLang = 'en';
        applyTheme(currentTheme);
        applyLanguage(currentLang, false);
        renderSidebar();
        renderActiveCase();
    }
}

function startAutoSyncTimer() {
    if (autoSyncInterval) clearInterval(autoSyncInterval);
    autoSyncInterval = setInterval(() => {
        if (orbinuityToken) autoPullCloud();
    }, 10000);
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
    setCookie('acm_token', actualToken, 7);
    
    try {
        const profile = await apiCall('/account/me'); 
        currentUser = profile;
        pendingLoginUserId = null;
        authScreen.classList.add('hidden');
        appContainer.classList.remove('hidden');
        updateCloudUI();
        await autoPullCloud();
        startAutoSyncTimer();
    } catch (e) {
        orbinuityToken = null;
        eraseCookie('acm_token');
        alert("Failed to load user profile after login.");
    }
}

document.getElementById('cloud-logout-btn').addEventListener('click', () => {
    if (autoSyncInterval) clearInterval(autoSyncInterval);
    orbinuityToken = null; 
    currentUser = null;
    eraseCookie('acm_token');
    authScreen.classList.remove('hidden');
    appContainer.classList.add('hidden');
    settingsModal.classList.add('hidden');
    document.getElementById('cloud-login-form').classList.remove('hidden');
    document.getElementById('cloud-2fa-form').classList.add('hidden');
    document.getElementById('login-identifier').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('login-otp').value = '';
});

function updateCloudUI() {
    const statusText = document.getElementById('cloud-status');
    if (currentUser) {
        statusText.textContent = `${getTrans('loggedInAs')} @${currentUser.username}`;
    } else {
        statusText.textContent = getTrans('notLoggedIn');
    }
}

async function openShareModal(folderId) {
    targetShareFolderId = folderId;
    document.getElementById('share-username-input').value = '';
    
    await autoPullCloud();
    const folder = folders.find(f => f.id === folderId);
    renderSharedUsersList(folder);

    shareModal.classList.remove('hidden');
}

function renderSharedUsersList(folder) {
    const ul = document.getElementById('shared-users-list');
    ul.innerHTML = '';
    
    if (!folder || !folder.members || folder.members.length === 0) {
        ul.innerHTML = `<li style="color:var(--text-light)">${getTrans('noneYet')}</li>`;
        return;
    }

    folder.members.forEach(u => {
        const li = document.createElement('li');
        li.className = 'shared-user-item';
        
        const nameSpan = document.createElement('span');
        let displayName = '';
        let username = '';

        if (typeof u === 'object' && u !== null) {
            displayName = u.displayName || u.username || u.userId || 'User';
            username = u.username || u.userId || 'User';
        } else if (typeof u === 'string') {
            displayName = u;
            username = u;
        }

        nameSpan.textContent = `${displayName} (@${username})`;
        
        li.appendChild(nameSpan);
        ul.appendChild(li);
    });
}

document.getElementById('add-member-btn').addEventListener('click', async () => {
    if(!orbinuityToken) return alert("You must connect to Orbinuity Cloud first.");
    const username = document.getElementById('share-username-input').value.replace('@','').trim();
    if(!username || !targetShareFolderId) return;

    try {
        const res = await apiCall(`/external/rooms/${targetShareFolderId}/members`, 'POST', { username });
        alert(res.message || "Added user successfully.");
        document.getElementById('share-username-input').value = '';
        await autoPullCloud();
        const updatedFolder = folders.find(f => f.id === targetShareFolderId);
        renderSharedUsersList(updatedFolder);
    } catch (e) { 
        alert("Failed to add member to room. Make sure username is correct."); 
    }
});

document.getElementById('open-settings-btn').addEventListener('click', () => settingsModal.classList.remove('hidden'));
document.querySelectorAll('.close-settings').forEach(b => b.addEventListener('click', () => settingsModal.classList.add('hidden')));
document.querySelectorAll('.close-share').forEach(b => b.addEventListener('click', () => shareModal.classList.add('hidden')));
document.querySelectorAll('.close-case-modal').forEach(b => b.addEventListener('click', () => caseModal.classList.add('hidden')));

function applyLanguage(lang, save = true) {
    currentLang = lang; 
    languageSelect.value = lang; 
    authLanguageSelect.value = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const val = getTrans(key);
        if (val) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.placeholder = val;
            else el.textContent = val;
        }
    });
    renderSidebar();
    if (activeCaseId) renderActiveCase();
    updateCloudUI();
    if (save) autoPushCloud();
}
languageSelect.addEventListener('change', (e) => applyLanguage(e.target.value));
authLanguageSelect.addEventListener('change', (e) => applyLanguage(e.target.value));

function applyTheme(theme) { document.documentElement.setAttribute('data-theme', theme); }
document.getElementById('theme-toggle-btn').addEventListener('click', () => {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light'; 
    applyTheme(currentTheme);
    autoPushCloud();
});

document.getElementById('add-block-btn').addEventListener('click', () => {
    editingBlockId = null;
    blockModalTitle.textContent = getTrans('createBlockTitle');
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