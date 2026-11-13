import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../src/app.js';
import pool from '../src/config/db.js';
import { processExpiredPendingEvents } from '../src/workers/event.worker.js';

let server;
let baseUrl;

const api = async (path, { method = 'GET', token = null, headers = {}, body = undefined } = {}) => {
  const reqHeaders = { ...headers };
  if (token) reqHeaders.Authorization = `Bearer ${token}`;
  if (body !== undefined) reqHeaders['Content-Type'] = 'application/json';

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: reqHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const json = await res.json();
  return { status: res.status, json };
};

const cleanDatabase = async () => {
  // Foreign key sırasına göre temizle (RESTRICT kısıtları sebebiyle)
  await pool.query('DELETE FROM notifications');
  await pool.query('DELETE FROM push_tokens');
  await pool.query('DELETE FROM contacts');
  await pool.query('DELETE FROM events');
  await pool.query('DELETE FROM thresholds');
  await pool.query('DELETE FROM access_permissions');
  await pool.query('DELETE FROM measurements');
  await pool.query('DELETE FROM devices');
  await pool.query('DELETE FROM users');
};

const runTests = async () => {
  await cleanDatabase();

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}/api/v1`;

  let passed = 0;
  const check = async (name, fn) => {
    await fn();
    passed += 1;
    console.log(`✅ [${passed}] ${name}`);
  };

  try {
    // 1. Health check, Swagger UI & 404 check
    await check('GET /health, Swagger UI (/api-docs, /api-docs.json) ve 404 format kontrolü', async () => {
      const h = await api('/health');
      assert.equal(h.status, 200);
      assert.equal(h.json.success, true);
      assert.equal(h.json.data.status, 'ok');

      const originUrl = baseUrl.replace('/api/v1', '');
      const docsHtmlRes = await fetch(`${originUrl}/api-docs/`);
      assert.equal(docsHtmlRes.status, 200);
      const docsHtml = await docsHtmlRes.text();
      assert.match(docsHtml, /swagger-ui/i);

      const docsJsonRes = await fetch(`${originUrl}/api-docs.json`);
      assert.equal(docsJsonRes.status, 200);
      const docsJson = await docsJsonRes.json();
      assert.equal(docsJson.openapi, '3.0.3');
      assert.ok(docsJson.paths['/api/v1/auth/login']);
      assert.ok(docsJson.paths['/api/v1/device/measurements']);
      assert.ok(docsJson.paths['/api/v1/notifications/{id}/read']);

      const nf = await api('/olmayan-endpoint');
      assert.equal(nf.status, 404);
      assert.equal(nf.json.success, false);
      assert.equal(nf.json.error.code, 'NOT_FOUND');
    });

    // 2. Register & Login
    let ownerId;
    let ownerToken;
    let viewerId;
    let viewerToken;

    await check('POST /auth/register (Owner & Viewer + validasyon/çakışma)', async () => {
      const badEmail = await api('/auth/register', {
        method: 'POST',
        body: { full_name: 'Test', email: 'gecersiz-email', password: 'StrongPassword123' },
      });
      assert.equal(badEmail.status, 422);
      assert.equal(badEmail.json.error.code, 'VALIDATION_ERROR');

      const reg1 = await api('/auth/register', {
        method: 'POST',
        body: {
          full_name: 'Meryem Kılınç',
          email: 'Meryem@Example.com',
          password: 'StrongPassword123',
        },
      });
      assert.equal(reg1.status, 201);
      assert.equal(reg1.json.success, true);
      assert.equal(typeof reg1.json.data.user.id, 'string');
      assert.equal(reg1.json.data.user.email, 'meryem@example.com');
      assert.equal(reg1.json.data.user.password_hash, undefined);
      assert.match(reg1.json.data.user.created_at, /Z$/);
      ownerId = reg1.json.data.user.id;

      const dup = await api('/auth/register', {
        method: 'POST',
        body: {
          full_name: 'Meryem Kılınç',
          email: 'meryem@example.com',
          password: 'StrongPassword123',
        },
      });
      assert.equal(dup.status, 409);
      assert.equal(dup.json.error.code, 'CONFLICT');

      const reg2 = await api('/auth/register', {
        method: 'POST',
        body: {
          full_name: 'Ahmet Yılmaz',
          email: 'ahmet@example.com',
          password: 'StrongPassword123',
        },
      });
      assert.equal(reg2.status, 201);
      viewerId = reg2.json.data.user.id;
    });

    await check('POST /auth/login ve GET /users/me', async () => {
      const noAuth = await api('/users/me');
      assert.equal(noAuth.status, 401);

      const login1 = await api('/auth/login', {
        method: 'POST',
        body: { email: 'meryem@example.com', password: 'StrongPassword123' },
      });
      assert.equal(login1.status, 200);
      assert.equal(login1.json.data.token_type, 'Bearer');
      assert.equal(login1.json.data.expires_in, 3600);
      assert.equal(login1.json.data.user.id, ownerId);
      ownerToken = login1.json.data.access_token;

      const login2 = await api('/auth/login', {
        method: 'POST',
        body: { email: 'ahmet@example.com', password: 'StrongPassword123' },
      });
      assert.equal(login2.status, 200);
      viewerToken = login2.json.data.access_token;

      const me = await api('/users/me', { token: ownerToken });
      assert.equal(me.status, 200);
      assert.equal(me.json.data.id, ownerId);
      assert.equal(me.json.data.full_name, 'Meryem Kılınç');
      assert.equal(me.json.data.is_active, true);
    });

    // 3. Devices & Heartbeat
    let deviceId;
    let deviceKey;
    const deviceCode = 'ULGEN-ESP32-001';

    await check('POST /devices, GET /users/me/devices, POST /device/heartbeat', async () => {
      const addDev = await api('/devices', {
        method: 'POST',
        token: ownerToken,
        body: {
          device_code: deviceCode,
          name: 'Ülgen Akıllı Bileklik',
          firmware_version: '1.0.0',
        },
      });
      assert.equal(addDev.status, 201);
      assert.equal(typeof addDev.json.data.device.id, 'string');
      assert.equal(addDev.json.data.device.user_id, ownerId);
      assert.equal(addDev.json.data.device.is_active, false);
      assert.equal(addDev.json.data.device.device_key_hash, undefined);
      assert.ok(addDev.json.data.device_key.length >= 32);
      deviceId = addDev.json.data.device.id;
      deviceKey = addDev.json.data.device_key;

      const listDev = await api('/users/me/devices', { token: ownerToken });
      assert.equal(listDev.status, 200);
      assert.equal(listDev.json.data.devices.length, 1);
      assert.equal(listDev.json.data.devices[0].device_code, deviceCode);

      const badAuthHb = await api('/device/heartbeat', {
        method: 'POST',
        headers: { 'X-Device-Code': deviceCode, 'X-Device-Key': 'wrong-key' },
        body: { battery_level: 85 },
      });
      assert.equal(badAuthHb.status, 401);

      const hb = await api('/device/heartbeat', {
        method: 'POST',
        headers: { 'X-Device-Code': deviceCode, 'X-Device-Key': deviceKey },
        body: { battery_level: 85, firmware_version: '1.0.1' },
      });
      assert.equal(hb.status, 200);
      assert.equal(hb.json.data.device_id, deviceId);
      assert.equal(hb.json.data.battery_level, 85);
      assert.equal(hb.json.data.is_active, true);
      assert.match(hb.json.data.last_seen_at, /Z$/);
    });

    // 4. Measurements (idempotency, conflict, invalid, latest + last_valid, history, summary)
    await check('POST /device/measurements (geçerli, idempotent, çakışma, geçersiz/temassız)', async () => {
      const m1Payload = {
        sample_id: 'SAMPLE-000001',
        measured_at: '2026-11-08T12:30:15.250Z',
        heart_rate_bpm: 78.5,
        spo2_percent: 98.0,
        gsr_raw: 1250,
        stress_index: 32.5,
        movement: 'walking',
        wear_detected: true,
        heart_rate_valid: true,
        spo2_valid: true,
        gsr_valid: true,
        stress_valid: true,
      };

      const m1 = await api('/device/measurements', {
        method: 'POST',
        headers: { 'X-Device-Code': deviceCode, 'X-Device-Key': deviceKey },
        body: m1Payload,
      });
      assert.equal(m1.status, 201);
      assert.equal(typeof m1.json.data.measurement_id, 'string');
      assert.equal(m1.json.data.device_id, deviceId);

      // Idempotent tekrar
      const m1Repeat = await api('/device/measurements', {
        method: 'POST',
        headers: { 'X-Device-Code': deviceCode, 'X-Device-Key': deviceKey },
        body: m1Payload,
      });
      assert.equal(m1Repeat.status, 200);
      assert.equal(m1Repeat.json.data.measurement_id, m1.json.data.measurement_id);

      // Aynı sample_id ama farklı içerik -> 409
      const m1Conflict = await api('/device/measurements', {
        method: 'POST',
        headers: { 'X-Device-Code': deviceCode, 'X-Device-Key': deviceKey },
        body: { ...m1Payload, heart_rate_bpm: 99.0 },
      });
      assert.equal(m1Conflict.status, 409);

      // *_valid true iken null değer -> 422
      const invalidFlag = await api('/device/measurements', {
        method: 'POST',
        headers: { 'X-Device-Code': deviceCode, 'X-Device-Key': deviceKey },
        body: { ...m1Payload, sample_id: 'SAMPLE-BAD', heart_rate_bpm: null, heart_rate_valid: true },
      });
      assert.equal(invalidFlag.status, 422);

      // Temassız/geçersiz son paket
      const m2 = await api('/device/measurements', {
        method: 'POST',
        headers: { 'X-Device-Code': deviceCode, 'X-Device-Key': deviceKey },
        body: {
          sample_id: 'SAMPLE-000002',
          measured_at: '2026-11-08T12:35:00.000Z',
          heart_rate_bpm: null,
          spo2_percent: null,
          gsr_raw: null,
          stress_index: null,
          movement: 'unknown',
          wear_detected: false,
          heart_rate_valid: false,
          spo2_valid: false,
          gsr_valid: false,
          stress_valid: false,
        },
      });
      assert.equal(m2.status, 201);
    });

    await check('GET latest (hem son paket hem last_valid), history ve summary', async () => {
      const latest = await api(`/users/${ownerId}/measurements/latest`, { token: ownerToken });
      assert.equal(latest.status, 200);
      assert.equal(latest.json.data.measurement.sample_id, 'SAMPLE-000002');
      assert.equal(latest.json.data.measurement.wear_detected, false);
      assert.equal(latest.json.data.measurement.heart_rate_bpm, null);
      assert.equal(latest.json.data.last_valid.heart_rate_bpm.value, 78.5);
      assert.equal(latest.json.data.last_valid.spo2_percent.value, 98);

      const history = await api(
        `/users/${ownerId}/measurements?start_date=2026-11-01T00:00:00.000Z&end_date=2026-11-08T23:59:59.999Z&page=1&limit=20`,
        { token: ownerToken }
      );
      assert.equal(history.status, 200);
      assert.equal(history.json.data.measurements.length, 2);
      assert.equal(history.json.data.pagination.total, 2);

      const summary = await api(`/users/${ownerId}/summary`, { token: ownerToken });
      assert.equal(summary.status, 200);
      assert.equal(summary.json.data.user_id, ownerId);
      assert.equal(summary.json.data.device.id, deviceId);
      assert.equal(summary.json.data.last_valid_measurement.heart_rate_bpm.value, 78.5);
      assert.equal(summary.json.data.active_event_count, 0);
    });

    // 5. Thresholds
    await check('PUT/GET /users/:id/thresholds ve eşik validasyonları', async () => {
      const badThresh = await api(`/users/${ownerId}/thresholds`, {
        method: 'PUT',
        token: ownerToken,
        body: {
          min_heart_rate_bpm: 130,
          max_heart_rate_bpm: 100,
          min_spo2_percent: 90,
          fall_impact_threshold_g: 2.5,
          stress_threshold: 70,
          is_enabled: true,
        },
      });
      assert.equal(badThresh.status, 422);

      const putThresh = await api(`/users/${ownerId}/thresholds`, {
        method: 'PUT',
        token: ownerToken,
        body: {
          min_heart_rate_bpm: 50,
          max_heart_rate_bpm: 120,
          min_spo2_percent: 90,
          fall_impact_threshold_g: 2.5,
          stress_threshold: 70,
          is_enabled: true,
        },
      });
      assert.equal(putThresh.status, 200);
      assert.equal(putThresh.json.data.is_enabled, true);

      const getThresh = await api(`/users/${ownerId}/thresholds`, { token: ownerToken });
      assert.equal(getThresh.status, 200);
      assert.equal(getThresh.json.data.max_heart_rate_bpm, 120);
    });

    // 6. Contacts
    let contactToDeactivateId;
    await check('POST/GET/DELETE /users/:id/contacts', async () => {
      const selfContact = await api(`/users/${ownerId}/contacts`, {
        method: 'POST',
        token: ownerToken,
        body: {
          linked_user_id: ownerId,
          full_name: 'Kendim',
          phone_number: '+905550000000',
          priority: 1,
        },
      });
      assert.equal(selfContact.status, 422);

      const c1 = await api(`/users/${ownerId}/contacts`, {
        method: 'POST',
        token: ownerToken,
        body: {
          linked_user_id: viewerId,
          full_name: 'Ahmet Yılmaz',
          phone_number: '+905551112233',
          priority: 1,
        },
      });
      assert.equal(c1.status, 201);
      assert.equal(c1.json.data.linked_user_id, viewerId);

      const c2 = await api(`/users/${ownerId}/contacts`, {
        method: 'POST',
        token: ownerToken,
        body: {
          linked_user_id: null,
          full_name: 'Yedek Kişi',
          phone_number: '+905559998877',
          priority: 2,
        },
      });
      assert.equal(c2.status, 201);
      contactToDeactivateId = c2.json.data.id;

      const list = await api(`/users/${ownerId}/contacts`, { token: ownerToken });
      assert.equal(list.status, 200);
      assert.equal(list.json.data.contacts.length, 2);

      const del = await api(`/users/${ownerId}/contacts/${contactToDeactivateId}`, {
        method: 'DELETE',
        token: ownerToken,
      });
      assert.equal(del.status, 200);
      assert.equal(del.json.data.is_active, false);

      const listAfter = await api(`/users/${ownerId}/contacts`, { token: ownerToken });
      assert.equal(listAfter.json.data.contacts.length, 1);
    });

    // 7. Events (trigger + cancel + worker escalation)
    await check('Otomatik acil durum olayı, PUT /events/:id iptali ve worker escalation', async () => {
      // Yüksek nabız -> pending event
      const mHighHr = await api('/device/measurements', {
        method: 'POST',
        headers: { 'X-Device-Code': deviceCode, 'X-Device-Key': deviceKey },
        body: {
          sample_id: 'SAMPLE-000003',
          measured_at: '2026-11-08T12:40:00.000Z',
          heart_rate_bpm: 145,
          spo2_percent: 97,
          gsr_raw: 1300,
          stress_index: 40,
          movement: 'resting',
          wear_detected: true,
          heart_rate_valid: true,
          spo2_valid: true,
          gsr_valid: true,
          stress_valid: true,
        },
      });
      assert.equal(mHighHr.status, 201);

      const eventsRes = await api(`/users/${ownerId}/events?page=1&limit=20`, { token: ownerToken });
      assert.equal(eventsRes.status, 200);
      assert.equal(eventsRes.json.data.events.length, 1);
      const evt1 = eventsRes.json.data.events[0];
      assert.equal(evt1.event_type, 'high_heart_rate');
      assert.equal(evt1.status, 'pending');

      // İptal et
      const cancelRes = await api(`/events/${evt1.id}`, {
        method: 'PUT',
        token: ownerToken,
        body: {
          action: 'cancel',
          resolution_reason: 'Kullanıcı güvende olduğunu onayladı.',
        },
      });
      assert.equal(cancelRes.status, 200);
      assert.equal(cancelRes.json.data.status, 'cancelled');
      assert.ok(cancelRes.json.data.resolved_at);

      // Düşme olayı oluştur ve süresini dolmuş hale getirip worker'ı çalıştır
      const mFall = await api('/device/measurements', {
        method: 'POST',
        headers: { 'X-Device-Code': deviceCode, 'X-Device-Key': deviceKey },
        body: {
          sample_id: 'SAMPLE-000004',
          measured_at: '2026-11-08T12:45:00.000Z',
          heart_rate_bpm: 88,
          spo2_percent: 97,
          gsr_raw: 1300,
          stress_index: 45,
          movement: 'fall',
          fall_detected: true,
          wear_detected: true,
          heart_rate_valid: true,
          spo2_valid: true,
          gsr_valid: true,
          stress_valid: true,
        },
      });
      assert.equal(mFall.status, 201);

      // Test amaçlı deadline_at değerini 1 saniye geçmişe çek
      await pool.execute(
        `UPDATE events
         SET deadline_at = created_at
         WHERE user_id = ? AND status = 'pending'`,
        [ownerId]
      );

      const escalated = await processExpiredPendingEvents();
      assert.equal(escalated, 1);

      const eventsAfter = await api(`/users/${ownerId}/events`, { token: ownerToken });
      const fallEvent = eventsAfter.json.data.events.find((e) => e.event_type === 'fall');
      assert.equal(fallEvent.status, 'escalated');
    });

    // 8. Access Permissions
    let accessId;
    await check('Erişim izinleri (istek, listeleme, kabul, viewer veri okuma, iptal)', async () => {
      const forbiddenSummary = await api(`/users/${ownerId}/summary`, { token: viewerToken });
      assert.equal(forbiddenSummary.status, 403);
      assert.equal(forbiddenSummary.json.error.code, 'FORBIDDEN');

      const reqAccess = await api(`/users/${ownerId}/access`, {
        method: 'POST',
        token: ownerToken,
        body: { viewer_id: viewerId },
      });
      assert.equal(reqAccess.status, 201);
      assert.equal(reqAccess.json.data.status, 'pending');
      accessId = reqAccess.json.data.id;

      const viewerAccess = await api('/me/access', { token: viewerToken });
      assert.equal(viewerAccess.status, 200);
      assert.equal(viewerAccess.json.data.incoming.length, 1);
      assert.equal(viewerAccess.json.data.outgoing.length, 0);

      const acceptRes = await api(`/access/${accessId}`, {
        method: 'PUT',
        token: viewerToken,
        body: { action: 'accept' },
      });
      assert.equal(acceptRes.status, 200);
      assert.equal(acceptRes.json.data.status, 'accepted');
      assert.ok(acceptRes.json.data.accepted_at);

      const allowedSummary = await api(`/users/${ownerId}/summary`, { token: viewerToken });
      assert.equal(allowedSummary.status, 200);
      assert.equal(allowedSummary.json.data.user_id, ownerId);

      const revokeRes = await api(`/access/${accessId}`, {
        method: 'DELETE',
        token: ownerToken,
      });
      assert.equal(revokeRes.status, 200);
      assert.equal(revokeRes.json.data.status, 'revoked');
      assert.ok(revokeRes.json.data.revoked_at);

      const revokedSummary = await api(`/users/${ownerId}/summary`, { token: viewerToken });
      assert.equal(revokedSummary.status, 403);
    });

    // 9. Push Tokens
    let pushTokenId;
    await check('POST /me/push-tokens ve DELETE /me/push-tokens/:id', async () => {
      const regPush = await api('/me/push-tokens', {
        method: 'POST',
        token: viewerToken,
        body: {
          provider: 'fcm',
          platform: 'android',
          installation_id: 'APP-INSTALLATION-001',
          token: 'FCM_DEVICE_TOKEN_EXAMPLE_001',
        },
      });
      assert.equal(regPush.status, 201);
      assert.equal(regPush.json.data.user_id, viewerId);
      assert.equal(regPush.json.data.is_active, true);
      assert.equal(regPush.json.data.token_hash, undefined);
      pushTokenId = regPush.json.data.id;

      const delPush = await api(`/me/push-tokens/${pushTokenId}`, {
        method: 'DELETE',
        token: viewerToken,
      });
      assert.equal(delPush.status, 200);
      assert.equal(delPush.json.data.is_active, false);
      assert.ok(delPush.json.data.revoked_at);
    });

    // 10. Notifications
    await check('GET /users/me/notifications ve PUT /notifications/:id/read', async () => {
      const notifs = await api('/users/me/notifications?page=1&limit=20', { token: viewerToken });
      assert.equal(notifs.status, 200);
      assert.ok(notifs.json.data.notifications.length >= 1);
      const first = notifs.json.data.notifications[0];
      assert.equal(first.type, 'emergency');
      assert.equal(first.created_at, undefined);
      assert.equal(first.updated_at, undefined);

      const readRes = await api(`/notifications/${first.id}/read`, {
        method: 'PUT',
        token: viewerToken,
        body: {},
      });
      assert.equal(readRes.status, 200);
      assert.equal(readRes.json.data.id, first.id);
      assert.ok(readRes.json.data.read_at);
    });

    console.log(`\n🎉 TÜM TESTLER BAŞARIYLA GEÇTİ (${passed}/${passed})`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await pool.end();
  }
};

runTests().catch((err) => {
  console.error('❌ Test başarısız:', err);
  process.exit(1);
});
