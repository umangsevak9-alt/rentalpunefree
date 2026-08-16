/**
 * Indian Rupee (INR / ₹) Currency Utilities
 * Formats monetary amounts according to Indian numbering standards (Lakhs & Crores)
 * and generates formal Amount in Words for legal/commercial invoices.
 */

export function formatINR(amount: number | string | null | undefined, compact = false): string {
  if (amount === undefined || amount === null || amount === '') return '₹0';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '₹0';

  if (compact) {
    if (Math.abs(num) >= 10000000) {
      // 1 Crore = 10,000,000
      const cr = num / 10000000;
      return `₹${cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(2)} Cr`;
    }
    if (Math.abs(num) >= 100000) {
      // 1 Lakh = 100,000
      const lakh = num / 100000;
      return `₹${lakh % 1 === 0 ? lakh.toFixed(0) : lakh.toFixed(2)} L`;
    }
    if (Math.abs(num) >= 1000) {
      const k = num / 1000;
      return `₹${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)} K`;
    }
  }

  // Standard Indian formatting (e.g. 48,50,000)
  return `₹${num.toLocaleString('en-IN')}`;
}

export function formatCompactINR(amount: number | string | null | undefined): string {
  return formatINR(amount, true);
}

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
];

const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function convertLessThanThousand(n: number): string {
  let word = '';
  if (n >= 100) {
    word += ONES[Math.floor(n / 100)] + ' Hundred ';
    n %= 100;
  }
  if (n > 0) {
    if (n < 20) {
      word += ONES[n] + ' ';
    } else {
      word += TENS[Math.floor(n / 10)] + ' ';
      if (n % 10 > 0) {
        word += ONES[n % 10] + ' ';
      }
    }
  }
  return word;
}

export function numberToWordsINR(amount: number | string | null | undefined): string {
  if (amount === undefined || amount === null || amount === '') return 'Rupees Zero Only';
  const num = Math.floor(Math.abs(typeof amount === 'string' ? parseFloat(amount) : amount));
  if (isNaN(num) || num === 0) return 'Rupees Zero Only';

  const crore = Math.floor(num / 10000000);
  const remainderAfterCrore = num % 10000000;
  const lakh = Math.floor(remainderAfterCrore / 100000);
  const remainderAfterLakh = remainderAfterCrore % 100000;
  const thousand = Math.floor(remainderAfterLakh / 1000);
  const remainderAfterThousand = remainderAfterLakh % 1000;

  let result = 'Rupees ';

  if (crore > 0) {
    result += convertLessThanThousand(crore) + 'Crore ';
  }
  if (lakh > 0) {
    result += convertLessThanThousand(lakh) + 'Lakh ';
  }
  if (thousand > 0) {
    result += convertLessThanThousand(thousand) + 'Thousand ';
  }
  if (remainderAfterThousand > 0) {
    result += convertLessThanThousand(remainderAfterThousand);
  }

  return result.trim() + ' Only';
}
