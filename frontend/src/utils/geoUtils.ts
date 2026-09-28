/**
 * Reverse geocodes coordinates to a human-readable address.
 * Uses OpenStreetMap Nominatim with a short timeout and fallback.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const addr = data.address;
      if (addr) {
        const parts = [
          addr.suburb || addr.neighbourhood || addr.residential || addr.road,
          addr.city || addr.town || addr.village || addr.county || addr.state_district,
          addr.state,
        ].filter(Boolean);
        if (parts.length > 0) {
          return parts.join(', ');
        }
      }
      if (data.display_name) {
        return data.display_name.split(',').slice(0, 3).join(',');
      }
    }
  } catch {
    // Offline or request timed out
  }
  return `GPS Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
}
