import { Request, Response, NextFunction } from 'express';
import pool from '../db/pool';
import { Game, Genre, Developer, Platform, UserGame } from '../types';

function toArray(val: any): number[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map((x) => parseInt(x, 10)).filter((n) => !isNaN(n));
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? [] : [parsed];
}

export const listGames = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const userId = req.currentUser ? req.currentUser.id : 1;
  try {
    const query = `
      SELECT 
        g.id, 
        g.title, 
        g.release_year,
        COALESCE(string_agg(DISTINCT gen.name, ', '), '') AS genres_list,
        COALESCE(string_agg(DISTINCT dev.name, ', '), '') AS developers_list,
        ug.status AS user_status,
        ug.id AS user_game_id
      FROM games g
      LEFT JOIN game_genres gg ON g.id = gg.game_id
      LEFT JOIN genres gen ON gg.genre_id = gen.id
      LEFT JOIN game_developers gd ON g.id = gd.game_id
      LEFT JOIN developers dev ON gd.developer_id = dev.id
      LEFT JOIN user_games ug ON g.id = ug.game_id AND ug.user_id = $1
      GROUP BY g.id, ug.status, ug.id
      ORDER BY g.title ASC;
    `;
    const { rows: games } = await pool.query<Game>(query, [userId]);
    res.render('games/index', {
      title: 'Game Catalog',
      activeNav: 'games',
      games
    });
  } catch (err) {
    next(err);
  }
};

export const showGame = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;
  const userId = req.currentUser ? req.currentUser.id : 1;

  try {
    const gameResult = await pool.query<Game>('SELECT * FROM games WHERE id = $1', [id]);
    if (gameResult.rows.length === 0) {
      res.status(404).render('404', { title: 'Game Not Found' });
      return;
    }
    const game = gameResult.rows[0];

    const [genresResult, devResult, platformResult, trackingResult] = await Promise.all([
      pool.query<Genre>(
        `SELECT g.id, g.name FROM genres g
         JOIN game_genres gg ON g.id = gg.genre_id
         WHERE gg.game_id = $1 ORDER BY g.name ASC`,
        [id]
      ),
      pool.query<Developer>(
        `SELECT d.id, d.name FROM developers d
         JOIN game_developers gd ON d.id = gd.developer_id
         WHERE gd.game_id = $1 ORDER BY d.name ASC`,
        [id]
      ),
      pool.query<Platform>(
        `SELECT p.id, p.name FROM platforms p
         JOIN game_platforms gp ON p.id = gp.platform_id
         WHERE gp.game_id = $1 ORDER BY p.name ASC`,
        [id]
      ),
      pool.query<UserGame>(
        `SELECT * FROM user_games WHERE user_id = $1 AND game_id = $2`,
        [userId, id]
      )
    ]);

    const tracking = trackingResult.rows.length > 0 ? trackingResult.rows[0] : null;

    res.render('games/show', {
      title: game.title,
      activeNav: 'games',
      game,
      genres: genresResult.rows,
      developers: devResult.rows,
      platforms: platformResult.rows,
      tracking
    });
  } catch (err) {
    next(err);
  }
};

export const newGameForm = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [genresRes, devsRes, platformsRes] = await Promise.all([
      pool.query<Genre>('SELECT id, name FROM genres ORDER BY name ASC'),
      pool.query<Developer>('SELECT id, name FROM developers ORDER BY name ASC'),
      pool.query<Platform>('SELECT id, name FROM platforms ORDER BY name ASC')
    ]);

    res.render('games/new', {
      title: 'Add Game to Catalog',
      activeNav: 'games',
      game: {},
      selectedGenres: [],
      selectedDevelopers: [],
      selectedPlatforms: [],
      allGenres: genresRes.rows,
      allDevelopers: devsRes.rows,
      allPlatforms: platformsRes.rows,
      error: null
    });
  } catch (err) {
    next(err);
  }
};

