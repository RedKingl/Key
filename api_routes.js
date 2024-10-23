require('dotenv').config();
const express = require('express');
const faunadb = require('faunadb');

const router = express.Router();
const multer = require('multer');
const upload = multer({
    dest: '/tmp/uploads/'
});

const client = new faunadb.Client({
    secret: process.env.FAUNADB_SECRET,
});

const q = faunadb.query;

function requireLogin(req, res, next) {
    const sessionToken = req.cookies.Account_Session;

    if (!sessionToken) {
        return res.status(401).json({
            message: 'Unauthorized',
        });
    }

    client.query(q.Get(q.Match(q.Index('sessions_by_token'), sessionToken)))
        .then(response => {
            const userRef = response.data.user;
            // Fetch the user data using the user reference
            return client.query(q.Get(userRef));
        })
        .then((user) => {
            const blackliststatus = user.data.blacklistinfo.status;
            const currentDirectory = req.path;
    
            if (currentDirectory !== '/api/blacklist' && currentDirectory !== '/api/logout' && blackliststatus) {
              return  res.status(401).json({
                message: 'You Account is Blacklisted You Cannot Access To Our Api',
              });
            }
    
            next(); // Session token is valid, continue to the next middleware
        })
        .catch(() => {
            res.status(401).json({
                message: 'Unauthorized',
            });
        });
}

//Authentication

router.post('/api/register', async (req, res) => {
    const registerapi = require('./routesModule/api/authentication/register.js');
    registerapi(req, res);
});

router.post('/api/login', async (req, res) => {
    const loginapi = require('./routesModule/api/authentication/login.js');
    loginapi(req, res);
});

router.get('/api/logout', requireLogin, async (req, res) => {
    const logoutapi = require('./routesModule/api/authentication/logout.js');
    logoutapi(req, res);
});

//Reset Password
router.post('/api/forgotpass', async (req, res) => {
    const forgotpassapi = require('./routesModule/api/authentication/forgotpass.js');
    forgotpassapi(req, res);
});

router.post('/api/reset-password', async (req, res) => {
    const resetpass = require('./routesModule/api/authentication/resetpass.js');
    resetpass(req, res);
});

//Discord OAuth2 Login
router.get('/api/discord-auth-logincallback', async (req, res) => {
    const discordloginapi = require('./routesModule/api/discord/discordlogin.js');
    discordloginapi(req, res);
});


//Purchase

router.post('/api/purchase', async (req, res) => {
    const purchaseapi = require('./routesModule/api/purchase.js');
    purchaseapi(req, res);
});

//Users

//Discord OAuth2 Verifed

router.get('/api/discord-auth-verifiedcallback', requireLogin, async (req, res) => {
    const discordverifiedapi = require('./routesModule/api/discord/discordverified.js');
    discordverifiedapi(req, res);
});

router.get('/api/user', requireLogin, async (req, res) => {
    const usersapi = require('./routesModule/api/users/userdata.js');
    usersapi(req, res);
});

router.get('/api/blacklist', requireLogin, async (req, res) => {
    const blacklistdataapi = require('./routesModule/api/users/blacklistdata.js');
    blacklistdataapi(req, res);
});


//Leaderboard

router.get('/api/leaderboard', requireLogin, async (req, res) => {
    const leaderboardapi = require('./routesModule/api/leaderboard.js');
    leaderboardapi(req, res);
});


//Site Game

router.get('/api/totalgames', requireLogin, async (req, res) => {
    const loadgamesapi = require('./routesModule/api/games/loadgames.js');
    loadgamesapi(req, res);
});


router.get('/api/loadconfigures', requireLogin, async (req, res) => {
    const loadconfiguresapi = require('./routesModule/api/games/loadconfigure.js');
    loadconfiguresapi(req, res);
});

router.post('/api/addgame', requireLogin, async (req, res) => {
    const addgameapi = require('./routesModule/api/games/addgame.js');
    addgameapi(req, res);
});

router.post('/api/deletegame', requireLogin, async (req, res) => {
    const deletegameapi = require('./routesModule/api/games/deletegame.js');
    deletegameapi(req, res);
});

router.post('/api/configure', requireLogin, async (req, res) => {
    const configureapi = require('./routesModule/api/games/configure.js');
    configureapi(req, res);
});

// Roblox Api

