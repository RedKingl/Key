require('dotenv').config();
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const faunadb = require('faunadb');
const client = new faunadb.Client({
    secret: process.env.FAUNADB_SECRET,
});
const q = faunadb.query;

async function updateusernameapi(req, res) {
    const {
        password,
        newUsername
    } = req.body;

    // Check for empty fields
    const requiredFields = ['password', 'newUsername'];
    const missingFields = requiredFields.filter((field) => !req.body[field]);

    if (missingFields.length > 0) {
        return res.status(400).json({
            message: `Missing required fields: ${missingFields.join(', ')}`
        });
    }

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

        // Find the user associated with the refId
        const user = await client.query(q.Get(q.Ref(q.Collection('users'), user_id)));

        // Check if the old password matches
        const isPasswordValid = await bcrypt.compare(password, user.data.password);
        if (!isPasswordValid) {
            res.status(401).json({
                message: 'Invalid password'
            });
            return;
        }

        const usernameTaken = await client.query(q.Exists(q.Match(q.Index('users_by_username'), q.Casefold(newUsername))));

        if (usernameTaken) {
            return res.status(409).json({
                message: 'Username already taken'
            });
        }

        await client.query(q.Update(user.ref, {
            data: {
                username: newUsername
            }
        }));

        res.status(200).json({
            message: 'Username successfully'
        });
    } catch (error) {
        console.log(error);
        if (error.message === 'instance not found') {
            res.status(404).json({
                message: 'Invalid refId'
            });
        } else {
            res.status(500).json({
                message: 'An error occurred'
            });
        }
    }
}

module.exports = updateusernameapi;