import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import methodOverride from 'method-override';

import pool from './db/pool';
import { User } from './types';
import libraryRoutes from './routes/libraryRoutes';
import gameRoutes from './routes/gameRoutes';
import genreRoutes from './routes/genreRoutes';
import developerRoutes from './routes/developerRoutes';

const app = express();
const PORT = process.env.PORT || 3000;

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.resolve(process.cwd(), 'views'));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.resolve(process.cwd(), 'public')));

// Current user middleware (dynamic demo user: harsha)
let cachedUser: User | null = null;
app.use(async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!cachedUser) {
      const result = await pool.query<User>("SELECT id, username FROM users WHERE username = 'harsha' LIMIT 1");
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
app.get('/', (req: Request, res: Response) => res.redirect('/library'));
app.use('/library', libraryRoutes);
app.use('/games', gameRoutes);
app.use('/genres', genreRoutes);
app.use('/developers', developerRoutes);

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).render('404', {
    title: 'Page Not Found',
    activeNav: ''
  });
});

// Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Server error:', err);
  res.status(500).send('Internal Server Error: ' + err.message);
});

// Start Server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`✓ Game Tracker server running at http://localhost:${PORT}`);
  });
}

export default app;
