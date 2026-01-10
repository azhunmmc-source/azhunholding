// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyALBZ03IAWaWvHmVX-9zF2GVbIeBWmV_OA",
    authDomain: "azhunholding-20283.firebaseapp.com",
    databaseURL: "https://azhunholding-20283-default-rtdb.firebaseio.com",
    projectId: "azhunholding-20283",
    storageBucket: "azhunholding-20283.firebasestorage.app",
    messagingSenderId: "525857337022",
    appId: "1:525857337022:web:d2c581cc707d270a7c3bef",
    measurementId: "G-GCJYX2WNKK"
};

// Initialize Firebase only if not already initialized
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();
const auth = firebase.auth();

// Global State
let currentCategories = {};
let currentProducts = {};

// Auth Logic
auth.onAuthStateChanged(user => {
    const authContainer = document.getElementById('auth-container');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');

    if (user) {
        authContainer.classList.add('hidden');
        sidebar.classList.remove('hidden');
        mainContent.classList.remove('hidden');
        loadData();
    } else {
        authContainer.classList.remove('hidden');
        sidebar.classList.add('hidden');
        mainContent.classList.add('hidden');
    }
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('login-error');

    try {
        console.log("Giriş cəhdi edilir...", email);
        await auth.signInWithEmailAndPassword(email, password);
        errorEl.classList.add('hidden');
    } catch (err) {
        console.error("Firebase Auth Xətası:", err);
        if (err.code === 'auth/api-key-not-valid') {
            errorEl.textContent = "Sistem xətası: API Key yanlışdır. Zəhmət olmasa administratorla əlaqə saxlayın.";
        } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
            errorEl.textContent = "E-poçt və ya şifrə yanlışdır.";
        } else {
            errorEl.textContent = "Giriş xətası: " + err.message;
        }
        errorEl.classList.remove('hidden');
    }
});

function logout() {
    auth.signOut();
}

// Navigation Logic
function switchTab(tabId) {
    // Hide all views
    document.querySelectorAll('[id^="view-"]').forEach(el => el.classList.add('hidden'));
    
    // Show selected view
    document.getElementById(`view-${tabId}`).classList.remove('hidden');
    
    // Update Sidebar Active State
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    event.currentTarget.classList.add('active');

    // Update Header Title
    const titles = {
        'dashboard': 'İcmal',
        'general': 'Ümumi Məlumatlar',
        'categories': 'Bölmələr (Kateqoriyalar)',
        'products': 'Məhsullar'
    };
    document.getElementById('page-title').innerText = titles[tabId];
}

// Data Loading
function loadData() {
    // Load Site Content
    db.ref('site_content').on('value', snapshot => {
        const data = snapshot.val() || {};
        document.getElementById('input-hero-title').value = data.hero_title || '';
        document.getElementById('input-hero-subtitle').value = data.hero_subtitle || '';
        document.getElementById('input-about-title').value = data.about_title || '';
        document.getElementById('input-about-text-1').value = data.about_text_1 || '';
        document.getElementById('input-about-text-2').value = data.about_text_2 || '';
    });

    // Load Categories
    db.ref('categories').on('value', snapshot => {
        currentCategories = snapshot.val() || {};
        renderCategories();
        updateStats();
    });

    // Load Products
    db.ref('products').on('value', snapshot => {
        currentProducts = snapshot.val() || {};
        renderProducts();
        updateStats();
    });
}

function updateStats() {
    document.getElementById('stat-products').innerText = Object.keys(currentProducts).length;
    document.getElementById('stat-categories').innerText = Object.keys(currentCategories).length;
}

// --- General Settings Logic ---
async function saveGeneralSettings() {
    const btn = document.getElementById('btn-save-general');
    const loader = btn.querySelector('.loader');
    
    btn.disabled = true;
    loader.classList.remove('hidden');

    const updates = {
        hero_title: document.getElementById('input-hero-title').value,
        hero_subtitle: document.getElementById('input-hero-subtitle').value,
        about_title: document.getElementById('input-about-title').value,
        about_text_1: document.getElementById('input-about-text-1').value,
        about_text_2: document.getElementById('input-about-text-2').value
    };

    try {
        await db.ref('site_content').update(updates);
        showNotification("Məlumatlar yadda saxlanıldı");
    } catch (err) {
        showNotification("Xəta: " + err.message, "error");
    } finally {
        btn.disabled = false;
        loader.classList.add('hidden');
    }
}

