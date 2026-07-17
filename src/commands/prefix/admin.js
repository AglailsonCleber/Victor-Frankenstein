import { 
    REST, 
    Routes, 
    PermissionFlagsBits 
} from 'discord.js';
import { collectCommands } from '../../utils/slashCommandCollector.js';
import { env } from '../../config/env.js';


// ====================================================================\r\n
// FUNÇÃO 1: DEPLOY (REGISTRAR) COMANDOS NA GUILD ATUAL (RÁPIDO)
// ====================================================================\r\n

/**
 * Registra os comandos de barra na Guilda onde o comando de prefixo foi enviado.
 * @param {import('discord.js').Message} message O objeto Message do comando.
 */
export async function deployGuildCommands(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.reply('❌ Você precisa de permissão de Administrador para usar este comando.');
    }

    // 1. Coleta os comandos de barra (/slash) usando o utilitário
    const collection = await collectCommands();
    if (!collection.success) {
         // Responde ao canal com a mensagem de erro da função utilitária
         return message.reply(collection.message);
    } 
    const commands = collection.commands;

    // 2. Registra na API
    const rest = new REST().setToken(env.discordToken());

    try {
        await message.channel.send(`🚀 Iniciando o registro de **${commands.length}** comandos de barra (/) no servidor **${message.guild.name}**...`);

        const data = await rest.put(
            Routes.applicationGuildCommands(env.applicationId(), message.guildId),
            { body: commands },
        );

        await message.channel.send('✅ Sucesso! Comandos registrados. Devem estar disponíveis em segundos.');
    } catch (error) {
        console.error('❌ Erro ao registrar comandos de servidor:', error);
        await message.channel.send('❌ Erro ao comunicar com a API do Discord para registro de Guilda.');
    }
}


// ====================================================================\r\n
// FUNÇÃO 3: DEPLOY (REGISTRAR) COMANDOS GLOBAIS (LENTO)
// ====================================================================\r\n

/**
 * Registra os comandos de barra globalmente. (Demora até 1 hora para aparecer)
 * @param {import('discord.js').Message} message O objeto Message do comando.
 */
export async function deployGlobalCommands(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.reply('❌ Você precisa de permissão de Administrador para usar este comando.');
    }

    // 1. Coleta os comandos de barra (/slash)
    const collection = await collectCommands();
    if (!collection.success) {
         return message.reply(collection.message);
    } 
    const commands = collection.commands;

    // 2. Registra na API
    const rest = new REST().setToken(env.discordToken());

    try {
        await message.channel.send(`🌐 Iniciando o registro de **${commands.length}** comandos de barra (/) GLOBAIS do seu bot...`);

        const data = await rest.put(
            Routes.applicationCommands(env.applicationId()), // Rota Global para toda a aplicação
            { body: commands },
        );

        await message.channel.send('✅ Sucesso! Comandos Globais registrados. **Pode levar até 1 hora para aparecer.**');
    } catch (error) {
        console.error('❌ Erro ao registrar comandos globais:', error);
        await message.channel.send('❌ Erro ao comunicar com a API do Discord para registro global.');
    }
}

// ====================================================================
// FUNÇÃO 3: DELETAR APENAS COMANDOS DO BOT NO SERVIDOR (GUILD)
// ====================================================================

export async function deleteGuildCommands(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.reply('❌ Você precisa de permissão de Administrador para usar este comando.');
    }
    
    if (!message.guild) {
        return message.reply('❌ Este comando só pode ser usado em um servidor (Guild).');
    }

    const rest = new REST().setToken(env.discordToken());
    const guildId = message.guild.id; 

    try {
        await message.channel.send(`🗑️ Iniciando a exclusão dos comandos de barra (/) do seu bot neste servidor: \`${message.guild.name}\`...`);

        await rest.put(
            Routes.applicationGuildCommands(env.applicationId(), guildId),
            { body: [] },
        );

        await message.channel.send('✅ Sucesso! Comandos de barra (/) do seu bot foram excluídos deste servidor.');
    } catch (error) {
        console.error('❌ Erro ao deletar comandos do servidor:', error);
        await message.channel.send('❌ Erro ao comunicar com a API do Discord para exclusão.');
    }
}

// ====================================================================
// FUNÇÃO 4: DELETAR APENAS OS COMANDOS GLOBAIS DO BOT (CLIENT)
// ====================================================================

export async function deleteGlobalCommands(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.reply('❌ Você precisa de permissão de Administrador para usar este comando.');
    }

    const rest = new REST().setToken(env.discordToken());

    try {
        await message.channel.send('🗑️ Iniciando a exclusão dos comandos de barra (/) GLOBAIS do seu bot...');

        // Rota para comandos de aplicação (globais) com corpo vazio
        await rest.put(
            Routes.applicationCommands(env.applicationId()),
            { body: [] },
        );

        await message.channel.send('✅ Sucesso! Comandos Globais do seu bot foram excluídos.');
    } catch (error) {
        console.error('❌ Erro ao deletar comandos globais:', error);
        await message.channel.send('❌ Erro ao comunicar com a API do Discord para exclusão global.');
    }
}

// ====================================================================\r\n
// EXPORTAÇÃO (Comando de Prefixo)
// ====================================================================\r\n

// Exporta as propriedades principais do comando de prefixo
export const data = {
    name: 'admin',
    description: 'Comandos administrativos para deploy/delete de comandos de barra.',
};

/**
 * Função principal que é chamada pelo messageCreate.js (embora a lógica de execução
 * dos subcomandos como `!deploy-guild-commands` esteja lá).
 * @param {import('discord.js').Message} message O objeto Message do comando.
 * @param {string[]} args Os argumentos do comando (não usados aqui).
 */
export async function execute(message, args) {
    // Esta função é redundante se a lógica de switch/case em messageCreate.js for usada.
    // Ela serve apenas como fallback e documentação.
    message.reply({ 
        content: '**Comandos Administrativos de Deploy/Delete:**\n' +
                 '• `!deploy-guild-commands`\n' +
                 '• `!delete-guild-commands`\n' +
                 '• `!deploy-global-commands` (⚠️ Demora até 1h)\n' +
                 '• `!delete-global-commands`' 
    });
}