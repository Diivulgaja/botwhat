/**
 * Bot WhatsApp Profissional - Agência Divulga Já (Versão Final)
 * Funcionalidades: Menu, Persistência, Notificação Admin e Modo Silencioso com Garantia.
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// ===========================================================
// ⚙️ CONFIGURAÇÕES (EDITE AQUI)
// ===========================================================
const ADMIN_NUMBER = '5548996689199@c.us'; // <--- COLOQUE SEU NÚMERO AQUI (DDD + NÚMERO)
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 Minutos para resetar se o cliente sumir
const SILENCE_TIMEOUT = 24 * 60 * 60 * 1000; // 24 Horas que o bot fica mudo após finalizar

// ===========================================================
// 🧠 MEMÓRIA E CLIENTE
// ===========================================================
const userStates = {}; 

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        // Configurações otimizadas para Docker/VPS (Railway/Square Cloud)
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    }
});

// Eventos de Conexão
client.on('qr', (qr) => {
    console.log('📲 QR Code gerado! Escaneie abaixo:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ Bot ONLINE e pronto para atendimento!');
});

// ===========================================================
// 🛠️ FUNÇÕES AUXILIARES
// ===========================================================

// Ativa o Modo Silencioso (Handoff para Humano)
const setSilentMode = (userId) => {
    userStates[userId] = { 
        stage: 'SILENT', 
        timestamp: Date.now() 
    };
    console.log(`🔇 Modo silencioso ativado para: ${userId}`);
};

// Reseta o usuário (apaga a memória dele)
const resetUser = (userId) => {
    delete userStates[userId];
};

// Envia mensagem com delay simulando digitação
const sendResponse = async (chat, text, delay = 1500) => {
    try {
        await chat.sendStateTyping();
        return new Promise(resolve => setTimeout(async () => {
            await chat.sendMessage(text);
            resolve();
        }, delay));
    } catch (err) {
        console.error('Erro ao enviar mensagem:', err);
    }
};

// Notifica o dono do bot (Admin)
const notifyAdmin = async (clientData, resumo) => {
    const text = `🚨 *NOVO LEAD (AÇÃO NECESSÁRIA)* 🚨\n\n` +
                 `👤 *Nome:* ${clientData.name}\n` +
                 `📱 *Link:* https://wa.me/${clientData.id.replace('@c.us', '')}\n` +
                 `📂 *Assunto:* ${resumo}\n` +
                 `⚠️ *Bot:* Entrou em modo silencioso. O cliente está aguardando!`;
    
    try {
        await client.sendMessage(ADMIN_NUMBER, text);
    } catch (e) {
        console.error('Erro ao notificar admin:', e);
    }
};

// ===========================================================
// 🤖 LÓGICA DE ATENDIMENTO
// ===========================================================
client.on('message_create', async (msg) => {
    try {
        if (msg.fromMe) return; // Ignora mensagens enviadas por você
        const chat = await msg.getChat();
        if (chat.isGroup) return; // Ignora grupos

        const userId = msg.from;
        const body = msg.body.trim();

        // -----------------------------------------------------------
        // 🔒 VERIFICAÇÃO DE MODO SILENCIOSO
        // -----------------------------------------------------------
        if (userStates[userId] && userStates[userId].stage === 'SILENT') {
            const timeInSilence = Date.now() - userStates[userId].timestamp;
            
            // Comando secreto para reativar o bot manualmente: #bot
            if (body.toLowerCase() === '#bot') {
                resetUser(userId);
                return sendResponse(chat, '🤖 Bot reativado! Como posso ajudar?');
            }

            // Se ainda está no tempo de silêncio, o bot ignora a mensagem
            if (timeInSilence < SILENCE_TIMEOUT) {
                return; 
            } else {
                // Se passou 24h, o bot volta a funcionar
                resetUser(userId);
            }
        }
        // -----------------------------------------------------------

        // Verifica Inatividade (Timeout)
        if (userStates[userId]) {
            const timeDiff = Date.now() - userStates[userId].timestamp;
            if (timeDiff > INACTIVITY_TIMEOUT) {
                resetUser(userId); // Reseta silenciosamente para recomeçar do zero na próxima
            }
        }

        // Identifica o nome do contato
        let contactName = 'Visitante';
        try {
            const contact = await msg.getContact();
            contactName = contact.pushname || contact.name || contactName;
        } catch {}

        // Inicializa ou atualiza o estado do usuário
        if (!userStates[userId]) {
            userStates[userId] = { stage: 'START', timestamp: Date.now(), name: contactName, id: userId };
        } else {
            userStates[userId].timestamp = Date.now();
        }

        const state = userStates[userId].stage;

        // Comando Voltar Global
        if (body.toLowerCase() === 'voltar' && state !== 'START') {
            userStates[userId].stage = 'MENU';
            return sendResponse(chat, `🔄 *Menu Principal:*\n\n1️⃣ Marketing Digital\n2️⃣ Sites e Sistemas\n3️⃣ Consultoria\n4️⃣ Já sou Cliente\n5️⃣ Falar com Humano`);
        }

        // ===========================================================
        // 🟢 FLUXO DE CONVERSA
        // ===========================================================

        // ESTÁGIO 0: BOAS-VINDAS
        if (state === 'START' || ['oi', 'ola', 'olá', 'menu', 'ajuda'].includes(body.toLowerCase())) {
            userStates[userId].stage = 'MENU';
            return sendResponse(
                chat,
                `Olá, ${contactName}! 👋\n` +
                `Bem-vindo à *Agência Divulga Já*.\n\n` +
                `Como podemos alavancar seu negócio hoje?\n\n` +
                `1️⃣ *Quero Vender Mais* (Marketing)\n` +
                `2️⃣ *Site ou Sistema Novo*\n` +
                `3️⃣ *Consultoria Estratégica*\n` +
                `4️⃣ *Já sou Cliente*\n` +
                `5️⃣ *Falar com Especialista*`
            );
        }

        // ESTÁGIO 1: MENU PRINCIPAL
        if (state === 'MENU') {
            if (body === '1') {
                userStates[userId].stage = 'MARKETING';
                return sendResponse(chat, `🚀 *Marketing Digital*\n\nQual o alcance do seu negócio?\n\n1️⃣ Negócio Local (Cidade/Bairro)\n2️⃣ Online (E-commerce/Infoproduto)\n\n(Digite *Voltar* para o menu)`);
            }
            if (body === '2') {
                userStates[userId].stage = 'DEV';
                return sendResponse(chat, `💻 *Desenvolvimento*\n\nO que você precisa?\n\n1️⃣ Site Institucional\n2️⃣ Loja Virtual\n3️⃣ Sistema ou App\n\n(Digite *Voltar* para o menu)`);
            }
            if (body === '3') {
                userStates[userId].stage = 'CONSULTORIA';
                return sendResponse(chat, `📊 *Consultoria*\n\nQual o maior desafio?\n\n1️⃣ Falta de Clientes\n2️⃣ Organização e Processos\n\n(Digite *Voltar* para o menu)`);
            }
            if (body === '4') {
                userStates[userId].stage = 'CLIENTE';
                return sendResponse(chat, `🤝 *Área do Cliente*\n\n1️⃣ Financeiro / 2ª Via\n2️⃣ Suporte Técnico\n\n(Digite *Voltar* para o menu)`);
            }
            if (body === '5') {
                // HUMANO DIRETO (Opção 5)
                await sendResponse(chat, `🔔 *CHAMANDO ATENDENTE...*`);
                await sendResponse(chat, `✅ *Pronto! Notificação enviada.*\n\nUm de nossos especialistas já viu seu chamado e vai te responder *AGORA MESMO*.\n\nPor favor, aguarde um instante...`, 2000);
                
                await notifyAdmin(userStates[userId], '🚨 Solicitou Humano com URGÊNCIA');
                setSilentMode(userId); 
                return;
            }
        }

        // ESTÁGIO 2: FINALIZAÇÕES E GARANTIA

        // --- MARKETING ---
        if (state === 'MARKETING' && ['1', '2'].includes(body)) {
            const tipo = body === '1' ? 'Local' : 'Online';
            
            await sendResponse(chat, `Entendido. Marketing ${tipo} é nossa especialidade. 🎯`);
            await sendResponse(chat, `🚨 *ATENÇÃO: Já avisei a equipe!*\n\nSeparei seu atendimento com *PRIORIDADE*. Um consultor está analisando seu perfil agora e vai te chamar em instantes.\n\nFique atento aqui no chat!`, 2000);
            
            await notifyAdmin(userStates[userId], `Marketing - ${tipo} (PRIORIDADE)`);
            setSilentMode(userId);
            return;
        }

        // --- DEV (SITES/SISTEMAS) ---
        if (state === 'DEV' && ['1', '2', '3'].includes(body)) {
            const itens = {'1': 'Site', '2': 'Loja Virtual', '3': 'Sistema'};
            
            await sendResponse(chat, `Ótima escolha! Temos cases incríveis de ${itens[body]}.`);
            await sendResponse(chat, `✅ *Solicitação Confirmada!*\n\nNosso gerente de projetos acabou de receber seu contato. Ele vai te responder *agora* para pegar mais detalhes.\n\nNão feche a conversa, ok?`, 2000);
            
            await notifyAdmin(userStates[userId], `Dev - ${itens[body]} (PRIORIDADE)`);
            setSilentMode(userId);
            return;
        }

        // --- CONSULTORIA ---
        if (state === 'CONSULTORIA' && ['1', '2'].includes(body)) {
            await sendResponse(chat, `Certo. Vamos organizar isso.`);
            await sendResponse(chat, `🔔 *Consultor Acionado.*\n\nEnviei um alerta para o especialista de plantão. Ele entrará na conversa em breve para te orientar.\n\nAguarde um momento...`, 2000);
            
            await notifyAdmin(userStates[userId], `Consultoria - Opção ${body}`);
            setSilentMode(userId);
            return;
        }

        // --- CLIENTE (SUPORTE) ---
        if (state === 'CLIENTE' && ['1', '2'].includes(body)) {
            const setor = body === '1' ? 'Financeiro' : 'Suporte Técnico';
            
            await sendResponse(chat, `Entendido.`);
            await sendResponse(chat, `🎟️ *Ticket Aberto: ${setor}*\n\nA equipe responsável já está com seu contato na tela. Em instantes alguém fala com você para resolver.\n\nObrigado por aguardar!`, 2000);
            
            await notifyAdmin(userStates[userId], `Cliente - ${setor}`);
            setSilentMode(userId);
            return;
        }

        // SE NÃO ENTENDEU A OPÇÃO
        if (state !== 'START' && state !== 'SILENT') {
            await chat.sendMessage(`⚠️ Opção inválida. Por favor, digite apenas o *número* da opção desejada.`);
        }

    } catch (err) {
        console.error('Erro crítico:', err);
    }
});

// Inicialização
client.initialize().catch(err => console.error('Erro de inicialização:', err));