// --- Categories Logic ---
function renderCategories() {
    const tbody = document.getElementById('categories-table-body');
    tbody.innerHTML = '';
    
    Object.keys(currentCategories).forEach(id => {
        const cat = currentCategories[id];
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50 transition-colors';
        tr.innerHTML = `
            <td class="px-6 py-4 font-medium text-gray-900">${cat.name}</td>
            <td class="px-6 py-4 text-right space-x-2">
                <button onclick="editCategory('${id}')" class="text-blue-500 hover:text-blue-700 font-bold text-sm">Redaktə</button>
                <button onclick="deleteCategory('${id}')" class="text-red-500 hover:text-red-700 font-bold text-sm">Sil</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openCategoryModal(id = null) {
    const modal = document.getElementById('modal-category');
    const title = document.getElementById('modal-cat-title');
    const nameInput = document.getElementById('cat-name');
    const idInput = document.getElementById('cat-id');

    if (id) {
        title.innerText = "Bölməni Redaktə Et";
        nameInput.value = currentCategories[id].name;
        idInput.value = id;
    } else {
        title.innerText = "Yeni Bölmə";
        nameInput.value = '';
        idInput.value = '';
    }
    
    modal.classList.remove('hidden');
}

function editCategory(id) {
    openCategoryModal(id);
}

async function deleteCategory(id) {
    if (confirm('Bu bölməni silmək istədiyinizə əminsiniz?')) {
        try {
            await db.ref(`categories/${id}`).remove();
            showNotification("Bölmə silindi");
        } catch (err) {
            showNotification("Xəta: " + err.message, "error");
        }
    }
}

async function saveCategory() {
    const id = document.getElementById('cat-id').value;
    const name = document.getElementById('cat-name').value;

    if (!name) return alert('Ad daxil edin');

    try {
        if (id) {
            await db.ref(`categories/${id}`).update({ name });
        } else {
            await db.ref('categories').push({ name });
        }
        closeModal('modal-category');
        showNotification("Bölmə yadda saxlanıldı");
    } catch (err) {
        showNotification("Xəta: " + err.message, "error");
    }
}

// --- Products Logic ---
function renderProducts() {
    const tbody = document.getElementById('products-table-body');
    tbody.innerHTML = '';
    
    Object.keys(currentProducts).forEach(id => {
        const prod = currentProducts[id];
        const catName = prod.categoryId && currentCategories[prod.categoryId] 
                        ? currentCategories[prod.categoryId].name 
                        : '<span class="text-gray-400 italic">Təyin olunmayıb</span>';

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50 transition-colors';
        tr.innerHTML = `
            <td class="px-6 py-4">
                <img src="${prod.image || 'https://via.placeholder.com/50'}" class="w-12 h-12 rounded-lg object-cover bg-gray-100">
            </td>
            <td class="px-6 py-4 font-bold text-gray-900">${prod.name}</td>
            <td class="px-6 py-4 text-sm text-gray-600">${catName}</td>
            <td class="px-6 py-4 font-mono text-secondary">${prod.price || ''}</td>
            <td class="px-6 py-4 text-right space-x-2">
                <button onclick="editProduct('${id}')" class="text-blue-500 hover:text-blue-700 font-bold text-sm">Redaktə</button>
                <button onclick="deleteProduct('${id}')" class="text-red-500 hover:text-red-700 font-bold text-sm">Sil</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openProductModal(id = null) {
    const modal = document.getElementById('modal-product');
    const title = document.getElementById('modal-prod-title');
    const idInput = document.getElementById('prod-id');
    
    // Populate Categories Dropdown
    const catSelect = document.getElementById('prod-category');
    catSelect.innerHTML = '<option value="">Bölmə seçin...</option>';
    Object.keys(currentCategories).forEach(catId => {
        catSelect.innerHTML += `<option value="${catId}">${currentCategories[catId].name}</option>`;
    });

    if (id) {
        const p = currentProducts[id];
        title.innerText = "Məhsulu Redaktə Et";
        idInput.value = id;
        document.getElementById('prod-name').value = p.name || '';
        document.getElementById('prod-desc').value = p.desc || '';
        document.getElementById('prod-price').value = p.price || '';
        document.getElementById('prod-image').value = p.image || '';
        document.getElementById('prod-category').value = p.categoryId || '';
    } else {
        title.innerText = "Yeni Məhsul";
        idInput.value = '';
        document.getElementById('prod-name').value = '';
        document.getElementById('prod-desc').value = '';
        document.getElementById('prod-price').value = '';
        document.getElementById('prod-image').value = '';
        document.getElementById('prod-category').value = '';
    }
    
    modal.classList.remove('hidden');
}

function editProduct(id) {
    openProductModal(id);
}

async function deleteProduct(id) {
    if (confirm('Bu məhsulu silmək istədiyinizə əminsiniz?')) {
        try {
            await db.ref(`products/${id}`).remove();
            showNotification("Məhsul silindi");
        } catch (err) {
            showNotification("Xəta: " + err.message, "error");
        }
    }
}

async function saveProduct() {
    const id = document.getElementById('prod-id').value;
    const product = {
        name: document.getElementById('prod-name').value,
        desc: document.getElementById('prod-desc').value,
        price: document.getElementById('prod-price').value,
        image: document.getElementById('prod-image').value,
        categoryId: document.getElementById('prod-category').value
    };

    if (!product.name) return alert('Ad daxil edin');

    try {
        if (id) {
            await db.ref(`products/${id}`).update(product);
        } else {
            await db.ref('products').push(product);
        }
        closeModal('modal-product');
        showNotification("Məhsul yadda saxlanıldı");
    } catch (err) {
        showNotification("Xəta: " + err.message, "error");
    }
}


// --- Helper Functions ---
function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

function showNotification(msg, type = 'success') {
    const notif = document.getElementById('notification');
    const msgEl = document.getElementById('notification-msg');
    
    msgEl.innerText = msg;
    notif.style.borderLeftColor = type === 'success' ? '#C5A059' : '#EF4444';
    notif.querySelector('i').className = type === 'success' ? 'fas fa-check-circle text-secondary mr-3 text-xl' : 'fas fa-exclamation-circle text-red-500 mr-3 text-xl';

    notif.classList.remove('translate-y-20');
    setTimeout(() => {
        notif.classList.add('translate-y-20');
    }, 3000);
}