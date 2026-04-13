const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { pool, initializeDB } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET;

// Middleware for auth
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// === AUTH ROUTES ===
app.post('/auth/signup', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const userRole = role === 'admin' ? 'admin' : 'student';

    const [result] = await pool.query(
      'INSERT INTO Users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, userRole]
    );

    res.status(201).json({ message: 'User created successfully', id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [users] = await pool.query('SELECT * FROM Users WHERE email = ?', [email]);
    
    if (users.length === 0) return res.status(400).json({ error: 'User not found' });
    
    const user = users[0];
    const match = await bcrypt.compare(password, user.password);
    
    if (!match) return res.status(400).json({ error: 'Invalid credentials' });
    
    const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, role: user.role, name: user.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === EVENT ROUTES ===
// Get all events with current registration counts
app.get('/events', async (req, res) => {
  try {
    const query = `
      SELECT e.*, COUNT(r.id) as registered_count 
      FROM Events e
      LEFT JOIN Registrations r ON e.id = r.event_id
      GROUP BY e.id
      ORDER BY e.event_date ASC
    `;
    const [events] = await pool.query(query);
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/events', authenticate, requireAdmin, async (req, res) => {
  try {
    const { title, description, department, event_date, deadline, max_participants } = req.body;
    const [result] = await pool.query(
      'INSERT INTO Events (title, description, department, event_date, deadline, max_participants) VALUES (?, ?, ?, ?, ?, ?)',
      [title, description, department, event_date, deadline, max_participants]
    );
    res.status(201).json({ message: 'Event created', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/events/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { title, description, department, event_date, deadline, max_participants } = req.body;
    await pool.query(
      'UPDATE Events SET title=?, description=?, department=?, event_date=?, deadline=?, max_participants=? WHERE id=?',
      [title, description, department, event_date, deadline, max_participants, req.params.id]
    );
    res.json({ message: 'Event updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/events/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM Events WHERE id=?', [req.params.id]);
    res.json({ message: 'Event deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/events/:id/participants', authenticate, requireAdmin, async (req, res) => {
  try {
    const [participants] = await pool.query(`
      SELECT u.id, u.name, u.email, r.registered_at 
      FROM Registrations r
      JOIN Users u ON r.user_id = u.id
      WHERE r.event_id = ?
    `, [req.params.id]);
    res.json(participants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === REGISTRATION ROUTES ===
app.post('/events/:id/register', authenticate, async (req, res) => {
  const connection = await pool.getConnection(); // Use transaction for concurrency
  try {
    await connection.beginTransaction();
    const eventId = req.params.id;
    const userId = req.user.id;

    // Check if event exists and get details
    const [events] = await connection.query('SELECT * FROM Events WHERE id = ? FOR UPDATE', [eventId]);
    if (events.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Event not found' });
    }
    const event = events[0];

    // Check deadline
    if (new Date() > new Date(event.deadline)) {
      await connection.rollback();
      return res.status(400).json({ error: 'Registration deadline has passed' });
    }

    // Check capacity
    const [counts] = await connection.query('SELECT COUNT(*) as count FROM Registrations WHERE event_id = ?', [eventId]);
    if (counts[0].count >= event.max_participants) {
      await connection.rollback();
      return res.status(400).json({ error: 'Event is full' });
    }

    // Check duplicate
    const [existing] = await connection.query('SELECT * FROM Registrations WHERE user_id = ? AND event_id = ?', [userId, eventId]);
    if (existing.length > 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Already registered for this event' });
    }

    // Register
    await connection.query('INSERT INTO Registrations (user_id, event_id) VALUES (?, ?)', [userId, eventId]);
    await connection.commit();
    
    res.status(201).json({ message: 'Successfully registered' });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

app.get('/users/me/registrations', authenticate, async (req, res) => {
  try {
    const [registrations] = await pool.query(`
      SELECT e.*, r.registered_at 
      FROM Registrations r
      JOIN Events e ON r.event_id = e.id
      WHERE r.user_id = ?
    `, [req.user.id]);
    res.json(registrations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
initializeDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
