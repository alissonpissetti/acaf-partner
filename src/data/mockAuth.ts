/** Validação mock para o portal demo (substituir por API real depois). */

const DEMO_USER = 'gestor@acaf.demo';
const DEMO_PASS = 'connect2026';
const DEMO_OTP = '000000';

export function validatePasswordLogin(username: string, password: string): string | null {
  const user = username.trim();
  if (!user || !password) {
    return 'Informe usuário e senha.';
  }
  if (user === DEMO_USER && password === DEMO_PASS) {
    return null;
  }
  if (user.length >= 3 && password.length >= 4) {
    return null;
  }
  return 'Usuário ou senha inválidos. Confira o acesso de demonstração no rodapé.';
}

export function validatePhoneTokenLogin(phone: string, token: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) {
    return 'Informe um telefone com DDD.';
  }
  const code = token.replace(/\D/g, '');
  if (code.length !== 6) {
    return 'O token deve ter 6 dígitos.';
  }
  if (code === DEMO_OTP) {
    return null;
  }
  if (/^\d{6}$/.test(code)) {
    return null;
  }
  return 'Código incorreto. Na demonstração, use 000000.';
}

export const LOGIN_DEMO_HINT = {
  user: DEMO_USER,
  pass: DEMO_PASS,
  otp: DEMO_OTP,
};
