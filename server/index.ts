import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applySuccessfulCheckIn, demoMemberCode, duplicateCheckInTodayMessage, validateCheckInCode } from './checkIn.js';
import {
  approvePendingCheckIn,
  dismissPendingCheckIn,
  pendingForUnit,
  processAutoApproveForUnit,
} from './pendingCheckIn.js';
import { getDomain, loadStore, updateStore } from './store.js';
import { portalPayloadFromStore, type GymUnit } from './types.js';
import { buildNewUnit, emptyMonthlyPayout, type CreateUnitInput } from './unitFactory.js';

const app = new Hono();
app.use('*', cors());

app.get('/api/health', (c) => c.json({ ok: true }));

app.get('/api/domain', (c) => c.json(getDomain()));

app.get('/api/bootstrap', (c) => {
  const store = loadStore();
  return c.json({
    networkId: store.networkId,
    networkName: store.networkName,
    activeUnitId: store.activeUnitId,
    units: store.units,
    students: store.students,
    payoutsByUnit: store.payoutsByUnit,
    payoutHistoryByUnit: store.payoutHistoryByUnit,
    checkInLog: store.checkInLog,
  });
});

app.get('/api/portal', (c) => {
  const store = loadStore();
  const unitScope = c.req.query('scope') === 'all' ? 'all' : 'single';
  return c.json(portalPayloadFromStore(store, true, unitScope));
});

app.patch('/api/portal/active-unit', async (c) => {
  const body = (await c.req.json()) as { unitId: string; scope?: string };
  const unitScope = body.scope === 'all' ? 'all' : 'single';
  const store = updateStore((s) => {
    if (s.units.some((u) => u.id === body.unitId)) {
      s.activeUnitId = body.unitId;
    }
  });
  return c.json(portalPayloadFromStore(store, true, unitScope));
});

app.patch('/api/units/:unitId', async (c) => {
  const unitId = c.req.param('unitId');
  const patch = (await c.req.json()) as Partial<GymUnit>;
  const store = updateStore((s) => {
    const idx = s.units.findIndex((u) => u.id === unitId);
    if (idx < 0) return;
    s.units[idx] = { ...s.units[idx], ...patch, id: unitId };
  });
  const unitScope = c.req.query('scope') === 'all' ? 'all' : 'single';
  return c.json(portalPayloadFromStore(store, true, unitScope));
});

app.post('/api/units', async (c) => {
  const body = (await c.req.json()) as CreateUnitInput;
  const unitName = body.unitName?.trim() ?? '';
  const neighborhood = body.neighborhood?.trim() ?? '';
  const city = body.city?.trim() ?? '';
  if (!unitName || !neighborhood || !city) {
    return c.json({ message: 'Informe nome, bairro e cidade da unidade.' }, 400);
  }

  const store = updateStore((s) => {
    const unit = buildNewUnit(s, { ...body, unitName, neighborhood, city });
    s.units.push(unit);
    s.activeUnitId = unit.id;
    const monthLabel = Object.values(s.payoutsByUnit)[0]?.monthLabel ?? 'Julho 2026';
    s.payoutsByUnit[unit.id] = emptyMonthlyPayout(monthLabel);
    s.payoutHistoryByUnit[unit.id] = [s.payoutsByUnit[unit.id]];
  });

  const unitScope = c.req.query('scope') === 'all' ? 'all' : 'single';
  return c.json(portalPayloadFromStore(store, true, unitScope), 201);
});

app.get('/api/units/:unitId/public', (c) => {
  const unitId = c.req.param('unitId');
  const store = loadStore();
  const unit = store.units.find((u) => u.id === unitId);
  if (!unit) return c.json({ error: 'not_found' }, 404);
  const { heroPhotoDataUrl, galleryPhotoDataUrls, ...rest } = unit;
  return c.json({
    networkId: store.networkId,
    networkName: store.networkName,
    unit: {
      ...rest,
      hasHeroPhoto: Boolean(heroPhotoDataUrl),
      galleryCount: galleryPhotoDataUrls.length,
    },
  });
});

