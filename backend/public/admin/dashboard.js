// ========================================
// DASHBOARD.JS - Admin Panel Logic
// ========================================

// Auto-detect API base URL
const API_BASE = `${window.location.origin}/api`;
let currentTab = 'home';
let homeData = null;
let kegiatanData = [];
let strukturData = null;
let kontakData = null;
let pesanData = [];
let editingActivityId = null;

// ========================================
// AUTHENTICATION & INITIALIZATION
// ========================================

/**
 * Check authentication
 */
function checkAuth() {
    const token = localStorage.getItem('adminToken');
    const user = localStorage.getItem('adminUser');
    
    if (!token || !user) {
        window.location.href = '/admin/index.html';
        return false;
    }
    
    // Display user info
    const userData = JSON.parse(user);
    document.getElementById('adminName').textContent = userData.name;
    document.getElementById('adminRole').textContent = userData.role;
    
    return token;
}

/**
 * Make authenticated request
 */
async function authFetch(url, options = {}) {
    const token = checkAuth();
    if (!token) return null;
    
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    const response = await fetch(url, {
        ...options,
        headers
    });
    
    if (response.status === 401) {
        logout();
        return null;
    }
    
    return response;
}

/**
 * Logout
 */
function logout() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    window.location.href = '/admin/index.html';
}

/**
 * Show toast notification
 */
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    toastMessage.textContent = message;
    toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg ${
        type === 'success' ? 'bg-green-600' : 'bg-red-600'
    } text-white`;
    toast.classList.remove('hidden');
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// ========================================
// TAB NAVIGATION
// ========================================

function switchTab(tabName) {
    currentTab = tabName;
    
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Show selected section
    document.getElementById(`content-${tabName}`).classList.remove('hidden');
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active-tab');
    });
    document.getElementById(`tab-${tabName}`).classList.add('active-tab');
    
    // Load data for specific tab
    switch(tabName) {
        case 'home':
            loadHomeData();
            break;
        case 'kegiatan':
            loadKegiatan();
            break;
        case 'struktur':
            loadStruktur();
            break;
        case 'kontak':
            loadKontak();
            break;
        case 'pesan':
            loadPesan();
            break;
    }
}

// ========================================
// HOME DATA MANAGEMENT
// ========================================

async function loadHomeData() {
    try {
        const response = await fetch(`${API_BASE}/home`);
        homeData = await response.json();
        
        // Populate form
        document.getElementById('aboutTitle').value = homeData.about.title || '';
        document.getElementById('aboutDesc').value = homeData.about.description || '';
        
        // Render hero slides
        renderHeroSlides();
        
        // Render stats
        renderStats();
        
    } catch (error) {
        console.error('Error loading home data:', error);
        showToast('Gagal memuat data home', 'error');
    }
}

function renderHeroSlides() {
    const container = document.getElementById('heroSlides');
    container.innerHTML = homeData.hero.slides.map((slide, index) => `
        <div class="flex gap-2 items-start p-3 border rounded-lg">
            <img src="${slide.image}" alt="${slide.alt}" class="w-20 h-20 object-cover rounded">
            <div class="flex-1 space-y-2">
                <input type="text" value="${slide.title}" onchange="updateSlide(${index}, 'title', this.value)" 
                    class="w-full p-2 border rounded" placeholder="Judul">
                <input type="text" value="${slide.subtitle}" onchange="updateSlide(${index}, 'subtitle', this.value)"
                    class="w-full p-2 border rounded" placeholder="Subtitle">
                <input type="url" value="${slide.image}" onchange="updateSlide(${index}, 'image', this.value)"
                    class="w-full p-2 border rounded text-sm" placeholder="URL Gambar">
            </div>
            <button onclick="removeSlide(${index})" class="text-red-500 hover:text-red-700 px-2">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

function updateSlide(index, field, value) {
    homeData.hero.slides[index][field] = value;
}

function addHeroSlide() {
    homeData.hero.slides.push({
        image: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c",
        title: "Judul Baru",
        subtitle: "Subtitle Baru",
        alt: "New Slide"
    });
    renderHeroSlides();
}

