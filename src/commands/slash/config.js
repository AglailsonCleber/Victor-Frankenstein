import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
} from 'discord.js';
import axios from 'axios';
import {
    clearGuildConfig,
    getEffectiveApiConfig,
    getGuildConfig,
    maskSecret,
    setGuildConfig,
} from '../../services/guildConfigStore.js';
import { invalidateGenreCache } from '../../services/api_tmdb.js';
import { clearGuildSessions } from '../../services/api_gemini.js';

export const data = new SlashCommandBuilder()
    .setName('config')
    .setDescription('Configura as API keys deste servidor (apenas administradores).')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
        sub.setName('ver').setDescription('Mostra a configuração atual (valores mascarados).')
    )
    .addSubcommand((sub) =>
        sub
            .setName('definir')
            .setDescription('Define uma API key para este servidor.')
            .addStringOption((option) =>
                option
                    .setName('servico')
                    .setDescription('Serviço a configurar')
                    .setRequired(true)
                    .addChoices(
                        { name: 'TMDB', value: 'tmdb' },
                        { name: 'Gemini', value: 'gemini' }
                    )
            )
            .addStringOption((option) =>
                option
                    .setName('chave')
                    .setDescription('Token ou API key do serviço')
                    .setRequired(true)
            )
    )
    .addSubcommand((sub) =>
        sub
            .setName('limpar')
            .setDescription('Remove as API keys configuradas neste servidor.')
            .addStringOption((option) =>
                option
                    .setName('servico')
                    .setDescription('Serviço a limpar (vazio = todos)')
                    .addChoices(
                        { name: 'TMDB', value: 'tmdb' },
                        { name: 'Gemini', value: 'gemini' },
                        { name: 'Todos', value: 'all' }
                    )
            )
    )
    .addSubcommand((sub) =>
        sub.setName('testar').setDescription('Testa as API keys configuradas neste servidor.')
    );

export async function execute(interaction) {
    const guildId = interaction.guildId;
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'ver') {
        const effective = await getEffectiveApiConfig(guildId);
        const guildOnly = await getGuildConfig(guildId);

        const embed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setTitle('Configuração do servidor')
            .setDescription(
                'Keys definidas aqui têm prioridade sobre as keys globais do bot (.env).'
            )
            .addFields(
                {
                    name: 'TMDB Bearer Token',
                    value: `${maskSecret(effective.tmdbBearerToken)} ${guildOnly.tmdbBearerToken ? '(servidor)' : '(global/padrão)'}`,
                    inline: false,
                },
                {
                    name: 'Google Gemini API Key',
                    value: `${maskSecret(effective.googleApiKey)} ${guildOnly.googleApiKey ? '(servidor)' : '(global/padrão)'}`,
                    inline: false,
                },
                {
                    name: 'Idioma TMDB / Região',
                    value: `${effective.tmdbLanguage} / ${effective.tmdbWatchRegion}`,
                    inline: true,
                },
                {
                    name: 'Modelo Gemini',
                    value: effective.geminiModelName,
                    inline: true,
                }
            );

        return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (subcommand === 'definir') {
        const service = interaction.options.getString('servico');
        const value = interaction.options.getString('chave').trim();

        if (!value) {
            return interaction.reply({
                content: '❌ Informe uma chave válida.',
                ephemeral: true,
            });
        }

        if (service === 'tmdb') {
            await setGuildConfig(guildId, { tmdbBearerToken: value });
            invalidateGenreCache(guildId);
        } else {
            await setGuildConfig(guildId, { googleApiKey: value });
            clearGuildSessions(guildId);
        }

        return interaction.reply({
            content: `✅ ${service === 'tmdb' ? 'TMDB' : 'Gemini'} configurado para este servidor.`,
            ephemeral: true,
        });
    }

    if (subcommand === 'limpar') {
        const service = interaction.options.getString('servico') ?? 'all';

        if (service === 'all') {
            await clearGuildConfig(guildId);
            clearGuildSessions(guildId);
            invalidateGenreCache(guildId);
            return interaction.reply({
                content: '✅ Configuração local do servidor removida. O bot usará apenas keys globais, se existirem.',
                ephemeral: true,
            });
        }

        const keys = service === 'tmdb' ? ['tmdbBearerToken'] : ['googleApiKey'];
        await clearGuildConfig(guildId, keys);

        if (service === 'tmdb') {
            invalidateGenreCache(guildId);
        } else {
            clearGuildSessions(guildId);
        }

        return interaction.reply({
            content: `✅ Configuração de ${service.toUpperCase()} removida deste servidor.`,
            ephemeral: true,
        });
    }

    if (subcommand === 'testar') {
        await interaction.deferReply({ ephemeral: true });
        const config = await getEffectiveApiConfig(guildId);
        const results = [];

        if (config.tmdbBearerToken) {
            try {
                await axios.get('https://api.themoviedb.org/3/configuration', {
                    headers: { Authorization: `Bearer ${config.tmdbBearerToken}` },
                });
                results.push('✅ TMDB: OK');
            } catch {
                results.push('❌ TMDB: falhou — verifique o token Bearer v4');
            }
        } else {
            results.push('⚠️ TMDB: não configurado');
        }

        if (config.googleApiKey) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${config.googleApiKey}`;
                await axios.get(url);
                results.push('✅ Gemini: OK');
            } catch {
                results.push('❌ Gemini: falhou — verifique a API key');
            }
        } else {
            results.push('⚠️ Gemini: não configurado');
        }

        return interaction.editReply({ content: results.join('\n') });
    }
}
