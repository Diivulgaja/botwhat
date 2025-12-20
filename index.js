/**
 * Bot WhatsApp Profissional 3.0 - Agência Divulga Já
 * Novidade: MODO SILENCIOSO (Handoff para Humano)
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// =====================
// CONFIGURAÇÕES
// =====================
const ADMIN_NUMBER = '554899689199@c.us'; // <--- SEU NÚMERO AQUI
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 Minutos para resetar conversa abandonada
const SILENCE_TIMEOUT = 24 * 60 * 60 * 1000; // 24 Horas de silêncio após finalizar (para o humano atender)

// Memória
const userStates = {}; 

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    }
});

client.on('qr', (qr) => qrcode.generate(qr, { small: true }));
client.on('ready', () => console.log('✅ Bot com Modo Silencioso ONLINE!'));

// =====================
// FUNÇÕES AUXILIARES
// =====================

// Coloca o bot em modo silencioso para esse usuário
const setSilentMode = (userId) => {
    userStates[userId] = { 
        stage: 'SILENT', 
        timestamp: Date.now() 
    };
};

// Reseta o usuário (volta para o início)
const resetUser = (userId) => {
    delete userStates[userId];
};

const sendResponse = async (chat, text, delay = 1000) => {
    await chat.sendStateTyping();
    return new Promise(resolve => setTimeout(async () => {
        await chat.sendMessage(text);
        resolve();
    }, delay));
};

const notifyAdmin = async (clientData, resumo) => {
    const text = `🚨 *NOVO LEAD (ATENDIMENTO HUMANO)* 🚨\n\n` +
                 `👤 *Nome:* ${clientData.name}\n` +
                 `📱 *Link:* https://wa.me/${clientData.id.replace('@c.us', '')}\n` +
                 `📂 *Assunto:* ${resumo}\n` +
                 `⚠️ *Bot:* Entrou em modo silencioso.`;
    
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
    try {
        if (msg.fromMe) return; // Ignora suas próprias mensagens

        const chat = await msg.getChat();
        if (chat.isGroup) return; // Ignora grupos

        const userId = msg.from;
        const body = msg.body.trim();

        // ==========================================
        // 🔒 VERIFICAÇÃO DE MODO SILENCIOSO
        // ==========================================
        if (userStates[userId] && userStates[userId].stage === 'SILENT') {
            const timeInSilence = Date.now() - userStates[userId].timestamp;
            
            // Se o cliente mandar "#bot", força o retorno do bot (Opcional)
            if (body.toLowerCase() === '#bot') {
                resetUser(userId);
                return sendResponse(chat, '🤖 Bot reativado! Digite "Oi" para começar.');
            }

            // Se ainda não passou as 24h (ou o tempo configurado), o bot FICA QUIETO.
            if (timeInSilence < SILENCE_TIMEOUT) {
                console.log(`Silêncio ativo para ${userId}. Ignorando mensagem.`);
                return; 
            } else {
                // Se já passou o tempo, reseta e deixa o bot atender de novo
                resetUser(userId);
            }
        }
        // ==========================================

        // Timeout de inatividade (só para quem está no menu, não em SILENT)
        if (userStates[userId]) {
            const timeDiff = Date.now() - userStates[userId].timestamp;
            if (timeDiff > INACTIVITY_TIMEOUT) {
                resetUser(userId);
            }
        }

        // Identificar Nome
        let contactName = 'Visitante';
        try {
            const contact = await msg.getContact();
            contactName = contact.pushname || contact.name || 'Visitante';
        } catch {}

        // Inicializa estado
        if (!userStates[userId]) {
            userStates[userId] = { stage: 'START', timestamp: Date.now(), name: contactName, id: userId };
        } else {
            userStates[userId].timestamp = Date.now();
        }

        const state = userStates[userId].stage;

        // Comandos de navegação
        if (body.toLowerCase() === 'voltar' && state !== 'START') {
            userStates[userId].stage = 'MENU';
            return sendResponse(chat, `🔄 Menu Principal:\n\n1️⃣ Marketing Digital\n2️⃣ Sites e Sistemas\n3️⃣ Consultoria\n4️⃣ Já sou Cliente\n5️⃣ Falar com Humano`);
        }

        // 🟢 INÍCIO
        if (state === 'START' || ['oi', 'ola', 'menu'].includes(body.toLowerCase())) {
            userStates[userId].stage = 'MENU';
            return sendResponse(
                chat,
                `Olá, ${contactName}! 👋\n` +
                `Bem-vindo à *Agência Divulga Já*.\n\n` +
                `1️⃣ *Marketing Digital*\n` +
                `2️⃣ *Site ou Sistema*\n` +
                `3️⃣ *Consultoria*\n` +
                `4️⃣ *Já sou Cliente*\n` +
                `5️⃣ *Falar com Humano*`
            );
        }

        // 🟢 MENU
        if (state === 'MENU') {
            if (body === '1') {
                userStates[userId].stage = 'MARKETING';
                return sendResponse(chat, `🚀 *Marketing*\n\n1️⃣ Negócio Local\n2️⃣ Online\n\n(*Voltar* para menu)`);
            }
            if (body === '2') {
                userStates[userId].stage = 'DEV';
                return sendResponse(chat, `💻 *Desenvolvimento*\n\n1️⃣ Site\n2️⃣ Loja Virtual\n3️⃣ Sistema\n\n(*Voltar* para menu)`);
            }
            if (body === '3') {
                userStates[userId].stage = 'CONSULTORIA';
                return sendResponse(chat, `📊 *Consultoria*\n\n1️⃣ Falta de Clientes\n2️⃣ Processos\n\n(*Voltar* para menu)`);
            }
            if (body === '4') {
                userStates[userId].stage = 'CLIENTE';
                return sendResponse(chat, `🤝 *Cliente*\n\n1️⃣ Boleto\n2️⃣ Suporte\n\n(*Voltar* para menu)`);
            }
            if (body === '5') {
                await sendResponse(chat, `✅ Um atendente humano vai assumir agora. Aguarde!`);
                await notifyAdmin(userStates[userId], 'Solicitou Humano Direto');
                setSilentMode(userId); // <--- ATIVA MODO SILENCIOSO AQUI
                return;
            }
        }

        // 🟢 FINALIZAÇÕES (Aqui ativamos o modo silencioso)
        
        // --- MARKETING ---
        if (state === 'MARKETING' && ['1', '2'].includes(body)) {
            const tipo = body === '1' ? 'Local' : 'Online';
            await sendResponse(chat, `Perfeito! Um especialista vai te chamar para falar de Marketing ${tipo}.`);
            await notifyAdmin(userStates[userId], `Marketing - ${tipo}`);
            setSilentMode(userId); // <--- SILÊNCIO
            return;
        }

        // --- DEV ---
        if (state === 'DEV' && ['1', '2', '3'].includes(body)) {
            const itens = {'1': 'Site', '2': 'Loja', '3': 'Sistema'};
            await sendResponse(chat, `Ótimo! Vamos falar sobre seu *${itens[body]}* em instantes.`);
            await notifyAdmin(userStates[userId], `Dev - ${itens[body]}`);
            setSilentMode(userId); // <--- SILÊNCIO
            return;
        }

        // --- CONSULTORIA ---
        if (state === 'CONSULTORIA' && ['1', '2'].includes(body)) {
            await sendResponse(chat, `Entendido. Um consultor vai te orientar.`);
            await notifyAdmin(userStates[userId], `Consultoria - Opção ${body}`);
            setSilentMode(userId); // <--- SILÊNCIO
            return;
        }

        // --- CLIENTE ---
        if (state === 'CLIENTE' && ['1', '2'].includes(body)) {
            await sendResponse(chat, `Solicitação recebida. O suporte já vai falar com você.`);
            await notifyAdmin(userStates[userId], `Suporte - Opção ${body}`);
            setSilentMode(userId); // <--- SILÊNCIO
            return;
        }

        // ERRO
        if (state !== 'START') {
            await chat.sendMessage(`⚠️ Opção inválida. Digite o número ou *Voltar*.`);
        }

    } catch (err) {
        console.error(err);
    }
});

client.initialize();

