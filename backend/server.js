require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const app = express();

// Port dari environment variable atau default 3000
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Untuk serve admin panel

// ========================================
// FIREBASE ADMIN SDK INITIALIZATION
// ========================================

// Decode private key from base64 (untuk handle multiline di env vars)
let privateKey;
try {
    // Jika FIREBASE_PRIVATE_KEY_BASE64 ada, decode dari base64
    if (process.env.FIREBASE_PRIVATE_KEY_BASE64) {
        privateKey = Buffer.from(process.env.FIREBASE_PRIVATE_KEY_BASE64, 'base64').toString('utf-8');
        console.log('📝 Using base64 encoded private key');
    } 
    // Fallback: coba langsung dari FIREBASE_PRIVATE_KEY dengan replace \\n
    else if (process.env.FIREBASE_PRIVATE_KEY) {
        privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
        console.log('📝 Using direct private key');
    } else {
        throw new Error('FIREBASE_PRIVATE_KEY_BASE64 or FIREBASE_PRIVATE_KEY not found in environment variables');
    }
} catch (error) {
    console.error('❌ Error loading Firebase private key:', error.message);
    console.error('💡 Tip: Encode your private key to base64 and set FIREBASE_PRIVATE_KEY_BASE64');
    process.exit(1);
}

// Initialize Firebase Admin dengan environment variables
const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: privateKey,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.FIREBASE_CERT_URL
};

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

console.log('✅ Firebase initialized successfully');


// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Initialize default data di Firestore (hanya sekali)
 */
const initializeFirestore = async () => {
    try {
        // Check if admin already exists
        const adminDoc = await db.collection('admin').doc('users').get();
        
        if (!adminDoc.exists) {
            console.log('⚙️ Initializing default data...');
            
            // Create default admin user
            await db.collection('admin').doc('users').set({
                users: [
                    {
                        id: 1,
                        username: 'admin',
                        password: 'admin123', // GANTI DI PRODUCTION!
                        name: 'Administrator',
                        role: 'super_admin'
                    }
                ]
            });
            
            // Create default home data
            await db.collection('home').doc('data').set({
                hero: {
                    slides: [
                        {
                            image: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80",
                            title: "Profesional & Berintegritas",
                            subtitle: "Membangun Generasi Akuntan Unggul",
                            alt: "Accounting Team"
                        },
                        {
                            image: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80",
                            title: "Kolaborasi & Inovasi",
                            subtitle: "Bersama Hima Akuntansi UT Bandung",
                            alt: "Collaboration"
                        }
                    ]
                },
                about: {
                    title: "Tentang Kami",
                    description: "Himpunan Mahasiswa Akuntansi Universitas Terbuka Bandung (HIMA AKSI UT Bandung) adalah wadah aspirasi dan kreasi bagi seluruh mahasiswa jurusan Akuntansi."
                },
                features: [
                    { icon: "fa-book-open", title: "Edukasi", description: "Workshop dan seminar untuk meningkatkan kompetensi" },
                    { icon: "fa-users", title: "Sosial", description: "Kegiatan bakti sosial dan kepedulian masyarakat" },
                    { icon: "fa-network-wired", title: "Relasi", description: "Membangun jaringan profesional yang luas" }
                ],
                stats: [
                    { number: "20+", label: "Anggota Aktif", icon: "fa-users" },
                    { number: "10+", label: "Kegiatan per Tahun", icon: "fa-calendar-check" },
                    { number: "5+", label: "Mitra Kerjasama", icon: "fa-handshake" },
                    { number: "2+", label: "Tahun Berdiri", icon: "fa-trophy" }
                ],
                visiMisi: {
                    visi: {
                        title: "Visi",
                        content: "Menjadikan HIMA Akuntansi sebagai organisasi yang unggul, aktif, inovatif, dan berintegritas tinggi."
                    },
                    misi: {
                        title: "Misi",
                        items: [
                            "Menjadi Jembatan Komunikasi & Aspirasi",
                            "Meningkatan Kualitas Akademik & Profesionalisme",
                            "Pengembangan Inovasi dan Kreativitas",
                            "Solidaritas & Kolaborasi Strategis",
                            "Kontribusi Sosial & Pengabdian Masyarakat"
                        ]
                    }
                }
            });
            
            // Create default kontak
            await db.collection('kontak').doc('data').set({
                email: "himaakuntansi@ut.ac.id",
                phone: "+62 812-3456-7890",
                address: "Jl. Cihideung, Bandung",
                social: {
                    instagram: "@himaakuntansi_ut",
                    twitter: "@himaakuntansi",
                    linkedin: "hima-akuntansi-ut"
                }
            });
            
            console.log('✅ Default data initialized');
        } else {
            console.log('✅ Firestore already initialized');
        }
    } catch (error) {
        console.error('❌ Error initializing Firestore:', error);
    }
};

