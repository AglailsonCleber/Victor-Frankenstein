import fetch from 'isomorphic-unfetch';
import spotifyUrlInfo from 'spotify-url-info';

// ----------------------------------------------------------------------
// Função auxiliar: Resolver URLs do Spotify
// ----------------------------------------------------------------------

const { getData: getSpotifyData } = spotifyUrlInfo(fetch);

/**
 * Verifica se a query é uma URL de faixa do Spotify e, se for,
 * extrai os metadados para construir uma consulta de busca otimizada.
 * * @param {string} query A URL ou termo de busca fornecido pelo usuário.
 * @returns {Promise<{artist: string, title: string, query: string} | null>} 
 * Um objeto com informações da faixa ou null se não for um link do Spotify.
 */
export async function resolveSpotifyQuery(query) {
  // Expressão regular para verificar se é uma URL de faixa (track) do Spotify
  const spotifyTrackRegex =
    /^(https?:\/\/)?(open\.spotify\.com\/)(.*\/)?(track\/|spotify:track:)([a-zA-Z0-9]+)(\?.*)?$/;

  // Se for uma URL do Spotify, tenta obter os metadados
  if (spotifyTrackRegex.test(query)) {
    try {
      // Usa a biblioteca spotify-url-info para buscar os dados da faixa
      const info = await getSpotifyData(query);
      
      if (info && info.type === 'track') {
        const artists = info.artists.map((a) => a.name).join(', ');
        const title = info.name;
        
        // Constrói a query final que será usada no YouTube
        const trackTitle = `${artists} - ${title}`; 
        
        console.log(`[QUERY] 🔍 Consulta final resolvida: \"${trackTitle}\" (Fonte: Spotify)`);
        
        return { 
          artist: artists, 
          title: title, 
          query: trackTitle 
        };
      }
      return null;
    } catch (e) {
      console.error('❌ Erro ao resolver Spotify URL:', e.message);
      return null;
    }
  }
  
  // Retorna null se não for um link do Spotify
  return null;
}