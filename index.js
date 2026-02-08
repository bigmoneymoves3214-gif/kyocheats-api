const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:eYBnFdCuHtcmRYbWdYoXQZxLrFcaabOG@shinkansen.proxy.rlwy.net:25061/railway',
  ssl: { rejectUnauthorized: false }
});

// ==========================================
// PRODUCTS
// ==========================================
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY created_at ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const p = req.body;
    const result = await pool.query(`
      INSERT INTO products (id, name, game, description, note, hidden, featured, is_script, price, status, image, image_zoom, gallery_images, youtube_url, pricing, features, feature_categories, requirements)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      ON CONFLICT (id) DO UPDATE SET
        name = $2, game = $3, description = $4, note = $5, hidden = $6, featured = $7, is_script = $8,
        price = $9, status = $10, image = $11, image_zoom = $12, gallery_images = $13, youtube_url = $14,
        pricing = $15, features = $16, feature_categories = $17, requirements = $18
      RETURNING *
    `, [p.id, p.name, p.game, p.description, p.note, p.hidden, p.featured, p.is_script,
        p.price, p.status, p.image, p.image_zoom, JSON.stringify(p.gallery_images || []),
        p.youtube_url, JSON.stringify(p.pricing || []), JSON.stringify(p.features || {}),
        JSON.stringify(p.feature_categories || []), JSON.stringify(p.requirements || [])]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ORDERS
// ==========================================
app.get('/api/orders', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const o = req.body;
    const result = await pool.query(`
      INSERT INTO orders (id, email, product_id, product_name, product_image, duration, amount, payment_method, payment_note, status, delivered_key, coupon, feedback, txn_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [o.id, o.email, o.product_id, o.product_name, o.product_image, o.duration, o.amount,
        o.payment_method, o.payment_note, o.status || 'pending', o.delivered_key, o.coupon, o.feedback, o.txn_id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/orders/:id', async (req, res) => {
  try {
    const updates = req.body;
    const setClauses = [];
    const values = [];
    let i = 1;
    
    for (const [key, value] of Object.entries(updates)) {
      setClauses.push(`${key} = $${i}`);
      values.push(value);
      i++;
    }
    values.push(req.params.id);
    
    const result = await pool.query(
      `UPDATE orders SET ${setClauses.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// USERS
// ==========================================
app.get('/api/users', async (req, res) => {
  try {
    const { email } = req.query;
    if (email) {
      const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      res.json(result.rows);
    } else {
      const result = await pool.query('SELECT * FROM users');
      res.json(result.rows);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { email, password_hash } = req.body;
    const result = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING *',
      [email, password_hash]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// SETTINGS
// ==========================================
app.get('/api/settings', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM settings WHERE id = 1');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const { data } = req.body;
    const result = await pool.query(
      'INSERT INTO settings (id, data) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET data = $1 RETURNING *',
      [JSON.stringify(data)]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// CATEGORIES
// ==========================================
app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY created_at ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/categories', async (req, res) => {
  try {
    const c = req.body;
    const result = await pool.query(
      'INSERT INTO categories (id, name, image) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET name = $2, image = $3 RETURNING *',
      [c.id, c.name, c.image || null]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/categories/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM categories WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// REVIEWS
// ==========================================
app.get('/api/reviews', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM reviews ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reviews', async (req, res) => {
  try {
    const r = req.body;
    const result = await pool.query(
      'INSERT INTO reviews (id, order_id, product_name, rating, text, email, is_automatic) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [r.id, r.order_id, r.product_name, r.rating, r.text, r.email, r.is_automatic || false]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/reviews/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM reviews WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// COUPONS
// ==========================================
app.get('/api/coupons', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM coupons ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/coupons', async (req, res) => {
  try {
    const c = req.body;
    const result = await pool.query(
      'INSERT INTO coupons (id, code, discount, type, uses, max_uses, expires_at) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO UPDATE SET code = $2, discount = $3, type = $4, uses = $5, max_uses = $6, expires_at = $7 RETURNING *',
      [c.id, c.code, c.discount, c.type, c.uses || 0, c.max_uses, c.expires_at]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/coupons/:id', async (req, res) => {
  try {
    const { uses } = req.body;
    const result = await pool.query(
      'UPDATE coupons SET uses = $1 WHERE id = $2 RETURNING *',
      [uses, req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/coupons/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM coupons WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
