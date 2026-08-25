export const onlyDigits = (value: string) => value.replace(/\D/g, "");

export function maskCpf(value: string) {
  return onlyDigits(value).slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function maskWhatsapp(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  return digits.length <= 10 ? digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2") : digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}

export function maskBirthDate(value: string) {
  return onlyDigits(value).slice(0, 8).replace(/(\d{2})(\d)/, "$1/$2").replace(/(\d{2})(\d)/, "$1/$2");
}

export function validCpf(value: string) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digit = (length: number) => {
    const sum = cpf.slice(0, length).split("").reduce((total, number, index) => total + Number(number) * (length + 1 - index), 0);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

export function parseBrazilianDate(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;
  const [, dayText, monthText, yearText] = match;
  const day = Number(dayText), month = Number(monthText), year = Number(yearText);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date : null;
}
