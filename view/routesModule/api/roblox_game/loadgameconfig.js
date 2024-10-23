require('dotenv').config();
const faunadb = require('faunadb');
const client = new faunadb.Client({
  secret: process.env.FAUNADB_SECRET,
});
const q = faunadb.query;

async function load_game_configsapi(req, res) {
  const requiredFields = ['gameId'];
  const missingFields = requiredFields.filter((field) => !req.query[field]);

  if (missingFields.length > 0) {
    return res.status(400).json({ message: `Missing required fields: ${missingFields.join(', ')}` });
  }

  try {
    // Retrieve the game configuration from the users_games collection
    const game_id = req.query.gameId;
    const gameConfig = await client.query(
      q.Get(q.Match(q.Index('users_games_by_game_id'), game_id))
    );

    const config_info = gameConfig.data.config_info.game_configs;

    res.status(200).json({
      message: 'Game Whitelisted',
      config_info,
    });
  } catch (error) {

    if (error.message === 'instance not found') {
      res.status(404).json({ message: 'Game not Whitelisted' });
    } else {
      res.status(500).json({ message: 'An error occurred' });
    }
  }
};

module.exports = load_game_configsapi;
