/**
 * Bot WhatsApp Profissional 2.0 - Agência Divulga Já
 * Melhorias: Navegação, Notificação Admin, Envio de Mídia e Timeout
 */

const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// =====================
// CONFIGURAÇÕES
// =====================
const ADMIN_NUMBER = '5511999999999@c.us'; // <--- COLOQUE SEU NÚMERO AQUI (com 55 + DDD)
const TIMEOUT_MS = 10 * 60 * 1000; // 10 Minutos para resetar conversa inativa

// Memória
const userStates = {}; 
// Estrutura: { stage: string, timestamp: number, name: string, history: [] }

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    }
});

client.on('qr', (qr) => qrcode.generate(qr, { small: true }));
client.on('ready', () => console.log('✅ Bot Turbinado ONLINE!'));

// =====================
// FUNÇÕES AUXILIARES
// =====================

// Reseta o estado do usuário
const resetUser = (userId) => {
    delete userStates[userId];
};

// Envia resposta simulando digitação
const sendResponse = async (chat, text, delay = 1000) => {
    await chat.sendStateTyping();
    return new Promise(resolve => setTimeout(async () => {
        await chat.sendMessage(text);
        resolve();
    }, delay));
};

// Notifica o dono do bot (Você)
const notifyAdmin = async (clientData, resumo) => {
    const text = `🚨 *NOVO LEAD FINALIZADO* 🚨\n\n` +
                 `👤 *Nome:* ${clientData.name}\n` +
                 `📱 *WhatsApp:* https://wa.me/${clientData.id.replace('@c.us', '')}\n` +
                 `📂 *Interesse:* ${resumo}\n` +
                 `⏰ *Hora:* ${new Date().toLocaleTimeString()}`;
    
    try {
        await client.sendMessage(ADMIN_NUMBER, text);
    } catch (e) {
        console.error('Erro ao notificar admin:', e);
    }
};

