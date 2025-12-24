const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// Configuração do Cliente com salvamento de sessão (LocalAuth)
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true, // Roda sem abrir o navegador na tela (mais leve)
        args: ['--no-sandbox']
    }
});

// Armazena em qual etapa o cliente está
const userStages = {};

// GERA O QR CODE NO TERMINAL
client.on('qr', (qr) => {
    console.log('Escaneie o QR Code abaixo com seu WhatsApp:');
    qrcode.generate(qr, { small: true });
});

// AVISA QUANDO CONECTAR
client.on('ready', () => {
    console.log('✅ Bot da Divulga Já está online e pronto!');
});

// LÓGICA DE MENSAGENS
client.on('message', async msg => {
    // Ignora grupos e status
    if (msg.from.includes('@g.us') || msg.from.includes('status')) return;

    const chat = await msg.getChat();
    const contact = await msg.getContact();
    const userPhone = msg.from;
    const text = msg.body.toLowerCase();

    // Se o usuário não tem estágio, define como 0
    if (!userStages[userPhone]) {
        userStages[userPhone] = 0;
    }

    const currentStage = userStages[userPhone];

    // --- ESTÁGIO 0: BOAS VINDAS ---
    if (currentStage === 0) {
        await client.sendMessage(msg.from, 
            `Olá, ${contact.pushname || 'Visitante'}! 👋\n` +
            `Bem-vindo à *Divulga Já* - Agência de Marketing e Programação.\n\n` +
            `Como podemos alavancar seu negócio hoje?\n` +
            `1️⃣ - Criação de Sites e Sistemas\n` +
            `2️⃣ - Automação (Bots) e IA\n` +
            `3️⃣ - Tráfego Pago (Ads)\n` +
            `4️⃣ - Falar com Humano`
        );
        userStages[userPhone] = 1; // Avança para esperar a resposta
    }

    // --- ESTÁGIO 1: MENU PRINCIPAL ---
    else if (currentStage === 1) {
        if (text === '1') {
            await client.sendMessage(msg.from, 
                `🖥️ *Desenvolvimento Web*\n\n` +
                `Criamos desde Landing Pages de alta conversão até sistemas complexos.\n` +
                `- Sites Institucionais\n` +
                `- E-commerce\n` +
                `- Sistemas de Gestão\n\n` +
                `Gostaria de um orçamento? Digite *sim* ou *voltar*.`
            );
            userStages[userPhone] = 2; // Vai para negociação de site
        } 
        else if (text === '2') {
            await client.sendMessage(msg.from, 
                `🤖 *Automação e Bots*\n\n` +
                `Automatize seu atendimento no WhatsApp 24h por dia, assim como este bot!\n` +
                `Ideal para agendamentos, delivery e suporte.\n\n` +
                `Digite *sim* para saber valores ou *voltar*.`
            );
            userStages[userPhone] = 2;
        }
        else if (text === '3') {
            await client.sendMessage(msg.from, 
                `📈 *Tráfego Pago*\n\n` +
                `Colocamos sua empresa no topo do Google e Facebook/Instagram.\n` +
                `Gestão profissional de campanhas para maximizar seu ROI.\n\n` +
                `Digite *sim* para falar com um gestor.`
            );
            userStages[userPhone] = 2;
        }
        else if (text === '4') {
            await client.sendMessage(msg.from, `✅ Transferindo para um atendente humano... Aguarde um momento.`);
            userStages[userPhone] = 99; // Encerra o bot para esse cliente
        }
        else {
            await client.sendMessage(msg.from, `❌ Opção inválida. Por favor, digite apenas 1, 2, 3 ou 4.`);
        }
    }

    // --- ESTÁGIO 2: FECHAMENTO / CONTATO ---
    else if (currentStage === 2) {
        if (text.includes('sim') || text.includes('quero')) {
            await client.sendMessage(msg.from, `Perfeito! Vou chamar um especialista para finalizar seu atendimento. 🚀`);
            userStages[userPhone] = 99;
        } else {
            // Se digitar qualquer outra coisa, volta pro menu
            userStages[userPhone] = 0;
            await client.sendMessage(msg.from, `Tudo bem! Voltando ao menu inicial... Digite algo para recomeçar.`);
        }
    }

    // --- ESTÁGIO 99: PAUSA (ATENDIMENTO HUMANO) ---
    else if (currentStage === 99) {
        // Se o cliente digitar #voltar, o bot reativa
        if (text === '#voltar') {
            userStages[userPhone] = 0;
            await client.sendMessage(msg.from, `🤖 Bot reativado!`);
        }
    }
});

client.initialize();
