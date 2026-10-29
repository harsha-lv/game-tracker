import { Request, Response, NextFunction } from 'express';
import pool from '../db/pool';
import { Genre, Game } from '../types';

export const listGenres = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = `
      SELECT g.id, g.name, g.description, COUNT(gg.game_id)::int AS game_count
      FROM genres g
      LEFT JOIN game_genres gg ON g.id = gg.genre_id
      GROUP BY g.id
      ORDER BY g.name ASC;
    `;
    const { rows: genres } = await pool.query<Genre>(query);
    res.render('genres/index', {
      title: 'Genres',
      activeNav: 'genres',
      genres
    });
  } catch (err) {
    next(err);
  }
};

export const showGenre = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;
  try {
    const genreResult = await pool.query<Genre>('SELECT * FROM genres WHERE id = $1', [id]);
    if (genreResult.rows.length === 0) {
      res.status(404).render('404', { title: 'Genre Not Found' });
      return;
    }
    const genre = genreResult.rows[0];

    const gamesQuery = `
      SELECT g.id, g.title, g.release_year,
             COALESCE(string_agg(DISTINCT d.name, ', '), '') AS developers_list
      FROM games g
      JOIN game_genres gg ON g.id = gg.game_id
      LEFT JOIN game_developers gd ON g.id = gd.game_id
      LEFT JOIN developers d ON gd.developer_id = d.id
      WHERE gg.genre_id = $1
      GROUP BY g.id
      ORDER BY g.title ASC;
    `;
    const { rows: games } = await pool.query<Game>(gamesQuery, [id]);

    res.render('genres/show', {
      title: genre.name,
      activeNav: 'genres',
      genre,
      games
    });
  } catch (err) {
    next(err);
  }
};

export const newGenreForm = (req: Request, res: Response): void => {
  res.render('genres/new', {
    title: 'New Genre',
    activeNav: 'genres',
    genre: {},
    error: null
  });
};

export const createGenre = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { name, description } = req.body;
  if (!name || !name.trim()) {
    res.render('genres/new', {
      title: 'New Genre',
      activeNav: 'genres',
      genre: { name, description },
      error: 'Genre name is required.'
    });
    return;
  }

  try {
    const result = await pool.query<{ id: number }>(
      'INSERT INTO genres (name, description) VALUES ($1, $2) RETURNING id',
      [name.trim(), description ? description.trim() : null]
    );
    res.redirect(`/genres/${result.rows[0].id}`);
  } catch (err: any) {
    if (err.code === '23505') {
      res.render('genres/new', {
        title: 'New Genre',
        activeNav: 'genres',
        genre: { name, description },
        error: 'A genre with that name already exists.'
      });
      return;
    }
    next(err);
  }
};

export const editGenreForm = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;
  try {
    const result = await pool.query<Genre>('SELECT * FROM genres WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      res.status(404).render('404', { title: 'Genre Not Found' });
      return;
    }
    res.render('genres/edit', {
      title: `Edit ${result.rows[0].name}`,
      activeNav: 'genres',
      genre: result.rows[0],
      error: null
    });
  } catch (err) {
    next(err);
  }
};

export const updateGenre = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;
  const { name, description } = req.body;

  if (!name || !name.trim()) {
    res.render('genres/edit', {
      title: 'Edit Genre',
      activeNav: 'genres',
      genre: { id, name, description },
      error: 'Genre name is required.'
    });
    return;
  }

  try {
    await pool.query(
      'UPDATE genres SET name = $1, description = $2 WHERE id = $3',
      [name.trim(), description ? description.trim() : null, id]
    );
    res.redirect(`/genres/${id}`);
  } catch (err: any) {
    if (err.code === '23505') {
      res.render('genres/edit', {
        title: 'Edit Genre',
        activeNav: 'genres',
        genre: { id, name, description },
        error: 'A genre with that name already exists.'
      });
      return;
    }
    next(err);
  }
};

export const deleteGenre = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM genres WHERE id = $1', [id]);
    res.redirect('/genres');
  } catch (err) {
    next(err);
  }
};
