const pool = require('../db/pool');

// Helper to normalize multi-select or checkbox values into an array of IDs
function toArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val.map((x) => parseInt(x, 10)).filter(Boolean);
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? [] : [parsed];
}

exports.listGames = async (req, res, next) => {
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
    const { rows: games } = await pool.query(query, [userId]);
    res.render('games/index', {
      title: 'Game Catalog',
      activeNav: 'games',
      games
    });
  } catch (err) {
    next(err);
  }
};

exports.showGame = async (req, res, next) => {
  const { id } = req.params;
  const userId = req.currentUser ? req.currentUser.id : 1;

  try {
    const gameResult = await pool.query('SELECT * FROM games WHERE id = $1', [id]);
    if (gameResult.rows.length === 0) {
      return res.status(404).render('404', { title: 'Game Not Found' });
    }
    const game = gameResult.rows[0];

    // Associated genres
    const genresResult = await pool.query(
      `SELECT g.id, g.name FROM genres g
       JOIN game_genres gg ON g.id = gg.genre_id
       WHERE gg.game_id = $1 ORDER BY g.name ASC`,
      [id]
    );

    // Associated developers
    const devResult = await pool.query(
      `SELECT d.id, d.name FROM developers d
       JOIN game_developers gd ON d.id = gd.developer_id
       WHERE gd.game_id = $1 ORDER BY d.name ASC`,
      [id]
    );

    // Associated platforms
    const platformResult = await pool.query(
      `SELECT p.id, p.name FROM platforms p
       JOIN game_platforms gp ON p.id = gp.platform_id
       WHERE gp.game_id = $1 ORDER BY p.name ASC`,
      [id]
    );

    // Check user's tracking entry for this game
    const trackingResult = await pool.query(
      `SELECT * FROM user_games WHERE user_id = $1 AND game_id = $2`,
      [userId, id]
    );
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

exports.newGameForm = async (req, res, next) => {
  try {
    const [genresRes, devsRes, platformsRes] = await Promise.all([
      pool.query('SELECT id, name FROM genres ORDER BY name ASC'),
      pool.query('SELECT id, name FROM developers ORDER BY name ASC'),
      pool.query('SELECT id, name FROM platforms ORDER BY name ASC')
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

exports.createGame = async (req, res, next) => {
  const { title, description, release_year, genres, developers, platforms, add_to_library, library_status } = req.body;
  const genreIds = toArray(genres);
  const developerIds = toArray(developers);
  const platformIds = toArray(platforms);
  const userId = req.currentUser ? req.currentUser.id : 1;

  if (!title || !title.trim()) {
    try {
      const [genresRes, devsRes, platformsRes] = await Promise.all([
        pool.query('SELECT id, name FROM genres ORDER BY name ASC'),
        pool.query('SELECT id, name FROM developers ORDER BY name ASC'),
        pool.query('SELECT id, name FROM platforms ORDER BY name ASC')
      ]);
      return res.render('games/new', {
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
    } catch (err) {
      return next(err);
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
    const gameResult = await client.query(insertGameQuery, [
      title.trim(),
      description ? description.trim() : null,
      yearVal
    ]);
    const gameId = gameResult.rows[0].id;

    // Insert genres
    for (const gId of genreIds) {
      await client.query('INSERT INTO game_genres (game_id, genre_id) VALUES ($1, $2)', [gameId, gId]);
    }

    // Insert developers
    for (const dId of developerIds) {
      await client.query('INSERT INTO game_developers (game_id, developer_id) VALUES ($1, $2)', [gameId, dId]);
    }

    // Insert platforms
    for (const pId of platformIds) {
      await client.query('INSERT INTO game_platforms (game_id, platform_id) VALUES ($1, $2)', [gameId, pId]);
    }

    // Optionally add directly to user library
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

exports.editGameForm = async (req, res, next) => {
  const { id } = req.params;
  try {
    const [gameRes, genresRes, devsRes, platformsRes, curGenres, curDevs, curPlatforms] = await Promise.all([
      pool.query('SELECT * FROM games WHERE id = $1', [id]),
      pool.query('SELECT id, name FROM genres ORDER BY name ASC'),
      pool.query('SELECT id, name FROM developers ORDER BY name ASC'),
      pool.query('SELECT id, name FROM platforms ORDER BY name ASC'),
      pool.query('SELECT genre_id FROM game_genres WHERE game_id = $1', [id]),
      pool.query('SELECT developer_id FROM game_developers WHERE game_id = $1', [id]),
      pool.query('SELECT platform_id FROM game_platforms WHERE game_id = $1', [id])
    ]);

    if (gameRes.rows.length === 0) {
      return res.status(404).render('404', { title: 'Game Not Found' });
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

exports.updateGame = async (req, res, next) => {
  const { id } = req.params;
  const { title, description, release_year, genres, developers, platforms } = req.body;
  const genreIds = toArray(genres);
  const developerIds = toArray(developers);
  const platformIds = toArray(platforms);

  if (!title || !title.trim()) {
    try {
      const [genresRes, devsRes, platformsRes] = await Promise.all([
        pool.query('SELECT id, name FROM genres ORDER BY name ASC'),
        pool.query('SELECT id, name FROM developers ORDER BY name ASC'),
        pool.query('SELECT id, name FROM platforms ORDER BY name ASC')
      ]);
      return res.render('games/edit', {
        title: 'Edit Game',
        activeNav: 'games',
        game: { id, title, description, release_year },
        selectedGenres: genreIds,
        selectedDevelopers: developerIds,
        selectedPlatforms: platformIds,
        allGenres: genresRes.rows,
        allDevelopers: devsRes.rows,
        allPlatforms: platformsRes.rows,
        error: 'Game title is required.'
      });
    } catch (err) {
      return next(err);
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

    // Refresh junctions
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

exports.deleteGame = async (req, res, next) => {
  const { id } = req.params;
  try {
    // ON DELETE CASCADE automatically removes user_games, game_genres, game_developers, game_platforms
    await pool.query('DELETE FROM games WHERE id = $1', [id]);
    res.redirect('/games');
  } catch (err) {
    next(err);
  }
};