// Initialize on startup
initializeFirestore();

// ========================================
// MIDDLEWARE - Simple Authentication
// ========================================
const authenticateAdmin = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    
    try {
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        const [username, password] = decoded.split(':');
        
        const adminDoc = await db.collection('admin').doc('users').get();
        const adminData = adminDoc.data();
        
        const user = adminData.users.find(u => u.username === username && u.password === password);
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// ========================================
// PUBLIC API ENDPOINTS (Frontend)
// ========================================

/**
 * GET Home Data
 */
app.get('/api/home', async (req, res) => {
    try {
        const doc = await db.collection('home').doc('data').get();
        if (doc.exists) {
            res.json(doc.data());
        } else {
            res.status(404).json({ error: 'Home data not found' });
        }
    } catch (error) {
        console.error('Error fetching home data:', error);
        res.status(500).json({ error: 'Failed to load home data' });
    }
});

/**
 * GET Kegiatan Data
 */
app.get('/api/kegiatan', async (req, res) => {
    try {
        // Asumsi data kamu ada di koleksi 'kegiatan' dokumen 'data' (sesuai gambar)
        const doc = await db.collection('kegiatan').doc('data').get();
        
        if (doc.exists) {
            const data = doc.data();
            // Kirim isi array activities ke frontend
            res.json(data.activities || []);
        } else {
            res.status(404).json({ error: 'Data kegiatan tidak ditemukan' });
        }
    } catch (error) {
        console.error('Error fetching kegiatan:', error);
        res.status(500).json({ error: 'Gagal memuat kegiatan' });
    }
});

/**
 * GET Struktur Data
 */
app.get('/api/struktur', async (req, res) => {
    try {
        const doc = await db.collection('struktur').doc('data').get();
        if (doc.exists) {
            res.json(doc.data());
        } else {
            res.status(404).json({ error: 'Struktur data not found' });
        }
    } catch (error) {
        console.error('Error fetching struktur:', error);
        res.status(500).json({ error: 'Failed to load struktur data' });
    }
});

/**
 * GET Kontak Data
 */
app.get('/api/kontak', async (req, res) => {
    try {
        const doc = await db.collection('kontak').doc('data').get();
        if (doc.exists) {
            res.json(doc.data());
        } else {
            res.status(404).json({ error: 'Kontak data not found' });
        }
    } catch (error) {
        console.error('Error fetching kontak:', error);
        res.status(500).json({ error: 'Failed to load kontak data' });
    }
});

/**
 * POST Pesan (dari form kontak)
 */
app.post('/api/pesan', async (req, res) => {
    const { name, email, subject, message } = req.body;
    
    if (!name || !email || !message) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const newMessage = {
            name,
            email,
            subject: subject || 'No Subject',
            message,
            timestamp: new Date().toISOString(),
            read: false
        };

        const docRef = await db.collection('pesan').add(newMessage);
        
        console.log('📧 Pesan baru diterima dari:', name);
        res.json({ 
            status: 'success', 
            message: 'Terima kasih! Pesan Anda sudah kami terima.',
            id: docRef.id
        });
    } catch (error) {
        console.error('Error saving message:', error);
        res.status(500).json({ error: 'Failed to save message' });
    }
});

// ========================================
// ADMIN API ENDPOINTS (Protected)
// ========================================

/**
 * POST Admin Login
 */
