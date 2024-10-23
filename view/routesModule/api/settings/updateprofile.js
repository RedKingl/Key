require('dotenv').config();
const axios = require('axios');
const faunadb = require('faunadb');
const path = require('path');
const fs = require('fs');
const qs = require('qs');
const client = new faunadb.Client({
    secret: process.env.FAUNADB_SECRET,
});
const q = faunadb.query;

async function updateprofileapi(req, res) {
    const file = req.file;


    if (!file) {
        return res.status(400).json({
            error: 'No file uploaded.'
        });
    }

    if (!isImageFile(file)) {
        deleteFile(file.path);
        return res.status(400).json({
            error: 'Invalid file format. Only image files are allowed.'
        });
    }


    fs.readFile(file.path, async (err, data) => {
        if (err) {
            deleteFile(file.path);
            return res.status(500).json({
                error: 'Failed to read the file.'
            });
        }

        const base64Image = data.toString('base64');

        const apiUrl = 'https://api.imgbb.com/1/upload';
        const clientApiKey = '1b6d2c43948eb58077750698e3d234d7';

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

            const formData = qs.stringify({
                key: clientApiKey,
                image: base64Image
            });

            const response = await axios.post(apiUrl, formData, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            const imageUrl = response.data.data.url;
            // Find the user associated with the refId
            const user = await client.query(q.Get(q.Ref(q.Collection('users'), user_id)));

            await client.query(q.Update(user.ref, {
                data: {
                    profile_pic: imageUrl
                }
            }));

            res.json({
                imageUrl
            });

            // Delete the uploaded file after processing
            deleteFile(file.path);
        } catch (error) {
            if (error.message === 'instance not found') {
                res.status(404).json({
                    message: 'Invalid refId'
                });
            } else {
                res.status(500).json({
                    error: 'Failed to upload the image.'
                });
            }

            deleteFile(file.path);
        }

    });
}

// Check if the file is an image based on the file extension
function isImageFile(file) {
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    return allowedExtensions.includes(fileExtension);
}

// Delete a file from the server
function deleteFile(filePath) {
    fs.unlink(filePath, (err) => {
        if (err) {
            console.error(`Failed to delete file: ${filePath}`);
        }
    });
}

module.exports = updateprofileapi;