function removeSlide(index) {
    if (confirm('Hapus slide ini?')) {
        homeData.hero.slides.splice(index, 1);
        renderHeroSlides();
    }
}

function renderStats() {
    const container = document.getElementById('statsGrid');
    container.innerHTML = homeData.stats.map((stat, index) => `
        <div class="border rounded-lg p-3 space-y-2">
            <input type="text" value="${stat.number}" onchange="updateStat(${index}, 'number', this.value)"
                class="w-full p-2 border rounded" placeholder="Angka">
            <input type="text" value="${stat.label}" onchange="updateStat(${index}, 'label', this.value)"
                class="w-full p-2 border rounded" placeholder="Label">
            <select onchange="updateStat(${index}, 'icon', this.value)" class="w-full p-2 border rounded">
                <option value="fa-users" ${stat.icon === 'fa-users' ? 'selected' : ''}>Users</option>
                <option value="fa-calendar-check" ${stat.icon === 'fa-calendar-check' ? 'selected' : ''}>Calendar</option>
                <option value="fa-handshake" ${stat.icon === 'fa-handshake' ? 'selected' : ''}>Handshake</option>
                <option value="fa-trophy" ${stat.icon === 'fa-trophy' ? 'selected' : ''}>Trophy</option>
            </select>
        </div>
    `).join('');
}

function updateStat(index, field, value) {
    homeData.stats[index][field] = value;
}

async function saveHomeData() {
    // Update from form
    homeData.about.title = document.getElementById('aboutTitle').value;
    homeData.about.description = document.getElementById('aboutDesc').value;
    
    try {
        const response = await authFetch(`${API_BASE}/admin/home`, {
            method: 'PUT',
            body: JSON.stringify(homeData)
        });
        
        if (response && response.ok) {
            showToast('Data home berhasil disimpan!');
        } else {
            showToast('Gagal menyimpan data home', 'error');
        }
    } catch (error) {
        console.error('Error saving home data:', error);
        showToast('Terjadi kesalahan saat menyimpan', 'error');
    }
}

// ========================================
// KEGIATAN MANAGEMENT
// ========================================

async function loadKegiatan() {
    try {
        const response = await fetch(`${API_BASE}/kegiatan`);
        kegiatanData = await response.json();
        renderKegiatan();
    } catch (error) {
        console.error('Error loading kegiatan:', error);
        showToast('Gagal memuat data kegiatan', 'error');
    }
}

