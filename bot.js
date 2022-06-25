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

var iniciativa = [];

var primeiraMao = []
var segundaMao = []
var terceiraMao = []
var quartaMao = []

var listaGeral = []

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
                .addField("Conjurador:", `<@${message.author.id}>`)
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

        if (comando == "regras") {
            let naipes = "Naipe paus = ação de movimento\nNaipe copas = ação padrão (exceto atacar)\nNaipe espadas = ação atacar\nNaipe ouros = ação completa"
            let ordem = "Em cada rodada, o personagem com a maior\ncarta numérica age primeiro, seguindo a ordem\ndecrescente dos números."

            let mensagemCartas = new Discord.MessageEmbed()
                .setColor("#d40000")
                .setTitle("Regras")
                .addField(`Naipes:`, naipes, false)
                .addField(`Ordem:`, ordem, false);

            message.channel.send(mensagemCartas)
            message.delete()
        }

        if (comando == "especiais") {
            let mensagemCartas = new Discord.MessageEmbed()
                .setColor("#d40000")
                .setTitle("Regras")
                .addField(`Às:`, "Faça uma ação (tipo definido pelo naipe) que não conta em seu limite de turno.", false)
                .addField(`Valete:`, "Faça outra criatura em alcance curto rolar novamente um teste recém realizado", false)
                .addField(`Rainha:`, "Use uma habilidade sem pagar seu custo básico em pontos de mana (você ainda precisa gastar uma carta para fazer a ação).", false)
                .addField(`Rei:`, "Receba +5 em um teste.", false)
                .addField(`Coringa:`, "Emule qualquer outra carta.", false);

            message.channel.send(mensagemCartas)
            message.delete()
        }

        if (comando == "cartas") {

            if (listaGeral.length == 14) {
                exibirCartas(message)
                return
            }

            while (primeiraMao.length != 5) {
                primeiraMao.push(gerarCarta())
            }

            while (segundaMao.length != 3) {
                segundaMao.push(gerarCarta())
            }

            while (terceiraMao.length != 3) {
                terceiraMao.push(gerarCarta())
            }

            while (quartaMao.length != 3) {
                quartaMao.push(gerarCarta())
            }

            exibirCartas(message)
        }

        if (comando == "limpar") {
            let parametros = args.toString().split(",");

            limparMao(parametros[0], parametros[1], message)
        }

        if (comando == "init") {
            let parametros = args.toString().split(",");

            let personagem;

            let modificador;

            try {
                personagem = parametros[0].toString().trim();

                if (!parametros[1]) {
                    modificador = 0;
                } else {
                    modificador = parametros[1].toString().trim();
                }

            } catch (error) {
                message.channel.send("Insira todas as informações");
                message.delete();
                return;
            }

            var length = iniciativa.length;

            let mensagemIniciativa = new Discord.MessageEmbed()
                .setColor("#FABB0D")
                .setTitle("Iniciativa")
                .setDescription("Sequência de combate");

            if (personagem == "prox") {
                if (length == 0 || length == 1) {
                    message.delete();
                    return;
                }

                let reposAux;

                for (let i = 0; i < length; i++) {
                    if (i == 0) reposAux = iniciativa[i];
                    if (i == length - 1) {
                        iniciativa[i] = reposAux;
                        break;
                    }
                    iniciativa[i] = iniciativa[i + 1];
                }

                let retorno = "";
                for (let i = 0; i < length; i++) {
                    retorno += `- ${iniciativa[i]["nome"]} ${iniciativa[i]["iniciativa"]}\n`;
                }
                mensagemIniciativa.addField("Jogador atual:", `${retorno}`, false);

                message.channel.send(mensagemIniciativa);
                message.delete();
                return;
            }

            if (personagem == "rep") {
                if (length == 0) {
                    message.delete();
                    return;
                }
                let msg = "";
                for (let i = 0; i < length; i++) {
                    msg += `- ${iniciativa[i]["nome"]} ${iniciativa[i]["iniciativa"]}\n`;
                }
                mensagemIniciativa.addField("Jogador atual:", `${msg}`, false);

                message.channel.send(mensagemIniciativa);
                message.delete();
                return;
            }

            let rolagem = chance.integer({ min: 1, max: 20 });

            let valorFinal = rolagem + parseInt(modificador);

            iniciativa.push({ "nome": personagem, "iniciativa": valorFinal })

            message.channel.send(`<@${message.author.id}>, ${personagem} rolou: ${rolagem} + ${modificador} = ${valorFinal}`)

            length = iniciativa.length;

            if (length > 1) {
                for (let i = 0; i < length; i++) {
                    for (var j = 0; j < (length - i - 1); j++) {
                        if (iniciativa[j]["iniciativa"] < iniciativa[j + 1]["iniciativa"]) {
                            var tmp = iniciativa[j];
                            iniciativa[j] = iniciativa[j + 1];
                            iniciativa[j + 1] = tmp;
                        }
                    }
                }
            }

            let mensagemLista = "";
            for (let i = 0; i < length; i++) {
                mensagemLista += `- ${iniciativa[i]["nome"]} ${iniciativa[i]["iniciativa"]}\n`;
            }

            mensagemIniciativa.addField("Jogador atual:", `${mensagemLista}`, false);

            message.channel.send(mensagemIniciativa);

            message.delete();
        }

    }
});

