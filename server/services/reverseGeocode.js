const defaultPhotonBaseUrl = 'https://photon.komoot.io';

export const reverseGeocode = async (lat, lon, fetchImpl = globalThis.fetch) => {
  const configuredBaseUrl = process.env.PHOTON_API_BASE_URL || defaultPhotonBaseUrl;
  const endpoint = new URL('reverse', `${configuredBaseUrl.replace(/\/+$/, '')}/`);
  endpoint.searchParams.set('lat', String(lat));
  endpoint.searchParams.set('lon', String(lon));
  endpoint.searchParams.set('lang', 'en');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  timeout.unref?.();

  try {
    const response = await fetchImpl(endpoint, {
      headers:{ Accept:'application/json', 'User-Agent':'PujaDecor/1.0 (address lookup)' },
      signal:controller.signal,
    });
    if (!response.ok) throw new Error('Location lookup service returned an error');

    const data = await response.json();
    const properties = data?.features?.[0]?.properties;
    if (!properties || typeof properties !== 'object') throw new Error('No address found for these coordinates');

    const streetParts = [properties.street, properties.locality, properties.suburb, properties.district]
      .filter((part, index, all) => typeof part === 'string' && part.trim() && all.indexOf(part) === index);
    const street = streetParts.join(', ') || properties.name || '';

    return {
      flatHouseNo:properties.housenumber || '',
      street,
      city:properties.city || properties.town || properties.village || properties.county || '',
      state:properties.state || '',
      zipCode:properties.postcode || '',
      country:properties.country || '',
    };
  } finally {
    clearTimeout(timeout);
  }
};
