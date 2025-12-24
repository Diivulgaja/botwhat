/**
 * Bot WhatsApp Profissional - Agência Divulga Já (Versão Blindada v4.0)
 * Correções: Erro de LID (Crash), Timeout 48h, Detecção Humana e Gatilhos de Anúncios.
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// ===========================================================
// ⚙️ CONFIGURAÇÕES (EDITE AQUI)
// ===========================================================
const ADMIN_NUMBER_RAW = '5548996689199'; 
const ADMIN_NUMBER = `${ADMIN_NUMBER_RAW}@c.us`;

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 Minutos (Reset por inatividade)
const SILENCE_TIMEOUT = 48 * 60 * 60 * 1000; // 48 HORAS (Bot fica mudo após intervenção/finalização)

// ===========================================================
// 🧠 MEMÓRIA E CLIENTE
// ===========================================================
const userStates = {}; 

const client = new Client({
    // Salva a sessão para não pedir QR Code ao reiniciar
    authStrategy: new LocalAuth({ clientId: "divulgaja-bot" }),
    
    // Configurações Otimizadas para Discloud/Docker
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

// ✅ CORREÇÃO DO ERRO DE "NO LID" AQUI
client.on('ready', () => {
    console.log(`✅ Bot ONLINE! Sistema pronto.`);

    // Aguarda 5 segundos para garantir que o WhatsApp carregou os contatos antes de tentar enviar mensagem
    setTimeout(async () => {
        try {
            // Verifica se o número do Admin é válido antes de enviar
            if (ADMIN_NUMBER_RAW.length > 10) {
                await client.sendMessage(ADMIN_NUMBER, '🚀 Bot Divulga Já iniciado com sucesso!\nModo: Produção (Discloud)');
                console.log('📨 Aviso enviado ao Admin.');
            }
        } catch (err) {
            // Se der erro ao avisar o admin, apenas loga no console e NÃO derruba o bot
            console.error('⚠️ Aviso: O bot está online, mas falhou ao enviar msg para o Admin (Erro LID/Contato). O funcionamento segue normal.');
        }
    }, 5000); 
});

client.on('disconnected', (reason) => {
    console.log('❌ Bot desconectado:', reason);
    client.initialize(); // Tenta reconectar automaticamente
});

// ===========================================================
// 🛠️ FUNÇÕES DE CONTROLE
// ===========================================================

// Ativa o modo silencioso (Bot para de responder)
const setSilentMode = (userId) => {
    userStates[userId] = { stage: 'SILENT', timestamp: Date.now() };
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
        console.error(`Erro ao enviar msg para ${chat.id._serialized}:`, err.message);
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
    } catch (e) { console.error('Erro notificando admin:', e.message); }
};

// ===========================================================
// 🤖 LÓGICA DE ATENDIMENTO
// ===========================================================
client.on('message_create', async (msg) => {
    try {
        // -----------------------------------------------------------
        // 🛑 1. DETECÇÃO DE INTERVENÇÃO HUMANA (VOCÊ FALANDO)
        // -----------------------------------------------------------
        if (msg.fromMe) {
            const targetId = msg.to; 
            // Se você mandou mensagem para um contato privado, o bot para de responder ele
            if (targetId.includes('@c.us')) {
                setSilentMode(targetId); 
                console.log(`👨‍💻 Intervenção humana detectada! Bot pausado para ${targetId}`);
            }
            return; // Encerra aqui
        }
        // -----------------------------------------------------------

        const chat = await msg.getChat();
        if (chat.isGroup) return; // Ignora grupos

        const userId = msg.from;
        const body = msg.body.trim();

        // 2. MODO SILENCIOSO (Verifica se está no castigo de 48h)
        if (userStates[userId] && userStates[userId].stage === 'SILENT') {
            
            // Comandos para reativar manualmente
            if (body.toLowerCase() === '#bot' || body.toLowerCase() === '#voltar') {
                resetUser(userId);
                return sendResponse(chat, '🤖 Bot reativado! Digite *Menu* para ver as opções.');
            }

            const timeInSilence = Date.now() - userStates[userId].timestamp;
            
            // Se ainda não passou 48h, o bot fica quieto
            if (timeInSilence < SILENCE_TIMEOUT) {
                return; 
            } else {
                // Passou 48h, reseta
                resetUser(userId);
            }
        }

        // 3. TIMEOUT DE INATIVIDADE (Cliente parou de responder)
        if (userStates[userId]) {
            const timeDiff = Date.now() - userStates[userId].timestamp;
            if (timeDiff > INACTIVITY_TIMEOUT && userStates[userId].stage !== 'START') {
                resetUser(userId); 
            }
        }

        // 4. IDENTIFICAÇÃO DO NOME
        let contactName = 'Visitante';
        try {
            const contact = await msg.getContact();
            contactName = contact.pushname || contact.name || contactName;
        } catch {}

        // Inicializa Estado
        if (!userStates[userId]) {
            userStates[userId] = { stage: 'START', timestamp: Date.now(), name: contactName, id: userId };
        } else {
            userStates[userId].timestamp = Date.now();
        }

        const state = userStates[userId].stage;

        // --- GATILHOS DE INÍCIO E ANÚNCIOS ---
        const triggers = [
            'oi', 'ola', 'olá', 'bom dia', 'boa tarde', 'boa noite', 'começar', 'menu',
            'olá, gostaria de mais informações', 
            'gostaria de mais informações',
            'tenho interesse',
            'como funciona',
            'quero saber mais'
        ];

        const isTrigger = triggers.some(t => body.toLowerCase().includes(t));

        if ((state === 'START' || isTrigger) && state !== 'SILENT') {
            userStates[userId].stage = 'MENU';
            return sendResponse(
                chat,
                `Olá, ${contactName}! 👋\n` +
                `Bem-vindo à *Agência Divulga Já*.\n\n` +
                `Recebemos seu contato! Como podemos alavancar seu negócio hoje?\n\n` +
                `1️⃣ *Quero Vender Mais* (Marketing)\n` +
                `2️⃣ *Site ou Sistema Novo*\n` +
                `3️⃣ *Consultoria Estratégica*\n` +
                `4️⃣ *Área do Cliente*\n` +
                `5️⃣ *Falar com Especialista*`
            );
        }

        // --- MENU PRINCIPAL ---
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
                    setSilentMode(userId); 
                    return;
                }
                userStates[userId].stage = options[body].stage;
                return sendResponse(chat, options[body].text);
            }
        }

        // --- FINALIZADORES (Submenus) ---
        if (['MARKETING', 'DEV', 'CONSULTORIA', 'CLIENTE'].includes(state)) {
            if (['1', '2', '3'].includes(body)) {
                let service = `${state} - Opção ${body}`;
                
                await sendResponse(chat, `Perfeito! Excelente escolha. 🎯`);
                await sendResponse(chat, `📝 Já notifiquei nossa equipe.\n\nUm especialista vai te chamar aqui mesmo em instantes.\n\nPor favor, aguarde!`, 1500);
                
                await notifyAdmin(userStates[userId], service);
                setSilentMode(userId); 
                return;
            }
        }

        // COMANDO VOLTAR
        if (['voltar', 'inicio', 'início'].includes(body.toLowerCase()) && state !== 'START') {
            userStates[userId].stage = 'MENU';
            return sendResponse(chat, `🔄 *Menu Principal:*\n\n1️⃣ Marketing Digital\n2️⃣ Sites e Sistemas\n3️⃣ Consultoria\n4️⃣ Já sou Cliente\n5️⃣ Falar com Humano`);
        }

        // TRATAMENTO DE OPÇÃO INVÁLIDA
        if (state !== 'START' && state !== 'SILENT') {
            await chat.sendMessage(`⚠️ Opção inválida. Digite o *número* da opção ou *Voltar*.`);
        }

    } catch (err) {
        console.error('Erro crítico no fluxo:', err);
    }
});

client.initialize();
