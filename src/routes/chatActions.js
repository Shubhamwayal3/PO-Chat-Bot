import { Router } from 'express';
import { runChatAction } from '../chat/actions.js';
import { chatActionSchema } from '../validation/schemas.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  CREATE_CHAT_ACTIONS,
  CREATE_WIZARDS,
  assertCanCreate,
  roleCanCreate,
} from '../middleware/roles.js';

const router = Router();

function enforceChatRole(role, { action, wizard, message }) {
  const parsedAction = action === 'message' || action === 'parse' ? null : action;

  if (wizard && CREATE_WIZARDS.has(wizard) && !roleCanCreate(role)) {
    assertCanCreate(role);
  }

  if (parsedAction && CREATE_CHAT_ACTIONS.has(parsedAction) && !roleCanCreate(role)) {
    assertCanCreate(role);
  }

  // Natural language create attempts (message path) — checked after NLU in actions via role
  return { role, message };
}

router.post(
  '/actions',
  asyncHandler(async (req, res) => {
    const body = chatActionSchema.parse(req.body);
    enforceChatRole(req.userRole, {
      action: body.action,
      wizard: req.body.wizard,
      message: req.body.message,
    });
    if (CREATE_CHAT_ACTIONS.has(body.action)) {
      assertCanCreate(req.userRole);
    }
    const result = await runChatAction({
      action: body.action,
      slots: body.slots,
      confirm: body.confirm,
      message: req.body.message,
      role: req.userRole,
    });
    res.json(result);
  })
);

router.post(
  '/message',
  asyncHandler(async (req, res) => {
    const message = String(req.body.message || '');
    const confirm = req.body.confirm !== false;
    if (req.body.wizard && CREATE_WIZARDS.has(req.body.wizard)) {
      assertCanCreate(req.userRole);
    }
    const result = await runChatAction({
      action: 'message',
      slots: req.body.slots || {},
      confirm,
      message,
      wizard: req.body.wizard || null,
      awaitingField: req.body.awaitingField || null,
      role: req.userRole,
    });
    res.json(result);
  })
);

export default router;
