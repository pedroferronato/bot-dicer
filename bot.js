const Discord = require("discord.js");
const client = new Discord.Client();
const config = require("./config.json");
const chance = require('chance').Chance();

const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const adapter = new FileSync('db.json');
const db = low(adapter);

client.on("ready", () => {
    console.log(`Bot foi iniciado em ${client.guilds.cache.size} servidores.`);
    client.user.setActivity(`dados e muitas bolas de fogo`);
});

client.on("message", async message => {
    if (message.author.bot) return;
    if (message.channel.type === "dm") return;

    if (message.content[0] == config.prefix) {
        const args = message.content.slice(config.prefix.length).trim().split(/ +/g);

        const comando = args.shift().toLowerCase();

        if (comando === "ping") {
            const m = await message.channel.send("Ping?");
            m.edit(`Pong! A latência é ${m.createdTimestamp - message.createdTimestamp}ms. A Latência da API é ${Math.round(client.ws.ping)}ms`);
        }

        if (comando === "r" || comando === "roll") {

            let parametros = args.toString().split(" ").join("").split(",").join("");

            parametros = parametros.split("+").join(" +").split("-").join(" -");

            let lista = parametros.split(" ");

            let bonus = 0;

            let resultadoEmbed = new Discord.MessageEmbed()
                .setColor("#" + Math.floor(Math.random() * 16777215).toString(16))
                .setThumbnail("https://i.pinimg.com/736x/6b/e0/9b/6be09be4f22ff3051d34273a4ab5a397.jpg")
                .setTitle('Resultados do roll')
                .setDescription(`<@${message.author.id}>`);

            let danoTotal = 0;

            lista.forEach(item => {
                if (item.includes("d")) {
                    let a = calcularRoll(item);
                    resultadoEmbed.addField(a[0], a[1]);
                    danoTotal += a[2];
                }

                if (!item.includes("d")) {
                    bonus += parseInt(item);
                }
            });

            if (isNaN(bonus) || bonus === "")
                bonus = 0;

            resultadoEmbed.addField("**Resultado Final**", `**${danoTotal} + (${bonus}) = ${danoTotal + bonus}**`);

            message.channel.send(resultadoEmbed);

            message.delete();

        }

        let magia = db.get("Local").find({ id: comando }).value();

        if (magia) {

            let resultadoEmbed = new Discord.MessageEmbed()
                .setColor(magia.cor)
                .setTitle(magia.nome)
                .setURL(magia.url)
                .setDescription(magia.nivel + magia.descricao)
                .addField("Conjurador:",`<@${message.author.id}>`)
                .addFields(
                    { name: 'Tempo de Conjuração', value: magia.conjuracao, inline: true },
                    { name: 'Alcance', value: magia.alcance, inline: true },
                    { name: 'Duracao', value: magia.duracao, inline: true },
                    { name: 'Componentes', value: magia.componentes + magia.materiais },
                )
                .addField('Descrição:', magia.texto)
                .setImage(magia.imagem)
                .setThumbnail(magia.thumb);

            let nivelBase = parseInt(magia.nivel);
            let nivelCast = parseInt((args.toString()));

            let adicional = 0;

            if (nivelBase !== nivelCast && !isNaN(nivelCast)) {
                adicional = (nivelCast - nivelBase) * parseInt(magia.adicional);
            }    

            if (magia.castar) {
                let rollmagia = calcularRoll(magia.roll, adicional);

                resultadoEmbed.addField(rollmagia[0], rollmagia[1])
                    .addField("**Resultado Final**", `**${rollmagia[2]}**`);
            }

            message.channel.send(resultadoEmbed);

            message.delete();
        }

    }
});

function calcularRoll(conjunto, adicional = 0) {
    conjunto = conjunto.split("");
    let quantidade = conjunto.slice(0, conjunto.indexOf("d")).join("");
    let dado = conjunto.slice(conjunto.indexOf("d") + 1).join("");

    if (isNaN(quantidade) || quantidade <= 0 || quantidade === "")
        quantidade = 1;

    if (isNaN(dado) || dado <= 0 || dado === "")
        dado = 1;

    quantidade = parseInt(quantidade) + adicional;
    dado = parseInt(dado);

    let resultados = [];

    for (let index = 0; index < quantidade; index++)
        resultados.push(chance.integer({ min: 1, max: dado }));


    let dano = 0;
    let textoDano = "[";

    for (let index = 0; index < resultados.length; index++) {
        dano += resultados[index];
        if (index === resultados.length - 1) {
            if (resultados[index] !== dado)
                textoDano += " " + resultados[index].toString() + " ]";
            if (resultados[index] === dado)
                textoDano += " **" + resultados[index].toString() + "** ]";
        } else {
            if (resultados[index] !== dado)
                textoDano += " " + resultados[index].toString() + " ,";
            if (resultados[index] === dado)
                textoDano += " **" + resultados[index].toString() + "** ,";
        }
    }

    return [`Você rolou ${quantidade} :game_die: **D${dado}** :game_die:`, "Roll: " + textoDano, dano];
}

client.login(config.token);