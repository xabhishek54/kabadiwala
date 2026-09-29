/**
 * Utility functions for Vernacular Formatting across English, Hindi, and Marathi.
 */

const devanagariDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

/**
 * Converts Western Arabic numerals (0-9) to Devanagari numerals (०-९) if Hindi or Marathi is selected.
 */
export function formatVernacularNumber(value: number | string | null | undefined, lang: string): string {
  if (value === null || value === undefined || value === '') return '';
  const str = String(value);
  if (lang === 'hi' || lang === 'mr') {
    return str.replace(/\d/g, (d) => devanagariDigits[parseInt(d, 10)]);
  }
  return str;
}

/**
 * Formats a currency value (e.g. ₹2,500) into vernacular numerals and symbol.
 */
export function formatVernacularCurrency(amount: number | string, lang: string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) || 0 : amount;
  const formattedEn = num.toLocaleString('en-IN', { maximumFractionDigits: 1 });
  const vernNumber = formatVernacularNumber(formattedEn, lang);
  return `₹${vernNumber}`;
}

/**
 * Returns localized role label for all account role types.
 */
export function getLocalizedRoleName(roleOrType: string, lang: string): string {
  switch (roleOrType) {
    case 'recycler':
      return lang === 'hi'
        ? 'सत्यापित रीसायकलर (Authorized Recycler)'
        : lang === 'mr'
        ? 'मपोप्रमं अधिकृत रीसायकलर (Authorized Recycler)'
        : 'MPCB Authorized Recycler';
    case 'shop':
      return lang === 'hi'
        ? 'दुकानदार (Shop Owner)'
        : lang === 'mr'
        ? 'दुकानाचा मालक (Shop Owner)'
        : 'Shop Owner';
    case 'sub_collector':
      return lang === 'hi'
        ? 'फेरीवाला (Feriwala Collector)'
        : lang === 'mr'
        ? 'दारोदारी फिरणारा फेरीवाला (Feriwala)'
        : 'Feriwala Collector';
    case 'independent':
    case 'collector':
    default:
      return lang === 'hi'
        ? 'स्वतंत्र कबाड़ीवाला (Independent Collector)'
        : lang === 'mr'
        ? 'स्वतंत्र कचरा संकलक (Independent Collector)'
        : 'Independent Collector';
  }
}
