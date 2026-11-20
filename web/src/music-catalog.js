// Single music-system catalog for the Studio UI; Python reads the exact same JSON.
let catalogPromise;
export function loadMusicSystems() {
  if (!catalogPromise) {
    catalogPromise = fetch('./music-systems.json', {cache:'no-cache'}).then(async response => {
      if (!response.ok) throw Error('Could not load musical systems');
      const catalog = await response.json();
      if (!Array.isArray(catalog.systems) || !Array.isArray(catalog.tonics) ||
          !catalog.systems.some(system => system.id === 'iranian') ||
          !catalog.systems.some(system => system.id === 'western')) {
        throw Error('Invalid musical systems catalog');
      }
      return catalog;
    }).catch(error => {catalogPromise = null;throw error;});
  }
  return catalogPromise;
}