app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Missing credentials' });
    }

    try {
        const adminDoc = await db.collection('admin').doc('users').get();
        const adminData = adminDoc.data();
        const user = adminData.users.find(u => u.username === username && u.password === password);
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const token = Buffer.from(`${username}:${password}`).toString('base64');
        
        res.json({
            status: 'success',
            token,
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

/**
 * GET All Messages (Admin)
 */
app.get('/api/admin/pesan', authenticateAdmin, async (req, res) => {
    try {
        const snapshot = await db.collection('pesan').orderBy('timestamp', 'desc').get();
        const messages = [];
        snapshot.forEach(doc => {
            messages.push({ id: doc.id, ...doc.data() });
        });
        res.json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

/**
 * DELETE Message (Admin)
 */
app.delete('/api/admin/pesan/:id', authenticateAdmin, async (req, res) => {
    try {
        await db.collection('pesan').doc(req.params.id).delete();
        res.json({ status: 'success', message: 'Message deleted' });
    } catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({ error: 'Failed to delete message' });
    }
});

/**
 * PATCH Mark message as read (Admin)
 */
app.patch('/api/admin/pesan/:id/read', authenticateAdmin, async (req, res) => {
    try {
        await db.collection('pesan').doc(req.params.id).update({ read: true });
        res.json({ status: 'success' });
    } catch (error) {
        console.error('Error updating message:', error);
        res.status(500).json({ error: 'Failed to update message' });
    }
});

// --- HOME ADMIN ENDPOINTS ---
app.put('/api/admin/home', authenticateAdmin, async (req, res) => {
    try {
        await db.collection('home').doc('data').set(req.body);
        res.json({ status: 'success', message: 'Home data updated' });
    } catch (error) {
        console.error('Error updating home:', error);
        res.status(500).json({ error: 'Failed to update home data' });
    }
});

// --- KEGIATAN ADMIN ENDPOINTS ---
app.get('/api/kegiatan', async (req, res) => {
    try {
        // Asumsi data kamu ada di koleksi 'kegiatan' dokumen 'data' (sesuai gambar)
        const doc = await db.collection('kegiatan').doc('data').get();
        
        if (doc.exists) {
            const data = doc.data();
            // Kirim isi array activities ke frontend
            res.json(data.activities || []);
        } else {
            res.status(404).json({ error: 'Data kegiatan tidak ditemukan' });
        }
    } catch (error) {
        console.error('Error fetching kegiatan:', error);
        res.status(500).json({ error: 'Gagal memuat kegiatan' });
    }
});

app.delete('/api/admin/kegiatan/:id', authenticateAdmin, async (req, res) => {
    try {
        await db.collection('kegiatan').doc(req.params.id).delete();
        res.json({ status: 'success', message: 'Activity deleted' });
    } catch (error) {
        console.error('Error deleting activity:', error);
        res.status(500).json({ error: 'Failed to delete activity' });
    }
});

// --- STRUKTUR ADMIN ENDPOINTS ---
app.put('/api/admin/struktur', authenticateAdmin, async (req, res) => {
    try {
        await db.collection('struktur').doc('data').set(req.body);
        res.json({ status: 'success', message: 'Struktur data updated' });
    } catch (error) {
        console.error('Error updating struktur:', error);
        res.status(500).json({ error: 'Failed to update struktur data' });
    }
});

// --- KONTAK ADMIN ENDPOINTS ---
app.put('/api/admin/kontak', authenticateAdmin, async (req, res) => {
    try {
        await db.collection('kontak').doc('data').set(req.body);
        res.json({ status: 'success', message: 'Kontak data updated' });
    } catch (error) {
        console.error('Error updating kontak:', error);
        res.status(500).json({ error: 'Failed to update kontak data' });
    }
});

// ========================================
// MIGRASI DATA JSON KE FIREBASE (TAMBAHKAN DI SINI)
// ========================================
// ... kode Firebase kamu tetap sama ...

// Hapus bagian migrasi JSON ke Firebase karena Cloudflare tidak dukung 'fs'

const serverless = require('@codegenie/serverless-express');

// Export untuk Cloudflare Workers
exports.fetch = (request, env, ctx) => {
    return serverless({ app })(request, env, ctx);
};

// ========================================
// START SERVER
// ========================================
app.listen(PORT, () => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ HIMA AKUNTANSI UT BANDUNG - Backend Server`);
    console.log(`${'='.repeat(60)}`);
    console.log(`🚀 Server running at: http://localhost:${PORT}`);
    console.log(`🔥 Firebase Firestore: Connected`);
    console.log(`\n📡 Public API Endpoints:`);
    console.log(`   GET  /api/home        - Homepage data`);
    console.log(`   GET  /api/kegiatan    - Activities list`);
    console.log(`   GET  /api/struktur    - Organization structure`);
    console.log(`   GET  /api/kontak      - Contact info`);
    console.log(`   POST /api/pesan       - Submit contact form`);
    console.log(`\n🔐 Admin API Endpoints:`);
    console.log(`   POST   /api/admin/login              - Admin login`);
    console.log(`   GET    /api/admin/pesan              - Get all messages`);
    console.log(`   DELETE /api/admin/pesan/:id          - Delete message`);
    console.log(`   PUT    /api/admin/home               - Update home data`);
    console.log(`   POST   /api/admin/kegiatan           - Add activity`);
    console.log(`   PUT    /api/admin/kegiatan/:id       - Update activity`);
    console.log(`   DELETE /api/admin/kegiatan/:id       - Delete activity`);
    console.log(`   PUT    /api/admin/struktur           - Update struktur`);
    console.log(`   PUT    /api/admin/kontak             - Update kontak`);
    console.log(`\n🎨 Admin Panel: http://localhost:${PORT}/admin`);
    console.log(`   Default Login: admin / admin123`);
    console.log(`${'='.repeat(60)}\n`);
});
module.exports = app;