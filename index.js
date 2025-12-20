/**
 * Bot WhatsApp Profissional - Agência Divulga Já
 * Com controle de estado de conversa (SEM IA)
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// =====================
// MEMÓRIA DE CONVERSA
// =====================
const userStates = {};

// =====================
// CLIENTE WHATSAPP
// =====================
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null, // Usa o Chrome do Docker se existir
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage', // Importante para evitar erro de memória
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process', 
            '--disable-gpu'
        ]
    }
});


// =====================
// EVENTOS DE CONEXÃO
// =====================
client.on('qr', (qr) => {
    console.log('📲 Escaneie o QR Code abaixo:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ WhatsApp conectado! Bot ONLINE.');
});

// =====================
// FUNÇÃO AUXILIAR
// =====================
const sendProfessionalResponse = async (chat, content, delay = 1200) => {
    await chat.sendStateTyping();
    setTimeout(async () => {
        await chat.sendMessage(content);
    }, delay);
};

// =====================
// LISTENER DE MENSAGENS
// =====================
client.on('message_create', async (msg) => {
    try {
        if (msg.fromMe) return;

        const chat = await msg.getChat();
        if (chat.isGroup) return;

        const messageBody = msg.body.toLowerCase().trim();
        console.log('📩 Mensagem recebida:', messageBody);

        let contactName = 'parceiro(a)';
        try {
            const contact = await msg.getContact();
            const fullName = contact.pushname || contact.name || '';
            if (fullName) contactName = fullName.split(' ')[0];
        } catch {}

        // =====================
        // MENU PRINCIPAL
        // =====================
        if (['oi', 'ola', 'olá', 'bom dia', 'boa tarde', 'boa noite', 'menu', 'ajuda'].includes(messageBody)) {
            userStates[msg.from] = { stage: 'menu' };

            return sendProfessionalResponse(
                chat,
                `Olá, ${contactName}! 👋\n\n` +
                `Bem-vindo à *Agência Divulga Já*.\n\n` +
                `Como podemos te ajudar hoje?\n\n` +
                `1️⃣ Quero divulgar meu negócio (Marketing Digital)\n` +
                `2️⃣ Quero criar ou melhorar um site / sistema\n` +
                `3️⃣ Quero uma consultoria estratégica\n` +
                `4️⃣ Já sou cliente\n` +
                `5️⃣ Falar com um especialista`,
                1000
            );
        }

        // =====================
        // OPÇÃO 1 - MARKETING
        // =====================
        if (messageBody === '1' && userStates[msg.from]?.stage === 'menu') {
            userStates[msg.from] = { stage: 'marketing' };

            return sendProfessionalResponse(
                chat,
                `🚀 Perfeito, ${contactName}!\n\n` +
                `Ajudamos empresas a atrair mais clientes e vender todos os dias.\n\n` +
                `Seu negócio é:\n` +
                `1️⃣ Local (cidade/bairro)\n` +
                `2️⃣ Online\n` +
                `3️⃣ Ambos`
            );
        }

        // MARKETING - RESPOSTAS
        if (userStates[msg.from]?.stage === 'marketing' && ['1','2','3'].includes(messageBody)) {
            userStates[msg.from] = { stage: 'final' };

            return sendProfessionalResponse(
                chat,
                `Excelente, ${contactName}! ✅\n\n` +
                `Com base no seu perfil, um especialista vai entrar em contato para montar a melhor estratégia para você.`
            );
        }

        // =====================
        // OPÇÃO 2 - SITE / SISTEMA
        // =====================
        if (messageBody === '2' && userStates[msg.from]?.stage === 'menu') {
            userStates[msg.from] = { stage: 'site_menu' };

            return sendProfessionalResponse(
                chat,
                `💻 Ótima escolha, ${contactName}!\n\n` +
                `Trabalhamos com:\n` +
                `• Sites profissionais\n` +
                `• Lojas virtuais\n` +
                `• Sistemas sob medida\n` +
                `• Automações (WhatsApp, bots)\n\n` +
                `O que você precisa no momento?\n` +
                `1️⃣ Site institucional\n` +
                `2️⃣ Loja virtual\n` +
                `3️⃣ Sistema personalizado\n` +
                `4️⃣ Ainda não sei`
            );
        }

        // SITE / SISTEMA - RESPOSTAS
        if (userStates[msg.from]?.stage === 'site_menu' && ['1','2','3','4'].includes(messageBody)) {
            userStates[msg.from] = { stage: 'final' };

            const respostas = {
                '1': 'Perfeito! Vamos criar um site profissional para fortalecer sua presença online.',
                '2': 'Excelente escolha! Criamos lojas virtuais completas e prontas para vender.',
                '3': 'Ótima decisão! Desenvolvemos sistemas sob medida para o seu negócio.',
                '4': 'Sem problema! Um especialista vai te ajudar a definir a melhor solução.'
            };

            return sendProfessionalResponse(
                chat,
                `👌 ${respostas[messageBody]}\n\n` +
                `Nossa equipa entrará em contato em breve para alinhar os detalhes.`
            );
        }

        // =====================
        // OPÇÃO 3 - CONSULTORIA
        // =====================
        if (messageBody === '3' && userStates[msg.from]?.stage === 'menu') {
            userStates[msg.from] = { stage: 'consultoria' };

            return sendProfessionalResponse(
                chat,
                `📊 Excelente, ${contactName}!\n\n` +
                `Nossa consultoria ajuda a organizar processos e melhorar resultados.\n\n` +
                `Qual é seu maior desafio hoje?\n` +
                `1️⃣ Poucas vendas\n` +
                `2️⃣ Falta de clientes\n` +
                `3️⃣ Negócio desorganizado\n` +
                `4️⃣ Outro`
            );
        }

        // CONSULTORIA - RESPOSTAS
        if (userStates[msg.from]?.stage === 'consultoria' && ['1','2','3','4'].includes(messageBody)) {
            userStates[msg.from] = { stage: 'final' };

            return sendProfessionalResponse(
                chat,
                `Obrigado por compartilhar, ${contactName}! 👍\n\n` +
                `Com essa informação, um consultor da nossa equipa entrará em contato para te orientar da melhor forma.`
            );
        }

        // =====================
        // OPÇÃO 4 - JÁ SOU CLIENTE
        // =====================
        if (messageBody === '4' && userStates[msg.from]?.stage === 'menu') {
            userStates[msg.from] = { stage: 'cliente' };

            return sendProfessionalResponse(
                chat,
                `🤝 Perfeito, ${contactName}!\n\n` +
                `Escolha uma opção:\n` +
                `1️⃣ Suporte técnico\n` +
                `2️⃣ Financeiro\n` +
                `3️⃣ Alterações em projeto`
            );
        }

        if (userStates[msg.from]?.stage === 'cliente' && ['1','2','3'].includes(messageBody)) {
            userStates[msg.from] = { stage: 'final' };

            return sendProfessionalResponse(
                chat,
                `Certo! 📌\n\n` +
                `Nossa equipa responsável já foi avisada e entrará em contato com você em breve.`
            );
        }

        // =====================
        // OPÇÃO 5 - HUMANO
        // =====================
        if (messageBody === '5' && userStates[msg.from]?.stage === 'menu') {
            userStates[msg.from] = { stage: 'final' };

            return sendProfessionalResponse(
                chat,
                `👤 Perfeito, ${contactName}!\n\n` +
                `Você será atendido por um especialista da *Agência Divulga Já* em instantes.`
            );
        }

    } catch (err) {
        console.error('❌ Erro ao processar mensagem:', err);
    }
});

// =====================
// INICIALIZAÇÃO
// =====================
client.initialize().catch(err => {
    console.error('❌ Falha ao inicializar:', err);
});
