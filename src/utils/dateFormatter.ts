/**
 * Universal Date Formatter for Rental Pune
 * Strict Standard: DD/MM/YYYY across all public and admin pages
 */

export function formatDateDDMMYYYY(dateInput?: string | number | Date | null): string {
  if (!dateInput) return '-';
  try {
    // If it's already in YYYY-MM-DD format (like from an HTML date input)
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      const [year, month, day] = dateInput.split('-');
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }

    const d = new Date(dateInput);
    if (isNaN(d.getTime())) {
      // If string has date components
      if (typeof dateInput === 'string') {
        const parts = dateInput.split(/[-/]/);
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            // YYYY-MM-DD
            return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
          }
        }
      }
      return String(dateInput);
    }

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return `${day}/${month}/${year}`;
  } catch {
    return String(dateInput || '-');
  }
}

export function formatDateTimeDDMMYYYY(dateInput?: string | number | Date | null): string {
  if (!dateInput) return '-';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return formatDateDDMMYYYY(dateInput);

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 becomes 12
    const strHours = String(hours).padStart(2, '0');

    return `${day}/${month}/${year}, ${strHours}:${minutes} ${ampm}`;
  } catch {
    return formatDateDDMMYYYY(dateInput);
  }
}

export function formatDateComponents(dateInput?: string | number | Date | null): { date: string; time: string } {
  if (!dateInput) return { date: '-', time: '' };
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) {
      return { date: formatDateDDMMYYYY(dateInput), time: '' };
    }

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strHours = String(hours).padStart(2, '0');

    return {
      date: `${day}/${month}/${year}`,
      time: `${strHours}:${minutes} ${ampm}`
    };
  } catch {
    return { date: formatDateDDMMYYYY(dateInput), time: '' };
  }
}
