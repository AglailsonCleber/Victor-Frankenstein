import fetch from 'isomorphic-unfetch';
import spotifyUrlInfo from 'spotify-url-info';

// ----------------------------------------------------------------------
// Função auxiliar: Resolver URLs do Spotify
// ----------------------------------------------------------------------

const { getData: getSpotifyData } = spotifyUrlInfo(fetch);

export async function resolveSpotifyQuery(query) {
  const spotifyTrackRegex =
    /^(https?:\/\/)?(open\.spotify\.com\/)(.*\/)?(track\/|spotify:track:)([a-zA-Z0-9]+)(\?.*)?$/;

  // Se for uma URL do Spotify, tenta obter os metadados
  if (spotifyTrackRegex.test(query)) {
    try {
      const info = await getSpotifyData(query);
      if (info && info.type === 'track') {
        const artists = info.artists.map((a) => a.name).join(', ');
        const title = info.name;
        const trackTitle = `${artists} - ${title}`;
        return { artist: artists, title: title, query: trackTitle };
      }
      return null;
    } catch (e) {
      console.error('❌ Erro ao resolver Spotify URL:', e.message);
      return null;
    }
  }
  return null;
}