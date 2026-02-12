# HIMA AKUNTANSI UT BANDUNG - Backend API

Backend server untuk website HIMA AKUNTANSI UT BANDUNG dengan Admin Panel.

## 🚀 Tech Stack

- Node.js
- Express.js
- JSON Database
- CORS enabled

## 📦 Installation

```bash
npm install
```

## 🏃 Run Development

```bash
npm run dev
```

## 🚀 Run Production

```bash
npm start
```

## 🔗 API Endpoints

### Public Endpoints
- `GET /api/home` - Homepage data
- `GET /api/kegiatan` - Activities list
- `GET /api/struktur` - Organization structure
- `GET /api/kontak` - Contact info
- `POST /api/pesan` - Submit contact form

### Admin Endpoints (Protected)
- `POST /api/admin/login` - Admin login
- `GET /api/admin/pesan` - Get all messages
- `PUT /api/admin/home` - Update home data
- `POST /api/admin/kegiatan` - Add activity
- `PUT /api/admin/kegiatan/:id` - Update activity
- `DELETE /api/admin/kegiatan/:id` - Delete activity
- `PUT /api/admin/struktur` - Update organization structure
- `PUT /api/admin/kontak` - Update contact info

## 🔐 Admin Panel

Access admin panel at: `/admin`

Default credentials:
- Username: `admin`
- Password: `admin123`

**⚠️ IMPORTANT: Change default password in production!**

## 📝 Environment Variables

- `PORT` - Server port (default: 3000)

## 📄 License

© 2024 HIMA AKUNTANSI UT BANDUNG - Kabinet Sinergi
# Hima-Akuntansi-UT-Bandung
