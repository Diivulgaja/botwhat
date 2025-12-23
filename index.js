/**
 * Bot WhatsApp Profissional - Agência Divulga Já (Versão Inteligente)
 * Funcionalidades: Menu, Persistência, Detecção de Humano e Timeout de 48h.
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// ===========================================================
// ⚙️ CONFIGURAÇÕES
// ===========================================================
const ADMIN_NUMBER_RAW = '5548996689199'; 
const ADMIN_NUMBER = `${ADMIN_NUMBER_RAW}@c.us`;

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 Minutos (Cliente sumiu)
const SILENCE_TIMEOUT = 48 * 60 * 60 * 1000; // 48 HORAS (Bot fica mudo após atendimento)

// ===========================================================
// 🧠 MEMÓRIA E CLIENTE
// ===========================================================
const userStates = {}; 

const client = new Client({
    authStrategy: new LocalAuth({ clientId: "divulgaja-bot" }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--single-process'
        ]
    }
});

// ===========================================================
// 📡 EVENTOS DE SISTEMA
// ===========================================================
client.on('qr', (qr) => {
    console.log('📲 QR Code gerado! Escaneie abaixo:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log(`✅ Bot ONLINE! Monitorando interações.`);
    client.sendMessage(ADMIN_NUMBER, '🚀 Bot iniciado com timeout de 48h!');
});

client.on('disconnected', (reason) => {
    console.log('❌ Bot desconectado:', reason);
    client.initialize();
});

// ===========================================================
// 🛠️ FUNÇÕES DE CONTROLE
// ===========================================================

// Ativa o modo silencioso (Bot para de responder)
const setSilentMode = (userId) => {
    userStates[userId] = { stage: 'SILENT', timestamp: Date.now() };
    // console.log(`🔇 Modo silencioso (48h) ativado para: ${userId}`);
};

const resetUser = (userId) => {
    delete userStates[userId];
};

const sendResponse = async (chat, text, delay = 1000) => {
    const randomDelay = delay + Math.floor(Math.random() * 500);
    try {
        await chat.sendStateTyping();
        return new Promise(resolve => setTimeout(async () => {
            await chat.sendMessage(text);
            resolve();
        }, randomDelay));
    } catch (err) {
        console.error(`Erro ao enviar msg:`, err);
    }
};

const notifyAdmin = async (clientData, resumo) => {
    const text = `🚨 *LEAD QUENTE (DIVULGA JÁ)* 🚨\n\n` +
                 `👤 *Nome:* ${clientData.name}\n` +
                 `📱 *WhatsApp:* https://wa.me/${clientData.id.replace('@c.us', '')}\n` +
                 `📂 *Interesse:* ${resumo}\n` +
                 `⚠️ *Status:* Bot pausado por 48h.`;
    try {
        await client.sendMessage(ADMIN_NUMBER, text);
    } catch (e) { console.error('Erro notificando admin:', e); }
};

// ===========================================================
// 🤖 LÓGICA DE ATENDIMENTO
// ===========================================================
client.on('message_create', async (msg) => {
    try {
        // -----------------------------------------------------------
        // 🛑 DETECÇÃO DE INTERVENÇÃO HUMANA (NOVO)
        // -----------------------------------------------------------
        // Se a mensagem for SUA (Admin/Humano), o bot cala a boca para esse cliente.
        if (msg.fromMe) {
            const targetId = msg.to; // Para quem você mandou mensagem?
            
            // Só ativa se for mensagem para um contato individual (ignora grupos/status)
            if (targetId.includes('@c.us')) {
                setSilentMode(targetId); // <--- O PULO DO GATO
                console.log(`👨‍💻 Intervenção humana detectada! Bot pausado para ${targetId}`);
            }
            return; // Encerra aqui, não processa sua própria mensagem.
        }
        // -----------------------------------------------------------

        const chat = await msg.getChat();
        if (chat.isGroup) return; // Ignora grupos

        const userId = msg.from;
        const body = msg.body.trim();

        // 1. Lógica do Modo Silencioso (Verifica se está no castigo de 48h)
        if (userStates[userId] && userStates[userId].stage === 'SILENT') {
            
            // Se você digitar #bot na conversa, ele acorda na hora
            if (body.toLowerCase() === '#bot' || body.toLowerCase() === '#voltar') {
                resetUser(userId);
                return sendResponse(chat, '🤖 Bot reativado! Digite *Menu* para ver as opções.');
            }

            const timeInSilence = Date.now() - userStates[userId].timestamp;
            
            // Se ainda não passou 48h, o bot fica quieto e ignora tudo
            if (timeInSilence < SILENCE_TIMEOUT) {
                return; 
            } else {
                // Passou 48h, reseta e volta a atender se o cliente chamar
                resetUser(userId);
            }
        }

        // 2. Timeout de Inatividade (Cliente sumiu no meio do atendimento)
        if (userStates[userId]) {
            const timeDiff = Date.now() - userStates[userId].timestamp;
            if (timeDiff > INACTIVITY_TIMEOUT && userStates[userId].stage !== 'START') {
                resetUser(userId); 
            }
        }

        // 3. Identificação
        let contactName = 'Visitante';
        try {
            const contact = await msg.getContact();
            contactName = contact.pushname || contact.name || contactName;
        } catch {}

        // Inicializa Estado se não existir
        if (!userStates[userId]) {
            userStates[userId] = { stage: 'START', timestamp: Date.now(), name: contactName, id: userId };
        } else {
            userStates[userId].timestamp = Date.now();
        }

        const state = userStates[userId].stage;

        // Comando Voltar
        if (['voltar', 'inicio', 'menu'].includes(body.toLowerCase()) && state !== 'START') {
            userStates[userId].stage = 'MENU';
            return sendResponse(chat, `🔄 *Menu Principal:*\n\n1️⃣ Marketing Digital\n2️⃣ Sites e Sistemas\n3️⃣ Consultoria\n4️⃣ Já sou Cliente\n5️⃣ Falar com Humano`);
        }

        // --- FLUXOS DE CONVERSA ---

        // START
        if (state === 'START' || ['oi', 'ola', 'olá', 'bom dia', 'boa tarde'].includes(body.toLowerCase())) {
            userStates[userId].stage = 'MENU';
            return sendResponse(
                chat,
                `Olá, ${contactName}! 👋\n` +
                `Bem-vindo à *Agência Divulga Já*.\n\n` +
                `Como podemos acelerar seu negócio hoje?\n\n` +
                `1️⃣ *Quero Vender Mais* (Marketing)\n` +
                `2️⃣ *Site ou Sistema Novo*\n` +
                `3️⃣ *Consultoria Estratégica*\n` +
                `4️⃣ *Área do Cliente*\n` +
                `5️⃣ *Falar com Especialista*`
            );
        }

        // MENU PRINCIPAL
        if (state === 'MENU') {
            const options = {
                '1': { stage: 'MARKETING', text: `🚀 *Marketing Digital*\n\nQual seu foco atual?\n\n1️⃣ Tráfego Pago (Ads)\n2️⃣ Redes Sociais\n3️⃣ Automação/Bots\n\n(Digite *Voltar* para o menu)` },
                '2': { stage: 'DEV', text: `💻 *Desenvolvimento*\n\nO que você precisa?\n\n1️⃣ Site Institucional\n2️⃣ Loja Virtual\n3️⃣ Sistema Personalizado\n\n(Digite *Voltar* para o menu)` },
                '3': { stage: 'CONSULTORIA', text: `📊 *Consultoria*\n\nQual o desafio?\n\n1️⃣ Estratégia de Vendas\n2️⃣ Processos da Empresa\n\n(Digite *Voltar* para o menu)` },
                '4': { stage: 'CLIENTE', text: `🤝 *Área do Cliente*\n\n1️⃣ 2ª Via de Boleto\n2️⃣ Suporte Técnico\n\n(Digite *Voltar* para o menu)` },
                '5': { action: 'HUMAN' }
            };

            if (options[body]) {
                if (options[body].action === 'HUMAN') {
                    await sendResponse(chat, `🔔 Entendido! Chamando um especialista da Divulga Já...`);
                    await notifyAdmin(userStates[userId], '🚨 Solicitou Humano (URGENTE)');
                    setSilentMode(userId); // Ativa 48h de silêncio
                    return;
                }
                userStates[userId].stage = options[body].stage;
                return sendResponse(chat, options[body].text);
            }
        }

        // SUBMENUS (Finalizadores)
        if (['MARKETING', 'DEV', 'CONSULTORIA', 'CLIENTE'].includes(state)) {
            if (['1', '2', '3'].includes(body)) {
                let service = `${state} - Opção ${body}`;
                
                await sendResponse(chat, `Perfeito! Excelente escolha. 🎯`);
                await sendResponse(chat, `📝 Já passei seu contato para nossa equipe técnica.\n\nEm breve, um especialista vai te chamar aqui mesmo.\n\nPor favor, aguarde!`, 1500);
                
                await notifyAdmin(userStates[userId], service);
                setSilentMode(userId); // Ativa 48h de silêncio
                return;
            }
        }

        // Tratamento de erro (só responde se não estiver silenciado)
        if (state !== 'START') {
            await chat.sendMessage(`⚠️ Opção inválida. Digite o *número* ou *Voltar*.`);
        }

    } catch (err) {
        console.error('Erro no loop:', err);
    }
});

client.initialize();
