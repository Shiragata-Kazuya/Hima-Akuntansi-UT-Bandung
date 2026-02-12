/**
 * Firebase Cloud Functions - Backend API
 * HIMA AKUNTANSI UT BANDUNG
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Create Express app
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

console.log('✅ Firebase Cloud Functions initialized');

// ========================================
// INITIALIZE DEFAULT DATA
// ========================================
const initializeFirestore = async () => {
    try {
        const adminDoc = await db.collection('admin').doc('users').get();
        
        if (!adminDoc.exists) {
            console.log('⚙️ Initializing default data...');
            
            // Admin users
            await db.collection('admin').doc('users').set({
                users: [
                    {
                        id: 1,
                        username: 'admin',
                        password: 'admin123',
                        name: 'Administrator',
                        role: 'super_admin'
                    }
                ]
            });
            
            // Home data
            await db.collection('home').doc('data').set({
                hero: {
                    slides: [
                        {
                            image: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c",
                            title: "Profesional & Berintegritas",
                            subtitle: "Membangun Generasi Akuntan Unggul"
                        }
                    ]
                },
                about: {
                    title: "Tentang Kami",
                    description: "HIMA AKSI UT Bandung"
                },
                features: [],
                stats: [],
                visiMisi: { visi: {}, misi: {} }
            });
            
            // Kontak
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
        }
    } catch (error) {
        console.error('Error initializing:', error);
    }
};

// Initialize on first deploy
initializeFirestore();

// ========================================
// AUTHENTICATION MIDDLEWARE
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
// PUBLIC API ENDPOINTS
// ========================================

app.get('/home', async (req, res) => {
    try {
        const doc = await db.collection('home').doc('data').get();
        res.json(doc.exists ? doc.data() : {});
    } catch (error) {
        res.status(500).json({ error: 'Failed to load data' });
    }
});

app.get('/kegiatan', async (req, res) => {
    try {
        const snapshot = await db.collection('kegiatan').get();
        const activities = [];
        snapshot.forEach(doc => activities.push({ id: doc.id, ...doc.data() }));
        res.json(activities);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load data' });
    }
});

app.get('/struktur', async (req, res) => {
    try {
        const doc = await db.collection('struktur').doc('data').get();
        res.json(doc.exists ? doc.data() : {});
    } catch (error) {
        res.status(500).json({ error: 'Failed to load data' });
    }
});

app.get('/kontak', async (req, res) => {
    try {
        const doc = await db.collection('kontak').doc('data').get();
        res.json(doc.exists ? doc.data() : {});
    } catch (error) {
        res.status(500).json({ error: 'Failed to load data' });
    }
});

app.post('/pesan', async (req, res) => {
    const { name, email, subject, message } = req.body;
    
    if (!name || !email || !message) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        await db.collection('pesan').add({
            name,
            email,
            subject: subject || 'No Subject',
            message,
            timestamp: new Date().toISOString(),
            read: false
        });
        
        res.json({ status: 'success', message: 'Pesan berhasil dikirim' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save message' });
    }
});

// ========================================
// ADMIN API ENDPOINTS
// ========================================

app.post('/admin/login', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        const adminDoc = await db.collection('admin').doc('users').get();
        const adminData = adminDoc.data();
        const user = adminData.users.find(u => u.username === username && u.password === password);
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = Buffer.from(`${username}:${password}`).toString('base64');
        res.json({ status: 'success', token, user: { id: user.id, username: user.username, name: user.name } });
    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
});

app.get('/admin/pesan', authenticateAdmin, async (req, res) => {
    try {
        const snapshot = await db.collection('pesan').orderBy('timestamp', 'desc').get();
        const messages = [];
        snapshot.forEach(doc => messages.push({ id: doc.id, ...doc.data() }));
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

app.delete('/admin/pesan/:id', authenticateAdmin, async (req, res) => {
    try {
        await db.collection('pesan').doc(req.params.id).delete();
        res.json({ status: 'success' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete' });
    }
});

app.patch('/admin/pesan/:id/read', authenticateAdmin, async (req, res) => {
    try {
        await db.collection('pesan').doc(req.params.id).update({ read: true });
        res.json({ status: 'success' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update' });
    }
});

app.put('/admin/home', authenticateAdmin, async (req, res) => {
    try {
        await db.collection('home').doc('data').set(req.body);
        res.json({ status: 'success' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update' });
    }
});

app.post('/admin/kegiatan', authenticateAdmin, async (req, res) => {
    try {
        const docRef = await db.collection('kegiatan').add(req.body);
        res.json({ status: 'success', data: { id: docRef.id, ...req.body } });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add' });
    }
});

app.put('/admin/kegiatan/:id', authenticateAdmin, async (req, res) => {
    try {
        await db.collection('kegiatan').doc(req.params.id).update(req.body);
        res.json({ status: 'success' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update' });
    }
});

app.delete('/admin/kegiatan/:id', authenticateAdmin, async (req, res) => {
    try {
        await db.collection('kegiatan').doc(req.params.id).delete();
        res.json({ status: 'success' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete' });
    }
});

app.put('/admin/struktur', authenticateAdmin, async (req, res) => {
    try {
        await db.collection('struktur').doc('data').set(req.body);
        res.json({ status: 'success' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update' });
    }
});

app.put('/admin/kontak', authenticateAdmin, async (req, res) => {
    try {
        await db.collection('kontak').doc('data').set(req.body);
        res.json({ status: 'success' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update' });
    }
});

// ========================================
// EXPORT CLOUD FUNCTION
// ========================================

// Export API sebagai Cloud Function
// Endpoint: https://REGION-PROJECT_ID.cloudfunctions.net/api
exports.api = functions.https.onRequest(app);
