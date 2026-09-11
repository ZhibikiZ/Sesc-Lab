import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DATA_DIR = path.join(__dirname, 'data');
const BOOKINGS_FILE = path.join(DATA_DIR, 'bookings.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Generate realistic seed bookings for current week
function getSeedBookings() {
  const today = new Date();
  const day = today.getDay();
  // Monday of this week
  const monday = new Date(today);
  monday.setDate(today.getDate() - day + (day === 0 ? -6 : 1));

  const getDateStr = (offsetDays: number) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + offsetDays);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dayStr = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dayStr}`;
  };

  return [
    {
      id: 'seed-1',
      date: getDateStr(0), // Monday
      shift: 'matutino',
      lessonNumber: 2,
      teacherName: 'Prof. Carlos Silva',
      subject: 'Matemática',
      grade: '6º Ano A',
      activityDescription: 'Atividade prática de Geometria e gráficos com planilhas',
      equipment: ['Projetor / DataShow', 'Acesso à Internet / Pesquisa'],
      studentCount: 28,
      notes: 'Precisamos de computadores ligados.',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'seed-2',
      date: getDateStr(1), // Tuesday
      shift: 'matutino',
      lessonNumber: 3,
      teacherName: 'Profª. Mariana Souza',
      subject: 'Ciências',
      grade: '7º Ano A',
      activityDescription: 'Laboratório virtual de anatomia celular e simulação microscópica',
      equipment: ['Acesso à Internet / Pesquisa', 'Fones de Ouvido'],
      studentCount: 30,
      notes: 'Fones de ouvido para simulações.',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'seed-3',
      date: getDateStr(1), // Tuesday
      shift: 'vespertino',
      lessonNumber: 1,
      teacherName: 'Prof. Roberto Mendes',
      subject: 'História',
      grade: '3º Ano C',
      activityDescription: 'Pesquisa guiada sobre a Era Vargas e elaboração de linha do tempo',
      equipment: ['Acesso à Internet / Pesquisa', 'Softwares de Escritório (Office/Docs)'],
      studentCount: 26,
      notes: '',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'seed-4',
      date: getDateStr(2), // Wednesday
      shift: 'matutino',
      lessonNumber: 1,
      teacherName: 'Profª. Fernanda Lima',
      subject: 'Língua Portuguesa',
      grade: '1º Ano A',
      activityDescription: 'Redação orientada e pesquisa sobre gêneros textuais contemporâneos',
      equipment: ['Softwares de Escritório (Office/Docs)'],
      studentCount: 31,
      notes: '',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'seed-5',
      date: getDateStr(3), // Thursday
      shift: 'vespertino',
      lessonNumber: 2,
      teacherName: 'Prof. André Santos',
      subject: 'Robótica & Tecnologia',
      grade: '2º Ano D',
      activityDescription: 'Introdução à lógica de blocos com Scratch',
      equipment: ['Scratch / Programação', 'Caixas de Som'],
      studentCount: 24,
      notes: 'Verificar se o site do Scratch está liberado no firewall.',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'seed-6',
      date: getDateStr(4), // Friday
      shift: 'matutino',
      lessonNumber: 5,
      teacherName: 'Coordenação Pedagógica',
      subject: 'Manutenção / Atualização de Softwares',
      grade: 'Geral',
      activityDescription: 'Atualização periódica dos navegadores e antivírus dos terminais',
      equipment: [],
      isMaintenance: true,
      notes: 'Laboratório reservado para manutenção técnica.',
      createdAt: new Date().toISOString(),
    },
  ];
}

function loadBookings(): any[] {
  try {
    if (fs.existsSync(BOOKINGS_FILE)) {
      const data = fs.readFileSync(BOOKINGS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading bookings file:', err);
  }
  const seed = getSeedBookings();
  saveBookings(seed);
  return seed;
}

function saveBookings(bookings: any[]) {
  try {
    fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(bookings, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing bookings file:', err);
  }
}

interface ServerConfig {
  adminPin: string;
  allowTeacherCancel: boolean;
}

function loadConfig(): ServerConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading config file:', err);
  }
  const defaultConfig: ServerConfig = {
    adminPin: '1234',
    allowTeacherCancel: false,
  };
  saveConfig(defaultConfig);
  return defaultConfig;
}

function saveConfig(config: ServerConfig) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing config file:', err);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Routes
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Get all bookings
  app.get('/api/bookings', (_req, res) => {
    const bookings = loadBookings();
    res.json(bookings);
  });

  // Create booking
  app.post('/api/bookings', (req, res) => {
    const {
      date,
      shift,
      lessonNumber,
      teacherName,
      subject,
      grade,
      activityDescription,
      equipment,
      studentCount,
      notes,
      isMaintenance,
    } = req.body;

    if (!date || !shift || !lessonNumber || !teacherName) {
      return res.status(400).json({ error: 'Campos obrigatórios ausentes: data, turno, aula e nome do professor são necessários.' });
    }

    if (shift !== 'matutino' && shift !== 'vespertino') {
      return res.status(400).json({ error: 'Turno inválido. É obrigatório selecionar o turno Matutino ou Vespertino.' });
    }

    const bookings = loadBookings();

    // Check collision: same date + shift + lessonNumber
    const existing = bookings.find(
      (b) => b.date === date && b.shift === shift && Number(b.lessonNumber) === Number(lessonNumber)
    );

    if (existing) {
      const detail = existing.grade ? `(${existing.grade})` : existing.subject ? `(${existing.subject})` : '';
      return res.status(409).json({
        error: `Este horário já está reservado por ${existing.teacherName} ${detail}.`,
        existingBooking: existing,
      });
    }

    const newBooking = {
      id: 'book-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      date,
      shift,
      lessonNumber: Number(lessonNumber),
      teacherName: teacherName.trim(),
      subject: subject ? String(subject).trim() : '',
      grade: grade ? String(grade).trim() : '',
      activityDescription: activityDescription ? String(activityDescription).trim() : '',
      equipment: Array.isArray(equipment) ? equipment : [],
      studentCount: studentCount ? Number(studentCount) : undefined,
      notes: notes ? String(notes).trim() : '',
      isMaintenance: Boolean(isMaintenance),
      createdAt: new Date().toISOString(),
    };

    bookings.push(newBooking);
    saveBookings(bookings);

    return res.status(201).json(newBooking);
  });

  // Delete / Cancel booking - Protected by Admin PIN to prevent theft or unauthorized deletion
  app.delete('/api/bookings/:id', (req, res) => {
    const { id } = req.params;
    const providedPin =
      (req.headers['x-admin-pin'] as string) ||
      (req.query.adminPin as string) ||
      req.body?.adminPin;

    const config = loadConfig();

    if (!providedPin || String(providedPin).trim() !== String(config.adminPin).trim()) {
      return res.status(403).json({
        error:
          'Senha do responsável incorreta ou ausente. Para proteger as vagas dos professores e evitar exclusões indevidas, apenas o coordenador do laboratório pode cancelar agendamentos.',
      });
    }

    let bookings = loadBookings();
    const index = bookings.findIndex((b) => b.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Agendamento não encontrado.' });
    }

    const removed = bookings.splice(index, 1)[0];
    saveBookings(bookings);
    return res.json({ success: true, removed });
  });

  // Verify Admin PIN
  app.post('/api/admin/verify-pin', (req, res) => {
    const { pin } = req.body;
    const config = loadConfig();
    const isValid = Boolean(pin && String(pin).trim() === String(config.adminPin).trim());
    return res.json({ valid: isValid });
  });

  // Change Admin PIN
  app.post('/api/admin/change-pin', (req, res) => {
    const { currentPin, newPin } = req.body;
    const config = loadConfig();

    if (!currentPin || String(currentPin).trim() !== String(config.adminPin).trim()) {
      return res.status(403).json({ error: 'Senha atual incorreta.' });
    }

    if (!newPin || String(newPin).trim().length < 3) {
      return res.status(400).json({ error: 'A nova senha deve ter pelo menos 3 dígitos ou caracteres.' });
    }

    config.adminPin = String(newPin).trim();
    saveConfig(config);
    return res.json({ success: true, message: 'Senha do responsável atualizada com sucesso!' });
  });

  // Reset demo bookings
  app.post('/api/bookings/reset', (req, res) => {
    const providedPin =
      (req.headers['x-admin-pin'] as string) ||
      (req.query.adminPin as string) ||
      req.body?.adminPin;
    const config = loadConfig();

    if (!providedPin || String(providedPin).trim() !== String(config.adminPin).trim()) {
      return res.status(403).json({ error: 'Apenas o coordenador do laboratório pode restaurar os dados.' });
    }

    const seed = getSeedBookings();
    saveBookings(seed);
    res.json({ success: true, bookings: seed });
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
}

startServer();