function limparMao(mao, posicao, message) {
    let maos = [primeiraMao, segundaMao, terceiraMao, quartaMao]
    if (!mao) {
        primeiraMao = []
        segundaMao = []
        terceiraMao = []
        quartaMao = []
    } else {
        if (!posicao) {
            mao = Number(mao)
            switch (mao) {
                case 1:
                    primeiraMao = []
                    break;
                case 2:
                    segundaMao = []
                    break;
                case 3:
                    terceiraMao = []
                    break;
                case 4:
                    quartaMao = []
                    break;
                default:
                    break;
            }
        } else {
            maos[mao - 1].splice(posicao - 1, 1)
        }
    }

    exibirCartas(message)
}

function exibirCartas(message) {
    let mensagemCartas = new Discord.MessageEmbed()
        .setColor("#d40000")
        .setTitle("Cartas da rodada")
        .setDescription("Cartas de combate")
        .addField(`Primeira mão :black_joker:`, primeiraMao.length != 0 ? primeiraMao : "[Vazio]", false)
        .addField(`Segunda mão :black_joker:`, segundaMao.length != 0 ? segundaMao : "[Vazio]", true)
        .addField(`Terceira mão :black_joker:`, terceiraMao.length != 0 ? terceiraMao : "[Vazio]", true)
        .addField(`Quarta mão :black_joker:`, quartaMao.length != 0 ? quartaMao : "[Vazio]", true);

    message.channel.send(mensagemCartas)
    message.delete()
}

function gerarCarta() {
    listaGeral = [...primeiraMao, ...segundaMao, ...terceiraMao, ...quartaMao]
    const carta = chance.integer({ min: 1, max: 14 })

    const naipe = chance.integer({ min: 1, max: 4 })

    let emojiNaipe

    switch (naipe) {
        case 1:
            emojiNaipe = `de paus`
            break;
        case 2:
            emojiNaipe = `de copas`
            break;
        case 3:
            emojiNaipe = `de espadas`
            break;
        case 4:
            emojiNaipe = `de ouros`
            break;
    }
    let cartaFinal

    if (carta == 1) cartaFinal = `Ás ${emojiNaipe}`
    if (carta >= 2 && carta <= 10) cartaFinal = `${carta} ${emojiNaipe}`
    if (carta == 11) cartaFinal = `Valete ${emojiNaipe}`
    if (carta == 12) cartaFinal = `Rainha ${emojiNaipe}`
    if (carta == 13) cartaFinal = `Rei ${emojiNaipe}`
    if (carta == 14) cartaFinal = `Joker :black_joker:`

    if (listaGeral.indexOf(cartaFinal) != -1) {
        return gerarCarta()
    }

    return cartaFinal
}

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