import { Request, Response, NextFunction } from 'express';
import pool from '../db/pool';
import { UserGame, LibraryCounts } from '../types';

export const listLibrary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const userId = req.currentUser ? req.currentUser.id : 1;
  const currentStatus = (req.query.status as string) || 'all';

  try {
    const countsQuery = `
      SELECT 
        COUNT(*)::int AS total_count,
        COUNT(*) FILTER (WHERE status = 'Want to Play')::int AS want_count,
        COUNT(*) FILTER (WHERE status = 'Currently Playing')::int AS playing_count,
        COUNT(*) FILTER (WHERE status = 'Completed')::int AS completed_count,
        COUNT(*) FILTER (WHERE status = 'On Hold')::int AS hold_count,
        COUNT(*) FILTER (WHERE status = 'Dropped')::int AS dropped_count
      FROM user_games
      WHERE user_id = $1;
    `;
    const { rows: countsRows } = await pool.query<LibraryCounts>(countsQuery, [userId]);
    const counts = countsRows[0] || {
      total_count: 0,
      want_count: 0,
      playing_count: 0,
      completed_count: 0,
      hold_count: 0,
      dropped_count: 0
    };

    let filterCondition = '';
    const queryParams: any[] = [userId];

    if (currentStatus !== 'all') {
      queryParams.push(currentStatus);
      filterCondition = 'AND ug.status = $2';
    }

    const gamesQuery = `
      SELECT 
        ug.id AS user_game_id,
        ug.status,
        ug.rating,
        ug.hours_played,
        ug.review_notes,
        ug.updated_at,
        g.id AS game_id,
        g.title,
        g.release_year,
        COALESCE(string_agg(DISTINCT gen.name, ', '), '') AS genres_list,
        COALESCE(string_agg(DISTINCT dev.name, ', '), '') AS developers_list
      FROM user_games ug
      JOIN games g ON ug.game_id = g.id
      LEFT JOIN game_genres gg ON g.id = gg.game_id
      LEFT JOIN genres gen ON gg.genre_id = gen.id
      LEFT JOIN game_developers gd ON g.id = gd.game_id
      LEFT JOIN developers dev ON gd.developer_id = dev.id
      WHERE ug.user_id = $1 ${filterCondition}
      GROUP BY ug.id, g.id
      ORDER BY ug.updated_at DESC;
    `;
    const { rows: trackedGames } = await pool.query<UserGame>(gamesQuery, queryParams);

    res.render('library/index', {
      title: 'My Library',
      activeNav: 'library',
      trackedGames,
      currentStatus,
      counts
    });
  } catch (err) {
    next(err);
  }
};

export const addToLibrary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const userId = req.currentUser ? req.currentUser.id : 1;
  const { game_id, status, rating, hours_played, review_notes } = req.body;

  if (!game_id) {
    res.redirect('/games');
    return;
  }

  const ratingVal = rating && !isNaN(parseInt(rating, 10)) ? parseInt(rating, 10) : null;
  const hoursVal = hours_played && !isNaN(parseFloat(hours_played)) ? parseFloat(hours_played) : 0;
  const statusVal = status || 'Want to Play';

  try {
    await pool.query(
      `INSERT INTO user_games (user_id, game_id, status, rating, hours_played, review_notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, game_id) 
       DO UPDATE SET status = EXCLUDED.status,
                     rating = EXCLUDED.rating,
                     hours_played = EXCLUDED.hours_played,
                     review_notes = EXCLUDED.review_notes,
                     updated_at = CURRENT_TIMESTAMP`,
      [userId, game_id, statusVal, ratingVal, hoursVal, review_notes ? review_notes.trim() : null]
    );

    res.redirect(`/games/${game_id}`);
  } catch (err) {
    next(err);
  }
};

export const editLibraryEntryForm = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;
  const userId = req.currentUser ? req.currentUser.id : 1;

  try {
    const query = `
      SELECT ug.*, g.title, g.release_year
      FROM user_games ug
      JOIN games g ON ug.game_id = g.id
      WHERE ug.id = $1 AND ug.user_id = $2;
    `;
    const { rows } = await pool.query<UserGame>(query, [id, userId]);

    if (rows.length === 0) {
      res.status(404).render('404', { title: 'Entry Not Found' });
      return;
    }

    res.render('library/edit', {
      title: `Update ${rows[0].title} in Library`,
      activeNav: 'library',
      entry: rows[0],
      error: null
    });
  } catch (err) {
    next(err);
  }
};

export const updateLibraryEntry = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;
  const userId = req.currentUser ? req.currentUser.id : 1;
  const { status, rating, hours_played, review_notes } = req.body;

  const ratingVal = rating && !isNaN(parseInt(rating, 10)) ? parseInt(rating, 10) : null;
  const hoursVal = hours_played && !isNaN(parseFloat(hours_played)) ? parseFloat(hours_played) : 0;
  const statusVal = status || 'Want to Play';

  try {
    await pool.query(
      `UPDATE user_games
       SET status = $1, rating = $2, hours_played = $3, review_notes = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND user_id = $6`,
      [statusVal, ratingVal, hoursVal, review_notes ? review_notes.trim() : null, id, userId]
    );

    res.redirect('/library');
  } catch (err) {
    next(err);
  }
};

export const deleteLibraryEntry = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;
  const userId = req.currentUser ? req.currentUser.id : 1;

  try {
    await pool.query('DELETE FROM user_games WHERE id = $1 AND user_id = $2', [id, userId]);
    res.redirect('/library');
  } catch (err) {
    next(err);
  }
};
