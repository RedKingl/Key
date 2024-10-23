require('dotenv').config();
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const faunadb = require('faunadb');
const client = new faunadb.Client({
  secret: process.env.FAUNADB_SECRET,
});
const q = faunadb.query;

function generateToken(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    token += characters.charAt(randomIndex);
  }
  return token;
}

async function logoutallsessionapi(req, res) {
  try {
    const sessionToken = req.cookies.Account_Session;

    const userRefFromSession = await client.query(
      q.Map(
        q.Paginate(q.Match(q.Index('sessions_by_token'), sessionToken)),
        q.Lambda(x => ({
          ref: q.Select(['data', 'user'], q.Get(x)),
        }))
      )
    );

    const refId = userRefFromSession.data[0].ref.value.id;

    const userData = await client.query(
      q.Map(
        q.Paginate(q.Ref(q.Collection('users'), refId)),
        q.Lambda(x => ({
          user_id: q.Select(['ref', 'id'], q.Get(x)),
        }))
      )
    );

    const user_id = userData.data[0].user_id;

    // Find the user associated with the user_id
    const user = await client.query(q.Get(q.Ref(q.Collection('users'), user_id)));

    // Delete the old session associated with the user
    const oldSession = await client.query(q.Get(q.Match(q.Index('sessions_by_user'), user.ref)));
    await client.query(q.Delete(oldSession.ref));

    // Create a new session
    const newSessionToken = generateToken(50);
    const newSession = await client.query(
      q.Create(q.Collection('sessions'), {
        data: {
          user: user.ref,
          session_token: newSessionToken,
        },
      })
    );

    const options = {
      secure: true, // Cookie will only be sent over HTTPS
      maxAge: 30 * 24 * 60 * 60 * 1000, // Cookie will expire after 30 days (in milliseconds)
    };
    res.cookie('Account_Session', newSessionToken, options);

    res.status(200).json({ message: 'Logout successfully' });
  } catch (error) {
    console.log(error);
    if (error.message === 'instance not found') {
      res.status(404).json({ message: 'Invalid refId' });
    } else {
      res.status(500).json({ message: 'An error occurred' });
    }
  }
}

module.exports = logoutallsessionapi;
