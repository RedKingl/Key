require('dotenv').config();
const faunadb = require('faunadb');
const client = new faunadb.Client({
  secret: process.env.FAUNADB_SECRET,
});
const q = faunadb.query;

async function blacklistdataapi(req, res) {

  try {
    // Retrieve all users
    const sessionToken = req.cookies.Account_Session;

    const user_ref_from_session = await client.query(
      q.Map(
        q.Paginate(q.Match(q.Index('sessions_by_token'), sessionToken)),
        q.Lambda(x => {
          return {
            ref: q.Select(['data', 'user'], q.Get(x)),
          };
        })
      )
    );

    const refid = user_ref_from_session.data[0].ref.value.id

    const userData = await client.query(
      q.Map(
          q.Paginate(q.Ref(q.Collection('users'), refid)),
          q.Lambda((x) => ({
            blacklistinfo: q.Select(['data', 'blacklistinfo'], q.Get(x)),
          }))
      )
    );

    const blacklistinfo = userData.data;

    res.status(200).json({
      message: 'Blacklist Data retrieved successfully',
      blacklistinfo,
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({
      message: 'Failed to retrieve Blacklist Data',
    });
  }
}

module.exports = blacklistdataapi;