function renderKegiatan() {
    const container = document.getElementById('activitiesList');
    
    if (kegiatanData.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-inbox text-4xl mb-3"></i>
                <p>Belum ada kegiatan</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = kegiatanData.map(activity => `
        <div class="border rounded-lg p-4 flex gap-4 items-start hover:shadow-md transition">
            <img src="${activity.image}" alt="${activity.title}" class="w-24 h-24 object-cover rounded">
            <div class="flex-1">
                <h3 class="font-bold text-lg">${activity.title}</h3>
                <p class="text-sm text-gray-600">${activity.date} • ${activity.category}</p>
                <p class="text-sm text-gray-700 mt-1">${activity.shortDesc}</p>
            </div>
            <div class="flex gap-2">
                <button onclick="editActivity(${activity.id})" class="text-blue-600 hover:text-blue-800 px-3 py-1">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteActivity(${activity.id})" class="text-red-600 hover:text-red-800 px-3 py-1">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function showAddActivityModal() {
    editingActivityId = null;
    document.getElementById('modalTitle').textContent = 'Tambah Kegiatan';
    document.getElementById('activityForm').reset();
    document.getElementById('activityModal').classList.remove('hidden');
    document.getElementById('activityModal').classList.add('flex');
}

function editActivity(id) {
    const activity = kegiatanData.find(a => a.id === id);
    if (!activity) return;
    
    editingActivityId = id;
    document.getElementById('modalTitle').textContent = 'Edit Kegiatan';
    document.getElementById('activityId').value = id;
    document.getElementById('activityTitle').value = activity.title;
    document.getElementById('activityDate').value = activity.date;
    document.getElementById('activityImage').value = activity.image;
    document.getElementById('activityCategory').value = activity.category;
    document.getElementById('activityShortDesc').value = activity.shortDesc;
    document.getElementById('activityFullDesc').value = activity.fullDesc;
    
    document.getElementById('activityModal').classList.remove('hidden');
    document.getElementById('activityModal').classList.add('flex');
}

async function saveActivity(event) {
    event.preventDefault();
    
    const activityData = {
        title: document.getElementById('activityTitle').value,
        date: document.getElementById('activityDate').value,
        image: document.getElementById('activityImage').value,
        category: document.getElementById('activityCategory').value,
        shortDesc: document.getElementById('activityShortDesc').value,
        fullDesc: document.getElementById('activityFullDesc').value
    };
    
    try {
        let response;
        
        if (editingActivityId) {
            // Update existing
            response = await authFetch(`${API_BASE}/admin/kegiatan/${editingActivityId}`, {
                method: 'PUT',
                body: JSON.stringify(activityData)
            });
        } else {
            // Create new
            response = await authFetch(`${API_BASE}/admin/kegiatan`, {
                method: 'POST',
                body: JSON.stringify(activityData)
            });
        }
        
        if (response && response.ok) {
            showToast(editingActivityId ? 'Kegiatan berhasil diupdate!' : 'Kegiatan berhasil ditambahkan!');
            closeActivityModal();
            loadKegiatan();
        } else {
            showToast('Gagal menyimpan kegiatan', 'error');
        }
    } catch (error) {
        console.error('Error saving activity:', error);
        showToast('Terjadi kesalahan saat menyimpan', 'error');
    }
}

async function deleteActivity(id) {
    if (!confirm('Yakin ingin menghapus kegiatan ini?')) return;
    
    try {
        const response = await authFetch(`${API_BASE}/admin/kegiatan/${id}`, {
            method: 'DELETE'
        });
        
        if (response && response.ok) {
            showToast('Kegiatan berhasil dihapus!');
            loadKegiatan();
        } else {
            showToast('Gagal menghapus kegiatan', 'error');
        }
    } catch (error) {
        console.error('Error deleting activity:', error);
        showToast('Terjadi kesalahan saat menghapus', 'error');
    }
}

function closeActivityModal() {
    document.getElementById('activityModal').classList.add('hidden');
    document.getElementById('activityModal').classList.remove('flex');
    editingActivityId = null;
}

// ========================================
// STRUKTUR MANAGEMENT
// ========================================

let currentPeriode = '2025';
let currentStrukturData = null;

async function loadStruktur() {
    try {
        const response = await fetch(`${API_BASE}/struktur`);
        strukturData = await response.json();
        
        // Populate periode selector
        const selector = document.getElementById('periodeSelector');
        if (selector) {
            selector.innerHTML = Object.keys(strukturData)
                .sort((a, b) => b - a)
                .map(tahun => `<option value="${tahun}">${tahun}</option>`)
                .join('');
            
            currentPeriode = selector.value;
            loadPeriodeData(currentPeriode);
        }
    } catch (error) {
        console.error('Error loading struktur:', error);
        showToast('Gagal memuat data struktur', 'error');
    }
}

function loadPeriodeData(periode) {
    currentPeriode = periode;
    currentStrukturData = strukturData[periode];
    
    if (!currentStrukturData) {
        currentStrukturData = {
            ketua: { name: '', img: '' },
            wakil: { name: '', img: '' },
            divisi: [],
            galeri: []
        };
    }
    
    renderStrukturForm();
}

function renderStrukturForm() {
    // Ketua & Wakil
    document.getElementById('ketuaName').value = currentStrukturData.ketua?.name || '';
    document.getElementById('ketuaImg').value = currentStrukturData.ketua?.img || '';
    document.getElementById('wakilName').value = currentStrukturData.wakil?.name || '';
    document.getElementById('wakilImg').value = currentStrukturData.wakil?.img || '';
    
    // Divisi
    renderDivisiList();
    
    // Galeri
    renderGaleriList();
}

function renderDivisiList() {
    const container = document.getElementById('divisiList');
    const divisi = currentStrukturData.divisi || [];
    
    if (divisi.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-sm">Belum ada divisi. Klik "Tambah Divisi" untuk menambahkan.</p>';
        return;
    }
    
    container.innerHTML = divisi.map((div, index) => `
        <div class="border rounded-lg p-3 bg-gray-50">
            <div class="flex justify-between items-start mb-3">
                <input type="text" value="${div.nama || ''}" 
                    onchange="updateDivisiNama(${index}, this.value)"
                    placeholder="Nama Divisi" 
                    class="flex-1 p-2 border rounded font-semibold">
                <button onclick="removeDivisi(${index})" class="ml-2 text-red-500 hover:text-red-700 px-2">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            
            <div class="space-y-2 pl-4 border-l-2 border-gold-500">
                <p class="text-xs font-semibold text-gray-600">Kepala Divisi:</p>
                <div class="grid grid-cols-2 gap-2">
                    <input type="text" value="${div.kadiv?.name || ''}" 
                        onchange="updateKadiv(${index}, 'name', this.value)"
                        placeholder="Nama Kadiv" 
                        class="p-2 border rounded text-sm">
                    <input type="url" value="${div.kadiv?.img || ''}" 
                        onchange="updateKadiv(${index}, 'img', this.value)"
                        placeholder="URL Foto" 
                        class="p-2 border rounded text-sm">
                </div>
                
                <p class="text-xs font-semibold text-gray-600 mt-3">Anggota:</p>
                <div id="anggota-${index}" class="space-y-2">
                    ${(div.anggota || []).map((anggota, aIdx) => `
                        <div class="grid grid-cols-2 gap-2">
                            <input type="text" value="${anggota.name || ''}" 
                                onchange="updateAnggota(${index}, ${aIdx}, 'name', this.value)"
                                placeholder="Nama Anggota" 
                                class="p-2 border rounded text-sm">
                            <div class="flex gap-1">
                                <input type="url" value="${anggota.img || ''}" 
                                    onchange="updateAnggota(${index}, ${aIdx}, 'img', this.value)"
                                    placeholder="URL Foto" 
                                    class="flex-1 p-2 border rounded text-sm">
                                <button onclick="removeAnggota(${index}, ${aIdx})" 
                                    class="text-red-500 hover:text-red-700 px-2">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <button onclick="addAnggota(${index})" 
                    class="text-sm text-blue-600 hover:text-blue-800">
                    <i class="fas fa-plus mr-1"></i>Tambah Anggota
                </button>
            </div>
        </div>
    `).join('');
}

function renderGaleriList() {
    const container = document.getElementById('galeriList');
    const galeri = currentStrukturData.galeri || [];
    
    if (galeri.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-sm col-span-2">Belum ada foto galeri.</p>';
        return;
    }
    
    container.innerHTML = galeri.map((foto, index) => `
        <div class="border rounded-lg p-3 bg-gray-50">
            <img src="${foto.url || ''}" alt="${foto.caption || ''}" 
                class="w-full h-32 object-cover rounded mb-2" 
                onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
            <input type="url" value="${foto.url || ''}" 
                onchange="updateGaleri(${index}, 'url', this.value)"
                placeholder="URL Foto" 
                class="w-full p-2 border rounded text-sm mb-2">
            <input type="text" value="${foto.caption || ''}" 
                onchange="updateGaleri(${index}, 'caption', this.value)"
                placeholder="Caption" 
                class="w-full p-2 border rounded text-sm mb-2">
            <button onclick="removeGaleri(${index})" 
                class="w-full text-red-500 hover:text-red-700 text-sm">
                <i class="fas fa-trash mr-1"></i>Hapus
            </button>
        </div>
    `).join('');
}

function addDivisi() {
    if (!currentStrukturData.divisi) currentStrukturData.divisi = [];
    currentStrukturData.divisi.push({
        nama: 'Divisi Baru',
        kadiv: { name: '', img: '' },
        anggota: []
    });
    renderDivisiList();
}

function removeDivisi(index) {
    if (confirm('Hapus divisi ini?')) {
        currentStrukturData.divisi.splice(index, 1);
        renderDivisiList();
    }
}

function updateDivisiNama(index, value) {
    currentStrukturData.divisi[index].nama = value;
}

function updateKadiv(divIndex, field, value) {
    if (!currentStrukturData.divisi[divIndex].kadiv) {
        currentStrukturData.divisi[divIndex].kadiv = {};
    }
    currentStrukturData.divisi[divIndex].kadiv[field] = value;
}

function addAnggota(divIndex) {
    if (!currentStrukturData.divisi[divIndex].anggota) {
        currentStrukturData.divisi[divIndex].anggota = [];
    }
    currentStrukturData.divisi[divIndex].anggota.push({ name: '', img: '' });
    renderDivisiList();
}

function removeAnggota(divIndex, anggotaIndex) {
    currentStrukturData.divisi[divIndex].anggota.splice(anggotaIndex, 1);
    renderDivisiList();
}

function updateAnggota(divIndex, anggotaIndex, field, value) {
    currentStrukturData.divisi[divIndex].anggota[anggotaIndex][field] = value;
}

function addGaleri() {
    if (!currentStrukturData.galeri) currentStrukturData.galeri = [];
    currentStrukturData.galeri.push({ url: '', caption: '' });
    renderGaleriList();
}

function removeGaleri(index) {
    if (confirm('Hapus foto ini?')) {
        currentStrukturData.galeri.splice(index, 1);
        renderGaleriList();
    }
}

function updateGaleri(index, field, value) {
    currentStrukturData.galeri[index][field] = value;
    if (field === 'url') {
        renderGaleriList(); // Re-render to show updated image
    }
}

async function saveStrukturData() {
    // Update dari form
    currentStrukturData.ketua = {
        name: document.getElementById('ketuaName').value,
        img: document.getElementById('ketuaImg').value
    };
    
    currentStrukturData.wakil = {
        name: document.getElementById('wakilName').value,
        img: document.getElementById('wakilImg').value
    };
    
    // Update strukturData dengan data periode saat ini
    strukturData[currentPeriode] = currentStrukturData;
    
    try {
        const response = await authFetch(`${API_BASE}/admin/struktur`, {
            method: 'PUT',
            body: JSON.stringify(strukturData)
        });
        
        if (response && response.ok) {
            showToast('Data struktur berhasil disimpan!');
        } else {
            showToast('Gagal menyimpan data struktur', 'error');
        }
    } catch (error) {
        console.error('Error saving struktur:', error);
        showToast('Terjadi kesalahan saat menyimpan', 'error');
    }
}

function showAddPeriodeModal() {
    const tahun = prompt('Masukkan tahun periode baru (contoh: 2026):');
    if (tahun && !strukturData[tahun]) {
        strukturData[tahun] = {
            ketua: { name: '', img: '' },
            wakil: { name: '', img: '' },
            divisi: [],
            galeri: []
        };
        
        // Refresh selector
        loadStruktur();
        showToast(`Periode ${tahun} berhasil ditambahkan!`);
    } else if (strukturData[tahun]) {
        alert('Periode tersebut sudah ada!');
    }
}

// ========================================
// KONTAK MANAGEMENT
// ========================================

async function loadKontak() {
    try {
        const response = await fetch(`${API_BASE}/kontak`);
        kontakData = await response.json();
        
        document.getElementById('kontakEmail').value = kontakData.email || '';
        document.getElementById('kontakPhone').value = kontakData.phone || '';
        document.getElementById('kontakAddress').value = kontakData.address || '';
        document.getElementById('kontakInstagram').value = kontakData.social.instagram || '';
        document.getElementById('kontakTwitter').value = kontakData.social.twitter || '';
        document.getElementById('kontakLinkedin').value = kontakData.social.linkedin || '';
    } catch (error) {
        console.error('Error loading kontak:', error);
        showToast('Gagal memuat data kontak', 'error');
    }
}

async function saveKontakData() {
    kontakData = {
        email: document.getElementById('kontakEmail').value,
        phone: document.getElementById('kontakPhone').value,
        address: document.getElementById('kontakAddress').value,
        social: {
            instagram: document.getElementById('kontakInstagram').value,
            twitter: document.getElementById('kontakTwitter').value,
            linkedin: document.getElementById('kontakLinkedin').value
        }
    };
    
    try {
        const response = await authFetch(`${API_BASE}/admin/kontak`, {
            method: 'PUT',
            body: JSON.stringify(kontakData)
        });
        
        if (response && response.ok) {
            showToast('Data kontak berhasil disimpan!');
        } else {
            showToast('Gagal menyimpan data kontak', 'error');
        }
    } catch (error) {
        console.error('Error saving kontak:', error);
        showToast('Terjadi kesalahan saat menyimpan', 'error');
    }
}

// ========================================
// PESAN MANAGEMENT
// ========================================

async function loadPesan() {
    try {
        const response = await authFetch(`${API_BASE}/admin/pesan`);
        if (!response) return;
        
        pesanData = await response.json();
        renderPesan();
        updateUnreadBadge();
    } catch (error) {
        console.error('Error loading pesan:', error);
        showToast('Gagal memuat pesan', 'error');
    }
}

function renderPesan() {
    const container = document.getElementById('pesanList');
    
    if (pesanData.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-inbox text-4xl mb-3"></i>
                <p>Belum ada pesan masuk</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = pesanData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).map(msg => `
        <div class="border rounded-lg p-4 ${msg.read ? 'bg-gray-50' : 'bg-blue-50 border-blue-200'}">
            <div class="flex justify-between items-start mb-2">
                <div>
                    <h3 class="font-bold">${msg.name}</h3>
                    <p class="text-sm text-gray-600">${msg.email}</p>
                </div>
                <div class="flex gap-2">
                    ${!msg.read ? `<button onclick="markAsRead(${msg.id})" class="text-green-600 hover:text-green-800 px-2">
                        <i class="fas fa-check"></i>
                    </button>` : ''}
                    <button onclick="deletePesan(${msg.id})" class="text-red-600 hover:text-red-800 px-2">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <p class="text-sm font-semibold text-gray-700 mb-1">${msg.subject}</p>
            <p class="text-sm text-gray-600">${msg.message}</p>
            <p class="text-xs text-gray-400 mt-2">${new Date(msg.timestamp).toLocaleString('id-ID')}</p>
        </div>
    `).join('');
}

async function markAsRead(id) {
    try {
        const response = await authFetch(`${API_BASE}/admin/pesan/${id}/read`, {
            method: 'PATCH'
        });
        
        if (response && response.ok) {
            loadPesan();
        }
    } catch (error) {
        console.error('Error marking message as read:', error);
    }
}

async function deletePesan(id) {
    if (!confirm('Yakin ingin menghapus pesan ini?')) return;
    
    try {
        const response = await authFetch(`${API_BASE}/admin/pesan/${id}`, {
            method: 'DELETE'
        });
        
        if (response && response.ok) {
            showToast('Pesan berhasil dihapus!');
            loadPesan();
        } else {
            showToast('Gagal menghapus pesan', 'error');
        }
    } catch (error) {
        console.error('Error deleting message:', error);
        showToast('Terjadi kesalahan saat menghapus', 'error');
    }
}

function updateUnreadBadge() {
    const unreadCount = pesanData.filter(m => !m.read).length;
    const badge = document.getElementById('unreadBadge');
    
    if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

// ========================================
// INITIALIZATION
// ========================================

window.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadHomeData();
    updateUnreadBadge();
    
    // Load pesan in background
    loadPesan();
});