export const createGame = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { title, description, release_year, genres, developers, platforms, add_to_library, library_status } = req.body;
  const genreIds = toArray(genres);
  const developerIds = toArray(developers);
  const platformIds = toArray(platforms);
  const userId = req.currentUser ? req.currentUser.id : 1;

  if (!title || !title.trim()) {
    try {
      const [genresRes, devsRes, platformsRes] = await Promise.all([
        pool.query<Genre>('SELECT id, name FROM genres ORDER BY name ASC'),
        pool.query<Developer>('SELECT id, name FROM developers ORDER BY name ASC'),
        pool.query<Platform>('SELECT id, name FROM platforms ORDER BY name ASC')
      ]);
      res.render('games/new', {
        title: 'Add Game to Catalog',
        activeNav: 'games',
        game: { title, description, release_year },
        selectedGenres: genreIds,
        selectedDevelopers: developerIds,
        selectedPlatforms: platformIds,
        allGenres: genresRes.rows,
        allDevelopers: devsRes.rows,
        allPlatforms: platformsRes.rows,
        error: 'Game title is required.'
      });
      return;
    } catch (err) {
      next(err);
      return;
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const yearVal = release_year && !isNaN(parseInt(release_year, 10)) ? parseInt(release_year, 10) : null;
    const insertGameQuery = `
      INSERT INTO games (title, description, release_year)
      VALUES ($1, $2, $3)
      RETURNING id;
    `;
    const gameResult = await client.query<{ id: number }>(insertGameQuery, [
      title.trim(),
      description ? description.trim() : null,
      yearVal
    ]);
    const gameId = gameResult.rows[0].id;

    for (const gId of genreIds) {
      await client.query('INSERT INTO game_genres (game_id, genre_id) VALUES ($1, $2)', [gameId, gId]);
    }
    for (const dId of developerIds) {
      await client.query('INSERT INTO game_developers (game_id, developer_id) VALUES ($1, $2)', [gameId, dId]);
    }
    for (const pId of platformIds) {
      await client.query('INSERT INTO game_platforms (game_id, platform_id) VALUES ($1, $2)', [gameId, pId]);
    }

    if (add_to_library && library_status) {
      await client.query(
        `INSERT INTO user_games (user_id, game_id, status) VALUES ($1, $2, $3)
         ON CONFLICT (user_id, game_id) DO NOTHING`,
        [userId, gameId, library_status]
      );
    }

    await client.query('COMMIT');
    res.redirect(`/games/${gameId}`);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

export const editGameForm = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;
  try {
    const [gameRes, genresRes, devsRes, platformsRes, curGenres, curDevs, curPlatforms] = await Promise.all([
      pool.query<Game>('SELECT * FROM games WHERE id = $1', [id]),
      pool.query<Genre>('SELECT id, name FROM genres ORDER BY name ASC'),
      pool.query<Developer>('SELECT id, name FROM developers ORDER BY name ASC'),
      pool.query<Platform>('SELECT id, name FROM platforms ORDER BY name ASC'),
      pool.query<{ genre_id: number }>('SELECT genre_id FROM game_genres WHERE game_id = $1', [id]),
      pool.query<{ developer_id: number }>('SELECT developer_id FROM game_developers WHERE game_id = $1', [id]),
      pool.query<{ platform_id: number }>('SELECT platform_id FROM game_platforms WHERE game_id = $1', [id])
    ]);

    if (gameRes.rows.length === 0) {
      res.status(404).render('404', { title: 'Game Not Found' });
      return;
    }

    res.render('games/edit', {
      title: `Edit ${gameRes.rows[0].title}`,
      activeNav: 'games',
      game: gameRes.rows[0],
      selectedGenres: curGenres.rows.map((r) => r.genre_id),
      selectedDevelopers: curDevs.rows.map((r) => r.developer_id),
      selectedPlatforms: curPlatforms.rows.map((r) => r.platform_id),
      allGenres: genresRes.rows,
      allDevelopers: devsRes.rows,
      allPlatforms: platformsRes.rows,
      error: null
    });
  } catch (err) {
    next(err);
  }
};

export const updateGame = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;
  const { title, description, release_year, genres, developers, platforms } = req.body;
  const genreIds = toArray(genres);
  const developerIds = toArray(developers);
  const platformIds = toArray(platforms);

  if (!title || !title.trim()) {
    try {
      const [genresRes, devsRes, platformsRes] = await Promise.all([
        pool.query<Genre>('SELECT id, name FROM genres ORDER BY name ASC'),
        pool.query<Developer>('SELECT id, name FROM developers ORDER BY name ASC'),
        pool.query<Platform>('SELECT id, name FROM platforms ORDER BY name ASC')
      ]);
      res.render('games/edit', {
        title: 'Edit Game',
        activeNav: 'games',
        game: { id: parseInt(id as string, 10), title, description, release_year },
        selectedGenres: genreIds,
        selectedDevelopers: developerIds,
        selectedPlatforms: platformIds,
        allGenres: genresRes.rows,
        allDevelopers: devsRes.rows,
        allPlatforms: platformsRes.rows,
        error: 'Game title is required.'
      });
      return;
    } catch (err) {
      next(err);
      return;
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const yearVal = release_year && !isNaN(parseInt(release_year, 10)) ? parseInt(release_year, 10) : null;
    await client.query(
      `UPDATE games 
       SET title = $1, description = $2, release_year = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [title.trim(), description ? description.trim() : null, yearVal, id]
    );

    await client.query('DELETE FROM game_genres WHERE game_id = $1', [id]);
    for (const gId of genreIds) {
      await client.query('INSERT INTO game_genres (game_id, genre_id) VALUES ($1, $2)', [id, gId]);
    }

    await client.query('DELETE FROM game_developers WHERE game_id = $1', [id]);
    for (const dId of developerIds) {
      await client.query('INSERT INTO game_developers (game_id, developer_id) VALUES ($1, $2)', [id, dId]);
    }

    await client.query('DELETE FROM game_platforms WHERE game_id = $1', [id]);
    for (const pId of platformIds) {
      await client.query('INSERT INTO game_platforms (game_id, platform_id) VALUES ($1, $2)', [id, pId]);
    }

    await client.query('COMMIT');
    res.redirect(`/games/${id}`);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

export const deleteGame = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM games WHERE id = $1', [id]);
    res.redirect('/games');
  } catch (err) {
    next(err);
  }
};