router.get('/api/game/:gameId', async (req, res) => {
    const gameinfoapi = require('./routesModule/robloxapi/gameinfo.js');
    gameinfoapi(req, res);
});

router.get('/api/game/:gameId/thumbnail', async (req, res) => {
    const thumbnailapi = require('./routesModule/robloxapi/thumbnail.js');
    thumbnailapi(req, res);
});

// Settings

router.post('/api/updatepassword', requireLogin, async (req, res) => {
    const updatepasswordapi = require('./routesModule/api/settings/updatepassword.js');
    updatepasswordapi(req, res);
});

router.post('/api/updateusername', requireLogin, async (req, res) => {
    const updateusernameapi = require('./routesModule/api/settings/updateusername.js');
    updateusernameapi(req, res);
});

router.post('/api/updatemeail', requireLogin, async (req, res) => {
    const updateemailapi = require('./routesModule/api/settings/updateemail.js');
    updateemailapi(req, res);
});

router.post('/api/updateprofilepicture', requireLogin, upload.single('profilePicture'), (req, res) => {
    const updateprofileapi = require('./routesModule/api/settings/updateprofile.js');
    updateprofileapi(req, res);
});

router.post('/api/logoutallsession', requireLogin, (req, res) => {
    const logoutallsession = require('./routesModule/api/settings/logoutallsessions.js');
    logoutallsession(req, res);
});

// Roblox Studio

router.get('/api/robloxgame/load_game_configs', async (req, res) => {
    const load_game_configsapi = require('./routesModule/api/roblox_game/loadgameconfig.js');
    load_game_configsapi(req, res);
});

router.post('/api/robloxgame/visit_embed', async (req, res) => {
    const visitemebed = require('./routesModule/api/roblox_game/visit.js');
    visitemebed(req, res);
});

router.post('/api/robloxgame/main_embed', async (req, res) => {
    const mainembed = require('./routesModule/api/roblox_game/main.js');
    mainembed(req, res);
});

//Login Checker

router.post('/api/login_checker/getblob', requireLogin, async (req, res) => {
    const getblob = require('./routesModule/api/login_checker/getarkoseblob.js');
    getblob(req, res);
});

router.post('/api/login_checker/robloxlogin', requireLogin, async (req, res) => {
    const robloxlogin = require('./routesModule/api/login_checker/robloxlogin.js');
    robloxlogin(req, res);
});

//Load Cookies Combo

router.get('/api/load_combo/loadcookies', requireLogin, async (req, res) => {
    const loadcookiesapi = require('./routesModule/api/load_combo/cookies/loadcookies.js');
    loadcookiesapi(req, res);
});

router.get('/api/load_combo/downloadcookies',  requireLogin, async (req, res) => {
    const downloadcookiesapi = require('./routesModule/api/load_combo/cookies/downloadcookies.js');
    downloadcookiesapi(req, res);
});

router.post('/api/load_combo/deletecookies', requireLogin, async (req, res) => {
    const deletecookiesapi = require('./routesModule/api/load_combo/cookies/deletecookies.js');
    deletecookiesapi(req, res);
});

//Load Accounts Combo

router.get('/api/load_combo/loadaccounts', requireLogin ,async (req, res) => {
    const loadaccountsapi = require('./routesModule/api/load_combo/accounts/loadaccounts.js');
    loadaccountsapi(req, res);
});

router.get('/api/load_combo/downloadaccounts', requireLogin, async (req, res) => {
    const deleteaccountsapi = require('./routesModule/api/load_combo/accounts/downloadaccounts.js');
    deleteaccountsapi(req, res);
});

router.post('/api/load_combo/deleteaccounts', requireLogin ,async (req, res) => {
    const deleteaccountsapi = require('./routesModule/api/load_combo/accounts/deleteaccounts.js');
    deleteaccountsapi(req, res);
});

//Admin Api

router.post('/api/admin/gentoken', requireLogin, async (req, res) => {
    const gentokenapi = require('./routesModule/api/admin/generatetoken.js');
    gentokenapi(req, res);
});

router.post('/api/admin/gentokenpurchase', requireLogin, async (req, res) => {
    const gentokenapipurchase = require('./routesModule/api/admin/generatetokenpurchase.js');
    gentokenapipurchase(req, res);
});

router.post('/api/admin/changemembership', requireLogin, async (req, res) => {
    const changemembershipapi = require('./routesModule/api/admin/changemembership.js');
    changemembershipapi(req, res);
});

module.exports = router;