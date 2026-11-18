import { AppError } from '../utils/errors.js';

export const ROLES = {
  ASSOCIATE: 'Associate',
  MANAGER: 'Manager',
};

export const CREATE_CHAT_ACTIONS = new Set([
  'create_article',
  'create_articles',
  'create_vendor',
  'create_site',
  'create_po',
  'create_asn',
  'continue_create_po',
]);

export const CREATE_WIZARDS = new Set([
  'create_article',
  'create_articles',
  'create_vendor',
  'create_site',
  'create_po',
  'create_asn',
]);

export function normalizeRole(value) {
  const raw = String(value || '').trim();
  if (/^manager$/i.test(raw)) return ROLES.MANAGER;
  if (/^associate$/i.test(raw)) return ROLES.ASSOCIATE;
  return null;
}

export function resolveRole(req) {
  return (
    normalizeRole(req.headers['x-user-role']) ||
    normalizeRole(req.body?.role) ||
    normalizeRole(req.query?.role)
  );
}

export function assertCanCreate(role) {
  if (role === ROLES.MANAGER) return;
  throw new AppError(
    'FORBIDDEN_ROLE',
    'Associates can only read and update data. Creating new records requires Manager role.',
    403,
    { role: role || null, requiredRole: ROLES.MANAGER }
  );
}

/** Attach req.userRole from header/body. Does not require role for health/static. */
export function attachRole(req, _res, next) {
  req.userRole = resolveRole(req);
  next();
}

/** Require a valid role on API calls. */
export function requireRole(req, _res, next) {
  const role = resolveRole(req);
  if (!role) {
    return next(
      new AppError(
        'ROLE_REQUIRED',
        'Select a role to continue. Send header X-User-Role: Associate or Manager.',
        401
      )
    );
  }
  req.userRole = role;
  next();
}

/** Block HTTP create methods for Associate. */
export function blockAssociateCreates(req, _res, next) {
  if (req.userRole === ROLES.MANAGER) return next();
  if (req.method === 'POST') {
    return next(
      new AppError(
        'FORBIDDEN_ROLE',
        'Associates cannot create new data. Use Update or ask a Manager.',
        403,
        { role: req.userRole }
      )
    );
  }
  next();
}

export function roleCanCreate(role) {
  return role === ROLES.MANAGER;
}
