// Nepali Number to Words Converter (रुपैयाँ तथा पैसा)

const ONES: { [key: number]: string } = {
  0: 'शून्य', 1: 'एक', 2: 'दुई', 3: 'तीन', 4: 'चार', 5: 'पाँच',
  6: 'छ', 7: 'सात', 8: 'आठ', 9: 'नौ', 10: 'दश',
  11: 'एघार', 12: 'बाह्र', 13: 'तेह्र', 14: 'चौध', 15: 'पन्ध्र',
  16: 'सोह्र', 17: 'सत्र', 18: 'अठार', 19: 'उन्नाइस', 20: 'बीस',
  21: 'एक्काइस', 22: 'बाइस', 23: 'तेइस', 24: 'चौविस', 25: 'पच्चिस',
  26: 'छब्बीस', 27: 'सत्ताइस', 28: 'अठ्ठाइस', 29: 'उनन्तिस', 30: 'तीस',
  31: 'एकत्तिस', 32: 'बत्तीस', 33: 'तेत्तीस', 34: 'चौंतीस', 35: 'पैंतीस',
  36: 'छत्तीस', 37: 'सैंतीस', 38: 'अठतीस', 39: 'उनन्चालीस', 40: 'चालीस',
  41: 'एकचालीस', 42: 'बयालीस', 43: 'त्रिचालीस', 44: 'चवालीस', 45: 'पैंतालीस',
  46: 'छयालीस', 47: 'सतचालीस', 48: 'अठचालीस', 49: 'उनपचास', 50: 'पचास',
  51: 'एकाउन्न', 52: 'बाउन्न', 53: 'त्रिपन्न', 54: 'चौवन्न', 55: 'पचपन्न',
  56: 'छपन्न', 57: 'सन्ताउन्न', 58: 'अन्ठाउन्न', 59: 'उनन्साठी', 60: 'साठी',
  61: 'एकसट्ठी', 62: 'बाइसट्ठी', 63: 'त्रिसट्ठी', 64: 'चौंसट्ठी', 65: 'पैंसट्ठी',
  66: 'छयसट्ठी', 67: 'सतसट्ठी', 68: 'अठसट्ठी', 69: 'उनन्सत्तरी', 70: 'सत्तरी',
  71: 'एकहत्तर', 72: 'बहत्तर', 73: 'त्रिहत्तर', 74: 'चौहत्तर', 75: 'पचहत्तर',
  76: 'छयहत्तर', 77: 'सतहत्तर', 78: 'अठहत्तर', 79: 'उनासी', 80: 'असी',
  81: 'एकासी', 82: 'बयासी', 83: 'त्रियासी', 84: 'चौरासी', 85: 'पचासी',
  86: 'छयासी', 87: 'सतासी', 88: 'अठासी', 89: 'उनान्नब्बे', 90: 'नब्बे',
  91: 'एकान्नब्बे', 92: 'बयान्नब्बे', 93: 'त्रियान्नब्बे', 94: 'चौरान्नब्बे', 95: 'पंचान्नब्बे',
  96: 'छयान्नब्बे', 97: 'सन्तान्नब्बे', 98: 'अन्ठान्नब्बे', 99: 'उनान्सय',
};

function convertTwoDigits(n: number): string {
  if (n === 0) return '';
  return ONES[n] || String(n);
}

export function numberToNepaliWords(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num) || num === 0) return 'शून्य रुपैयाँ मात्र';

  const parts = Math.abs(num).toFixed(2).split('.');
  let rupees = parseInt(parts[0], 10);
  const paisa = parseInt(parts[1], 10);

  if (rupees === 0 && paisa === 0) return 'शून्य रुपैयाँ मात्र';

  const resultWords: string[] = [];

  // Arab (1,00,00,00,000)
  if (rupees >= 1000000000) {
    const arab = Math.floor(rupees / 1000000000);
    resultWords.push(`${convertTwoDigits(arab)} अरब`);
    rupees %= 1000000000;
  }

  // Crore (1,00,00,000)
  if (rupees >= 10000000) {
    const crore = Math.floor(rupees / 10000000);
    resultWords.push(`${convertTwoDigits(crore)} करोड`);
    rupees %= 10000000;
  }

  // Lakh (1,00,000)
  if (rupees >= 100000) {
    const lakh = Math.floor(rupees / 100000);
    resultWords.push(`${convertTwoDigits(lakh)} लाख`);
    rupees %= 100000;
  }

  // Thousand (1,000)
  if (rupees >= 1000) {
    const thousand = Math.floor(rupees / 1000);
    resultWords.push(`${convertTwoDigits(thousand)} हजार`);
    rupees %= 1000;
  }

  // Hundred (100)
  if (rupees >= 100) {
    const hundred = Math.floor(rupees / 100);
    resultWords.push(`${convertTwoDigits(hundred)} सय`);
    rupees %= 100;
  }

  // Remaining 1-99
  if (rupees > 0) {
    resultWords.push(convertTwoDigits(rupees));
  }

  let finalStr = '';
  if (resultWords.length > 0) {
    finalStr = resultWords.join(' ') + ' रुपैयाँ';
  }

  // Paisa
  if (paisa > 0) {
    finalStr += (finalStr ? ' ' : '') + `पैसा ${convertTwoDigits(paisa)}`;
  }

  return finalStr ? `${finalStr} मात्र` : 'शून्य रुपैयाँ मात्र';
}

export function toNepaliDigits(val: number | string): string {
  const nepaliDigits: { [key: string]: string } = {
    '0': '०', '1': '१', '2': '२', '3': '३', '4': '४',
    '5': '५', '6': '६', '7': '७', '8': '८', '9': '९',
  };
  return String(val).replace(/[0-9]/g, (d) => nepaliDigits[d] || d);
}