app.post('/api/check-ins/validate', async (c) => {
  const body = (await c.req.json()) as { unitId: string; code: string; scope?: string };
  const store = loadStore();
  const result = validateCheckInCode(store, body.unitId, body.code);
  if (!result.ok) {
    return c.json({ ok: false, message: result.message }, 400);
  }
  const duplicate = duplicateCheckInTodayMessage(store, body.unitId, result, body.code);
  if (duplicate) {
    return c.json({ ok: false, message: duplicate }, 400);
  }
  const updated = updateStore((s) => {
    applySuccessfulCheckIn(s, body.unitId, result, body.code);
  });
  const log = updated.checkInLog[updated.checkInLog.length - 1];
  const unitScope = body.scope === 'all' ? 'all' : 'single';
  return c.json({
    ok: true,
    message: result.message,
    entry: log,
    portal: portalPayloadFromStore(updated, true, unitScope),
  });
});

app.post('/api/check-ins/issue', async (c) => {
  const body = (await c.req.json()) as {
    code: string;
    unitId: string;
    holderName: string;
    validUntil: string;
    type?: 'daily_pass';
  };
  const store = updateStore((s) => {
    s.issuedCodes = s.issuedCodes.filter((x) => x.code !== body.code);
    s.issuedCodes.push({
      code: body.code.toUpperCase(),
      type: body.type ?? 'daily_pass',
      unitId: body.unitId,
      holderName: body.holderName,
      validUntil: body.validUntil,
    });
  });
  return c.json({ ok: true, issued: body.code });
});

app.get('/api/check-ins/pending', (c) => {
  const unitId = c.req.query('unitId');
  if (!unitId) return c.json({ message: 'Informe a unidade.' }, 400);
  const unitScope = c.req.query('scope') === 'all' ? 'all' : 'single';

  let approvedCount = 0;
  const store = updateStore((s) => {
    approvedCount = processAutoApproveForUnit(s, unitId);
  });

  const body: {
    pending: ReturnType<typeof pendingForUnit>;
    approvedCount: number;
    portal?: ReturnType<typeof portalPayloadFromStore>;
  } = {
    pending: pendingForUnit(store, unitId),
    approvedCount,
  };
  if (approvedCount > 0) {
    body.portal = portalPayloadFromStore(store, true, unitScope);
  }
  return c.json(body);
});

app.post('/api/check-ins/pending/:id/approve', async (c) => {
  const pendingId = c.req.param('id');
  const body = (await c.req.json()) as { unitId: string; scope?: string };
  if (!body.unitId) return c.json({ message: 'Informe a unidade.' }, 400);

  let message = '';
  let failed = '';
  const store = updateStore((s) => {
    const result = approvePendingCheckIn(s, pendingId, body.unitId);
    if (!result.ok) {
      failed = result.message;
      return;
    }
    message = result.message;
  });

  if (failed) return c.json({ ok: false, message: failed }, 400);

  const unitScope = body.scope === 'all' ? 'all' : 'single';
  return c.json({
    ok: true,
    message,
    portal: portalPayloadFromStore(store, true, unitScope),
  });
});

app.post('/api/check-ins/pending/:id/dismiss', async (c) => {
  const pendingId = c.req.param('id');
  const body = (await c.req.json()) as { unitId: string; scope?: string };
  if (!body.unitId) return c.json({ message: 'Informe a unidade.' }, 400);

  const store = updateStore((s) => {
    dismissPendingCheckIn(s, pendingId, body.unitId);
  });
  const unitScope = body.scope === 'all' ? 'all' : 'single';
  return c.json({
    ok: true,
    portal: portalPayloadFromStore(store, true, unitScope),
    pending: pendingForUnit(store, body.unitId),
  });
});

app.get('/api/check-ins/demo-code', (c) => {
  const unitId = c.req.query('unitId') ?? 'g_carpe';
  return c.json({
    memberToday: demoMemberCode(unitId),
    dailyDemo: 'ACAF-MCK-DEMO-G_CARPE',
  });
});

const __dir = dirname(fileURLToPath(import.meta.url));
const domainPath = join(__dir, '..', 'shared', 'connect_domain.json');

app.get('/shared/connect_domain.json', (c) => {
  const raw = readFileSync(domainPath, 'utf-8');
  return c.body(raw, 200, { 'Content-Type': 'application/json' });
});

const port = Number(process.env.PORT ?? 8788);
console.log(`ACAF partner API http://127.0.0.1:${port}`);
serve({ fetch: app.fetch, port });
