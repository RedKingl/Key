require('dotenv').config();
const faunadb = require('faunadb');

const client = new faunadb.Client({
  secret: process.env.FAUNADB_SECRET,
});
const q = faunadb.query;

async function leaderboardapi(req, res) {
  try {
    const leaderboard = await client.query(
      q.Map(
        q.Paginate(q.Documents(q.Collection('users'))),
        q.Lambda('user', {
          username: q.Select(['data', 'username'], q.Get(q.Var('user'))),
          robux: q.Select(['data', 'stats', 'robux'], q.Get(q.Var('user'))),
          points: q.Select(['data', 'stats', 'points'], q.Get(q.Var('user'))),
          revenue: q.Select(['data', 'stats', 'revenue'], q.Get(q.Var('user'))),
          profile_pic: q.Select(['data', 'profile_pic'], q.Get(q.Var('user'))),
        })
      )
    );

    const leaderboardData = leaderboard.data
      .map((entry, index) => ({
        rank: index + 1,
        username: entry.username,
        robux: entry.robux,
        points: entry.points,
        revenue: entry.revenue,
        profile_pic: entry.profile_pic,
      }))
      .sort((a, b) => b.robux - a.robux)
      .slice(0, 10); // Add this line to limit the entries to 10.

    res.json({ leaderboard: leaderboardData });
  } catch (error) {
    console.error('Error retrieving leaderboard:', error);
    res.status(500).json({ error: 'An error occurred while retrieving the leaderboard' });
  }
}

module.exports = leaderboardapi;