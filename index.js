const { Client, Util, MessageEmbed } = require("discord.js");
const YouTube = require("simple-youtube-api");
const ytdl = require("ytdl-core");
require("dotenv").config();
require("./server.js");

const bot = new Client({
    disableMentions: "all"
});

const PREFIX = process.env.PREFIX;
const youtube = new YouTube(process.env.YTAPI_KEY);
const queue = new Map();

bot.on("warn", console.warn);
bot.on("error", console.error);
bot.on("ready", () => console.log(`[READY] ${bot.user.tag} has been successfully booted up!`));
bot.on("shardDisconnect", (event, id) => console.log(`[SHARD] Shard ${id} disconnected (${event.code}) ${event}, trying to reconnect...`));
bot.on("shardReconnecting", (id) => console.log(`[SHARD] Shard ${id} reconnecting...`));

bot.on("message", async (message) => { // eslint-disable-line
    if (message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.split(" ");
    const searchString = args.slice(1).join(" ");
    const url = args[1] ? args[1].replace(/<(.+)>/g, "$1") : "";
    const serverQueue = queue.get(message.guild.id);

    let command = message.content.toLowerCase().split(" ")[0];
    command = command.slice(PREFIX.length);

    if (command === "help" || command === "cmd") {
        const helpembed = new MessageEmbed()
            .setColor("BLUE")
            .setAuthor(bot.user.tag, bot.user.displayAvatarURL())
            .setDescription(`
__**Daftar Command**__
> \`play\` > **\`play [title/url]\`**
> \`search\` > **\`search [title]\`**
> \`skip\`, \`stop\`,  \`pause\`, \`resume\`
> \`nowplaying\`, \`queue\`, \`volume\``)
            .setFooter("Developed by Yuzuru", "https://cdn.discordapp.com/avatars/728643540875477082/a_1c61134bcddce61b2294f123ae11b1f0.gif?size=4096");
        message.channel.send(helpembed);
    }
    if (command === "play" || command === "p") {
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) return message.channel.send({embed: {color: "RED", description: "Masuk voice channel dulu tod."}});
        const permissions = voiceChannel.permissionsFor(message.client.user);
        if (!permissions.has("CONNECT")) {
            return message.channel.send({embed: {color: "RED", description: "Gw butuh permission **`CONNECT`**"}});
        }
        if (!permissions.has("SPEAK")) {
            return message.channel.send({embed: {color: "RED", description: "Gw butuh permission **`SPEAK`**"}});
        }
        if (!url || !searchString) return message.channel.send({embed: {color: "RED", description: "Silahkan masukan judul / link"}});
        if (url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)) {
            const playlist = await youtube.getPlaylist(url);
            const videos = await playlist.getVideos();
            for (const video of Object.values(videos)) {
                const video2 = await youtube.getVideoByID(video.id); // eslint-disable-line no-await-in-loop
                await handleVideo(video2, message, voiceChannel, true); // eslint-disable-line no-await-in-loop
            }
            return message.channel.send({embed: {
                    color: "GREEN",
                    description: `✅  **|**  Playlist: **\`${playlist.title}\`** telah ditambahkan ke antrian`
            }});
        } else {
            try {
                var video = await youtube.getVideo(url);
            } catch (error) {
                try {
                    var videos = await youtube.searchVideos(searchString, 10);
                    var video = await youtube.getVideoByID(videos[0].id);
                    if (!video) return message.channel.send({embed: {color: "RED", description: "🆘  **|**  Ga ketemu"}});
                } catch (err) {
                    console.error(err);
                    return message.channel.send({embed: {color: "RED", description: "🆘  **|**  Ga ketemu"}});
                }
            }
            return handleVideo(video, message, voiceChannel);
        }
    }
    if (command === "search" || command === "sc") {
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) return message.channel.send({embed: {color: "RED", description: "Masuk voice channel dulu tod."}});
        const permissions = voiceChannel.permissionsFor(message.client.user);
        if (!permissions.has("CONNECT")) {
            return message.channel.send({embed: {color: "RED", description: "Gw butuh permission **`CONNECT`**"}});
        }
        if (!permissions.has("SPEAK")) {
            return message.channel.send({embed: {color: "RED", description: "Gw butuh permission **`SPEAK`**"}});
        }
        if (!url || !searchString) return message.channel.send({embed: {color: "RED", description: "Silahkan masukkan judul / link"}});
        if (url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)) {
            const playlist = await youtube.getPlaylist(url);
            const videos = await playlist.getVideos();
            for (const video of Object.values(videos)) {
                const video2 = await youtube.getVideoByID(video.id); // eslint-disable-line no-await-in-loop
                await handleVideo(video2, message, voiceChannel, true); // eslint-disable-line no-await-in-loop
            }
            return message.channel.send({embed: {
                color: "GREEN",
                description: `✅  **|**  Playlist: **\`${playlist.title}\`** telah ditambahkan ke antrian`
            }});
        } else {
            try {
                var video = await youtube.getVideo(url);
            } catch (error) {
                try {
                    var videos = await youtube.searchVideos(searchString, 10);
                    let index = 0;
                    let embedPlay = new MessageEmbed()
                        .setColor("BLUE")
                        .setAuthor("Search results", message.author.displayAvatarURL())
                        .setDescription(`${videos.map(video2 => `**\`${++index}\`  |**  ${video2.title}`).join("\n")}`)
                        .setFooter("Silahkan ketik angka 1 sampai 10. Pesam ini akan dihapus dalam 15 detik.");
                    // eslint-disable-next-line max-depth
                    message.channel.send(embedPlay).then(m => m.delete({
                        timeout: 15000
                    }))
                    try {
                        var response = await message.channel.awaitMessages(message2 => message2.content > 0 && message2.content < 11, {
                            max: 1,
                            time: 15000,
                            errors: ["time"]
                        });
                    } catch (err) {
                        console.error(err);
                        return message.channel.send({embed: {
                            color: "RED",
                            description: "Waktu habis, batal."
                        }});
                    }
                    const videoIndex = parseInt(response.first().content);
                    var video = await youtube.getVideoByID(videos[videoIndex - 1].id);
                } catch (err) {
                    console.error(err);
                    return message.channel.send({embed: {color: "RED", description: "🆘  **|**  Ga ketemu ajg"}});
                }
            }
            response.delete();
            return handleVideo(video, message, voiceChannel);
        }

    } else if (command === "skip") {
        if (!message.member.voice.channel) return message.channel.send({embed: {color: "RED", description: "Masuk voice channel dulu tod."}});
        if (!serverQueue) return message.channel.send({embed: {color: "RED", description: "Lu mau skip apa gblk"}});
        serverQueue.connection.dispatcher.end("[runCmd] Skip command has been used");
        return message.channel.send({embed: {color: "GREEN", description: "⏭️  **|**  gw skip"}});

    } else if (command === "stop") {
        if (!message.member.voice.channel) return message.channel.send({embed: {color: "RED", description: "Masuk voice channel dulu tod."}});
        if (!serverQueue) return message.channel.send({embed: {color: "RED", description: "Lu mau stop apa kntl"}});
        serverQueue.songs = [];
        serverQueue.connection.dispatcher.end("[runCmd] Stop command has been used");
        return message.channel.send({embed: {color: "GREEN", description: "⏹️  **|**  Menghapus antrian dan keluar dari voice channel..."}});

    } else if (command === "volume" || command === "vol") {
        if (!message.member.voice.channel) return message.channel.send({embed: {color: "RED", description: "Masuk voice channel dulu tod."}});
        if (!serverQueue) return message.channel.send({embed: {color: "RED", description: "Gada musik yang diputer"}});
        if (!args[1]) return message.channel.send({embed: {color: "BLUE", description: `Volume sekarang: **\`${serverQueue.volume}%\`**`}});
        if (isNaN(args[1]) || args[1] > 1000000) return message.channel.send({embed: {color: "RED", description: "Volume hanya bisa diset dari **\`1\`** - **\`100\`**"}});
        serverQueue.volume = args[1];
        serverQueue.connection.dispatcher.setVolume(args[1] / 100);
        return message.channel.send({embed: {color: "GREEN", description: `Gw set volume jadi: **\`${args[1]}%\`**`}});

    } else if (command === "nowplaying" || command === "np") {
        if (!serverQueue) return message.channel.send({embed: {color: "RED", description: "Gada musik yang diputer"}});
        return message.channel.send({embed: {color: "BLUE", description: `🎶  **|**  Sedang diputar: **\`${serverQueue.songs[0].title}\`**`}});

    } else if (command === "queue" || command === "q") {
        if (!serverQueue) return message.channel.send({embed: {color: "RED", description: "Gada musik yang diputer"}});
        let embedQueue = new MessageEmbed()
            .setColor("BLUE")
            .setAuthor("Song queue", message.author.displayAvatarURL())
            .setDescription(`${serverQueue.songs.map(song => `**-** ${song.title}`).join("\n")}`)
            .setFooter(`• Now Playing: ${serverQueue.songs[0].title}`);
        return message.channel.send(embedQueue);

    } else if (command === "pause") {
        if (serverQueue && serverQueue.playing) {
            serverQueue.playing = false;
            serverQueue.connection.dispatcher.pause();
            return message.channel.send({embed: {color: "GREEN", description: "⏸  **|**  Dah gw pause."}});
        }
        return message.channel.send({embed: {color: "RED", description: "Gada musik yang diputer"}});

    } else if (command === "resume") {
        if (serverQueue && !serverQueue.playing) {
            serverQueue.playing = true;
            serverQueue.connection.dispatcher.resume();
            return message.channel.send({embed: {color: "GREEN", description: "▶  **|**  Gw resume"}});
        }
        return message.channel.send({embed: {color: "RED", description: "Gada musik yang diputer"}});
    } else if (command === "loop") {
        if (serverQueue) {
            serverQueue.loop = !serverQueue.loop;
            return message.channel.send({embed: {color: "GREEN", description: `🔁  **|**  Loop : **\`${serverQueue.loop === true ? "enabled" : "disabled"}\`**`}});
        };
        return message.channel.send({embed: {color: "RED", description: "Gada musik yang diputer"}});
    }
});