// =====================
// LÓGICA PRINCIPAL
// =====================
client.on('message_create', async (msg) => {
    if (msg.fromMe) return;
    const chat = await msg.getChat();
    if (chat.isGroup) return;

    const userId = msg.from;
    const body = msg.body.trim();
    
    // 1. CHECAGEM DE TIMEOUT (Se demorou muito, reseta)
    if (userStates[userId]) {
        const timeDiff = Date.now() - userStates[userId].timestamp;
        if (timeDiff > TIMEOUT_MS) {
            resetUser(userId);
            // Opcional: Avisar que resetou
            // await chat.sendMessage('🕒 Sua sessão expirou. Vamos começar de novo?');
        }
    }

    // Identificar Nome
    let contactName = 'Visitante';
    try {
        const contact = await msg.getContact();
        contactName = contact.pushname || contact.name || 'Visitante';
    } catch {}

    // Inicializa estado se não existir
    if (!userStates[userId]) {
        userStates[userId] = { stage: 'START', timestamp: Date.now(), name: contactName, id: userId };
    } else {
        userStates[userId].timestamp = Date.now(); // Atualiza tempo
    }

    const state = userStates[userId].stage;

    // =====================
    // COMANDOS GLOBAIS
    // =====================
    if (body.toLowerCase() === 'voltar' && state !== 'START') {
        userStates[userId].stage = 'MENU';
        return sendResponse(chat, `🔄 Menu Principal:\n\n1️⃣ Marketing Digital\n2️⃣ Sites e Sistemas\n3️⃣ Consultoria\n4️⃣ Já sou Cliente\n5️⃣ Falar com Humano`);
    }

    if (body.toLowerCase() === 'reset' || body.toLowerCase() === 'sair') {
        resetUser(userId);
        return sendResponse(chat, 'Conversa encerrada. Diga "Oi" para começar de novo. 👋');
    }

    // =====================
    // FLUXO DA CONVERSA
    // =====================

    // 🟢 ESTÁGIO 0: INÍCIO
    if (state === 'START' || ['oi', 'ola', 'menu'].includes(body.toLowerCase())) {
        userStates[userId].stage = 'MENU';
        
        // Exemplo: Mandar uma imagem de boas-vindas (Descomente se tiver a URL)
        // const media = await MessageMedia.fromUrl('https://seusite.com/logo.png');
        // await chat.sendMessage(media, { caption: 'Bem vindo à Agência!' });

        return sendResponse(
            chat,
            `Olá, ${contactName}! 👋\n` +
            `Bem-vindo à *Agência Divulga Já*.\n\n` +
            `Escolha uma opção (Digite o número):\n\n` +
            `1️⃣ *Quero Vender Mais* (Marketing)\n` +
            `2️⃣ *Site ou Sistema Novo*\n` +
            `3️⃣ *Consultoria*\n` +
            `4️⃣ *Já sou Cliente*\n` +
            `5️⃣ *Falar com Humano*`
        );
    }

    // 🟢 ESTÁGIO 1: MENU PRINCIPAL
    if (state === 'MENU') {
        if (body === '1') {
            userStates[userId].stage = 'MARKETING';
            return sendResponse(chat, `🚀 *Marketing Digital*\n\nSeu negócio atende:\n\n1️⃣ Apenas local (Minha cidade)\n2️⃣ Todo o Brasil (Online)\n\n(Digite *Voltar* para o menu)`);
        }
        if (body === '2') {
            userStates[userId].stage = 'DEV';
            return sendResponse(chat, `💻 *Desenvolvimento*\n\nO que você precisa?\n\n1️⃣ Site Institucional\n2️⃣ Loja Virtual\n3️⃣ Sistema Personalizado\n\n(Digite *Voltar* para o menu)`);
        }
        if (body === '3') {
            userStates[userId].stage = 'CONSULTORIA';
            return sendResponse(chat, `📊 *Consultoria*\n\nQual o maior problema hoje?\n\n1️⃣ Falta de Clientes\n2️⃣ Processos Bagunçados\n\n(Digite *Voltar* para o menu)`);
        }
        if (body === '4') {
            userStates[userId].stage = 'CLIENTE';
            return sendResponse(chat, `🤝 *Área do Cliente*\n\n1️⃣ 2ª via de Boleto\n2️⃣ Suporte Técnico\n\n(Digite *Voltar* para o menu)`);
        }
        if (body === '5') {
            await notifyAdmin(userStates[userId], 'Solicitou Humano no Menu');
            resetUser(userId);
            return sendResponse(chat, `✅ Um de nossos atendentes entrará na conversa em breve!`);
        }
    }

    // 🟢 ESTÁGIO 2: SUB-MENUS E FINALIZAÇÃO

    // --- MARKETING ---
    if (state === 'MARKETING' && ['1', '2'].includes(body)) {
        const tipo = body === '1' ? 'Negócio Local' : 'Negócio Online';
        await sendResponse(chat, `Perfeito! Entendi que seu foco é *${tipo}*.`);
        await sendResponse(chat, `✅ Um especialista em Tráfego vai te chamar aqui para apresentar um plano.\n\nAguarde um instante...`, 2000);
        
        await notifyAdmin(userStates[userId], `Marketing Digital - ${tipo}`);
        resetUser(userId);
        return;
    }

    // --- DESENVOLVIMENTO ---
    if (state === 'DEV' && ['1', '2', '3'].includes(body)) {
        const servicos = {'1': 'Site', '2': 'Loja Virtual', '3': 'Sistema'};
        const escolha = servicos[body];

        await sendResponse(chat, `Ótima escolha! Desenvolvemos *${escolha}s* incríveis.`);
        // Exemplo: Enviar PDF de portfólio (se tiver URL)
        // await chat.sendMessage(await MessageMedia.fromUrl('https://seusite.com/portfolio.pdf'));
        
        await sendResponse(chat, `📝 Já anotei seu interesse. Nossa equipe de Dev vai entrar em contato.`);
        
        await notifyAdmin(userStates[userId], `Desenvolvimento - ${escolha}`);
        resetUser(userId);
        return;
    }

    // --- CONSULTORIA ---
    if (state === 'CONSULTORIA') {
        await sendResponse(chat, `Entendido. Vamos te ajudar a organizar a casa. 🏗️`);
        await notifyAdmin(userStates[userId], `Consultoria - Opção ${body}`);
        resetUser(userId);
        return;
    }

    // --- CLIENTE ---
    if (state === 'CLIENTE') {
        await sendResponse(chat, `Certo, encaminhei sua solicitação ao setor responsável.`);
        await notifyAdmin(userStates[userId], `Cliente Antigo - Opção ${body}`);
        resetUser(userId);
        return;
    }

    // SE NÃO ENTENDEU NADA
    if (state !== 'START') {
        await chat.sendMessage(`⚠️ Não entendi a opção "${body}".\nDigite o número da opção ou digite *Voltar*.`);
    }
});

client.initialize();
