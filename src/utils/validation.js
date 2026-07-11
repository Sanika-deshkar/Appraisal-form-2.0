// - Validators -

export const isValidEmail = (email) => {
  const v = String(email ?? '').trim();
  return v.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
};

export const isValidPhone = (phone) => {
  const v = String(phone ?? '').trim();
  if (!v) return true; // optional field
  const digits = v.replace(/[\s\-\(\)\+]/g, '');
  return /^(91)?[6-9]\d{9}$/.test(digits) || /^\d{7,15}$/.test(digits);
};

// Returns array of unmet requirements; empty array = valid
export const passwordRequirements = (password) => {
  const p = String(password ?? '');
  const unmet = [];
  if (p.length < 8)        unmet.push('At least 8 characters');
  if (!/[A-Z]/.test(p))   unmet.push('One uppercase letter');
  if (!/[a-z]/.test(p))   unmet.push('One lowercase letter');
  if (!/\d/.test(p))      unmet.push('One number');
  return unmet;
};

export const isStrongPassword = (password) =>
  passwordRequirements(password).length === 0;

export const isValidName = (name) => {
  const v = String(name ?? '').trim();
  return v.length >= 2 && v.length <= 100;
};

// Alphanumeric + common separators (/, -, _)
export const isValidEmployeeId = (id) => {
  const v = String(id ?? '').trim();
  return v.length >= 2 && v.length <= 30 && /^[a-zA-Z0-9/_\-]+$/.test(v);
};

// Non-negative number, max 80, up to one decimal place
export const isValidExperience = (exp) => {
  const v = String(exp ?? '').trim();
  if (!v) return true; // optional
  return /^\d{1,2}(\.\d)?$/.test(v) && parseFloat(v) >= 0 && parseFloat(v) <= 80;
};

// - Sanitizers -

export const sanitizeText = (value) =>
  String(value ?? '').trim().replace(/\s+/g, ' ');

export const normalizeEmail = (email) =>
  String(email ?? '').trim().toLowerCase();

export const isNotEmpty = (value) =>
  String(value ?? '').trim().length > 0;

// - Input filters (use in onChange to block invalid keystrokes) -

// Allow only digits and one optional decimal point
export const filterNumeric = (value) =>
  String(value ?? '').replace(/[^0-9.]/g, '').replace(/(\.\d*)\./g, '$1');

// Allow only digits, +, -, spaces, ()
export const filterPhone = (value) =>
  String(value ?? '').replace(/[^0-9+\-()\s]/g, '').slice(0, 20);