async function handleVideo(video, message, voiceChannel, playlist = false) {
    const serverQueue = queue.get(message.guild.id);
    const song = {
        id: video.id,
        title: Util.escapeMarkdown(video.title),
        url: `https://www.youtube.com/watch?v=${video.id}`
    };
    if (!serverQueue) {
        const queueConstruct = {
            textChannel: message.channel,
            voiceChannel: voiceChannel,
            connection: null,
            songs: [],
            volume: 100,
            playing: true,
            loop: false
        };
        queue.set(message.guild.id, queueConstruct);
        queueConstruct.songs.push(song);

        try {
            var connection = await voiceChannel.join();
            queueConstruct.connection = connection;
            play(message.guild, queueConstruct.songs[0]);
        } catch (error) {
            console.error(`[ERROR] Gw gabisa join voice channel gara gara : ${error}`);
            queue.delete(message.guild.id);
            return message.channel.send({embed: {color: "RED", description: `Gw gabisa join voice channel gara gara : **\`${error}\`**`}});
        }
    } else {
        serverQueue.songs.push(song);
        if (playlist) return;
        else return message.channel.send({embed: {color: "GREEN", description: `✅  **|**  **\`${song.title}\`** telah ditambahkan ke antrian`}});
    }
    return;
}

function play(guild, song) {
    const serverQueue = queue.get(guild.id);

    if (!song) {
        serverQueue.voiceChannel.leave();
        return queue.delete(guild.id);
    }

    const dispatcher = serverQueue.connection.play(ytdl(song.url))
        .on("finish", () => {
            const shiffed = serverQueue.songs.shift();
            if (serverQueue.loop === true) {
                serverQueue.songs.push(shiffed);
            };
            play(guild, serverQueue.songs[0]);
        })
        .on("error", error => console.error(error));
    dispatcher.setVolume(serverQueue.volume / 100);

    serverQueue.textChannel.send({
        embed: {
            color: "BLUE",
            description: `🎶  **|**  Memulai: **\`${song.title}\`**`
        }
    });
}

bot.login(process.env.BOT_TOKEN);
