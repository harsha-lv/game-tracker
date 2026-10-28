require('dotenv').config();
const express = require('express');
const path = require('path');
const methodOverride = require('method-override');

const libraryRoutes = require('./routes/libraryRoutes');
const gameRoutes = require('./routes/gameRoutes');
const genreRoutes = require('./routes/genreRoutes');
const developerRoutes = require('./routes/developerRoutes');

const pool = require('./db/pool');

const app = express();
const PORT = process.env.PORT || 3000;

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

// Current user middleware (dynamic demo user: harsha)
let cachedUser = null;
app.use(async (req, res, next) => {
  try {
    if (!cachedUser) {
      const result = await pool.query("SELECT id, username FROM users WHERE username = 'harsha' LIMIT 1");
      if (result.rows.length > 0) {
        cachedUser = result.rows[0];
      } else {
        cachedUser = { id: 1, username: 'harsha' };
      }
    }
    req.currentUser = cachedUser;
    res.locals.currentUser = req.currentUser;
    res.locals.error = null;
    res.locals.success = null;
    next();
  } catch (err) {
    next(err);
  }
});

// Routes
app.get('/', (req, res) => res.redirect('/library'));
app.use('/library', libraryRoutes);
app.use('/games', gameRoutes);
app.use('/genres', genreRoutes);
app.use('/developers', developerRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).render('404', {
    title: 'Page Not Found',
    activeNav: ''
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).send('Internal Server Error: ' + err.message);
});

// Start Server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`✓ Game Tracker server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
