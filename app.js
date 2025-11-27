import express from 'express';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';
import cors from 'cors';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('frontend'));

// Rejestracja
app.post('/register', async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  try {
    const hashed = await bcrypt.hash(password, 10);
    const { data, error } = await supabase.from('Users').insert([{ username, password_hash: hashed, role: role || 'user' }]).select();
    if (error) throw error;
    res.status(201).json({ message: 'User created', user: { username: data[0].username, role: data[0].role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Logowanie
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  try {
    const { data, error } = await supabase.from('Users').select('*').eq('username', username).single();
    if (error || !data) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, data.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    res.json({ message: 'Login successful', user: { username: data.username, role: data.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint chroniony – lista wszystkich użytkowników (tylko admin)
app.get('/users', async (req, res) => {
  const role = req.headers['role']; // dla uproszczenia przesyłane w header
  if (role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

  const { data, error } = await supabase.from('Users').select('id, username, role, created_at');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
