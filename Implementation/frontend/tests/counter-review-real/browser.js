// Playwright CLI expression against the owned real Vite/M00/M02/M03/M04/MySQL harness; every input is public synthetic data.
/* eslint-disable no-unused-expressions -- CLI evaluates this function expression. */
async (page) => {
  const origin = 'http://127.0.0.1:15414', output = 'output/playwright/counter-review-real/';
  const checks = [], pageErrors = [], contexts = [], commandKeys = [];
  const rawMarkers = ['Synthetic Browser Visitor', 'DEMO-BROWSER001', '+60123456789', 'DEMO-MRN-MATCH'];
  page.on('pageerror', error => pageErrors.push(error.name));
  await page.context().clearCookies(); await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto(origin + '/tests/counter-review-real/harness.html');
  await page.getByLabel('Username / Staff account').fill('review_a');
  await page.getByLabel('Password', { exact: true }).fill('Public-synthetic-review_1');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('button', { name: 'Sign out', exact: true }).waitFor();
  await page.getByRole('link', { name: 'Registration review', exact: true }).click();
  await page.getByRole('heading', { name: 'Registration review', exact: true }).waitFor();
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });

  /** Keep CSRF/cookies/entry fragment in private request memory; return only safe operational references to this script. */
  async function csrf(request) {
    const response = await request.get(origin + '/api/public/csrf');
    if (response.status() !== 200) throw new Error('Actual CSRF bootstrap failed');
    return (await response.json()).token;
  }
  async function post(request, path, data, token, key) {
    const headers = { 'X-CSRF-TOKEN': token };
    if (key) headers['Idempotency-Key'] = key;
    return request.post(origin + path, { data, headers });
  }
  /** Each visitor gets an actual independent anonymous browser jar; no private root fixture creates its registration. */
  async function submit(category) {
    const staffToken = await csrf(page.request);
    const display = await post(page.request, '/api/staff/registration-qr-sessions', { counterId: '1' }, staffToken);
    if (display.status() !== 201) throw new Error('Actual QR display creation failed');
    const current = await page.request.get(origin + '/api/staff/registration-qr-sessions/' + (await display.json()).displaySessionId + '/current');
    if (current.status() !== 200) throw new Error('Actual QR current read failed');
    const entry = (await current.json()).entryUrl.split('#entry=')[1];
    const visitor = await page.context().browser().newContext(); contexts.push(visitor);
    const visitorToken = await csrf(visitor.request);
    const exchange = await post(visitor.request, '/api/public/registration-entry/exchange', { entryToken: entry }, visitorToken);
    if (exchange.status() !== 200) throw new Error('Actual QR exchange failed');
    const formContext = (await exchange.json()).formContext;
    const schemaResponse = await post(visitor.request, '/api/public/registration-schema', { formContext }, visitorToken);
    if (schemaResponse.status() !== 200) throw new Error('Actual schema read failed');
    const schema = await schemaResponse.json();
    const formData = { fullName: rawMarkers[0], identificationType: 'TEST_ID', identificationNumber: rawMarkers[1], phone: rawMarkers[2] };
    if (category === 'PENJAGA') Object.assign(formData, { mrn: rawMarkers[3], wardCode: 'M04_WARD', relationship: 'PARENT' });
    else {
      formData[category === 'EXECUTIVE' ? 'organisation' : 'company'] = 'Synthetic Company';
      Object.assign(formData, { contactPerson: 'Synthetic Contact', destinationCode: 'M04_OFFICE' });
      formData[category === 'EXECUTIVE' ? 'visitPurpose' : category === 'VENDOR' ? 'deliveryPurpose' : 'workPurpose'] = 'Synthetic visit';
    }
    const body = { formContext, categoryCode: category, fieldSchemaVersion: schema.fieldSchemaVersion, formData,
      privacyAcknowledgement: { acknowledged: true, policyVersion: schema.privacy.policyVersion } };
    if (category === 'PENJAGA') {
      const feedback = await post(visitor.request, '/api/public/mrn-validations', { formContext, mrn: rawMarkers[3], wardCode: 'M04_WARD' }, visitorToken);
      if (feedback.status() !== 200) throw new Error('Actual mock feedback request failed');
      const reply = await feedback.json();
      if (reply.feedback !== 'MATCH') throw new Error('Frozen mock MATCH fixture failed');
      body.mrnValidationToken = reply.validationToken;
    }
    const submitted = await post(visitor.request, '/api/public/registrations', body, visitorToken, crypto.randomUUID());
    if (submitted.status() !== 201) throw new Error('Actual registration submission failed');
    const reference = (await submitted.json()).publicReference;
    const queue = await page.request.get(origin + '/api/staff/registrations?counterId=1&pageSize=50');
    if (queue.status() !== 200) throw new Error('Actual queue read failed');
    const item = (await queue.json()).items.find(item => item.publicReference === reference);
    if (!item) throw new Error('Actual submitted reference absent from queue');
    return item;
  }
  /** Audits read only visible masked UI/flags; screenshots never contain QR fragments, login input or cookies. */
  async function audit(name) {
    const result = await page.evaluate(async markers => ({
      violations: (await window.axe.run(document.body)).violations.map(item => item.id),
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
      rawMarkerVisible: markers.some(marker => document.body.textContent.includes(marker)),
      storageEmpty: localStorage.length === 0 && sessionStorage.length === 0,
      scriptCookieVisible: document.cookie.includes('HSAAS_SESSION'),
    }), rawMarkers);
    if (result.violations.length || result.horizontalOverflow || result.rawMarkerVisible || !result.storageEmpty || result.scriptCookieVisible) throw new Error('Actual UI privacy/accessibility check failed: ' + name);
    await page.screenshot({ path: output + name + '.png', fullPage: true });
    checks.push({ name, result });
  }
  async function select(item) {
    await page.getByRole('button', { name: 'Refresh queue', exact: true }).click();
    await page.locator('.review-row').filter({ hasText: item.publicReference }).click();
    await page.getByRole('heading', { name: item.publicReference, exact: true }).waitFor();
  }

  try {
    const records = {};
    for (const category of ['EXECUTIVE', 'PENJAGA', 'VENDOR', 'CONTRACTOR']) records[category] = await submit(category);
    checks.push({ name: 'four-real-public-submissions', passed: true });
    await select(records.PENJAGA);
    if (!await page.getByRole('button', { name: 'Approve registration', exact: true }).isDisabled()) throw new Error('Mock MATCH approved without staff checks');
    await audit('real-penjaga-masked-detail');
    await page.getByLabel('I compared the synthetic identity record.', { exact: true }).check();
    await page.getByLabel('I compared the synthetic MRN record.', { exact: true }).check();
    await page.getByLabel('I confirmed the synthetic ward matches.', { exact: true }).check();

    // Discard only a response after route.fetch confirms the actual server committed; do not fabricate a success or automatically retry.
    let dropFirst = true, rejectNextCsrf = true;
    const pattern = '**/api/staff/registrations/' + records.PENJAGA.id + '/verify';
    await page.route(pattern, async route => {
      commandKeys.push(route.request().headers()['idempotency-key']);
      if (dropFirst) {
        dropFirst = false; const response = await route.fetch();
        if (response.status() !== 200) throw new Error('Actual unknown-command precommit failed');
        await route.abort('failed');
      } else if (rejectNextCsrf) {
        // Send a wrong header to the actual CSRF filter; do not fulfil a synthetic 403 or change the retained key/body.
        rejectNextCsrf = false;
        await route.continue({ headers: { ...route.request().headers(), 'x-csrf-token': 'm04-disposable-wrong-csrf' } });
      } else await route.continue();
    });
    await page.getByRole('button', { name: 'Approve registration', exact: true }).click();
    await page.getByText('The review result is unconfirmed. Check its current status or retry the original command.', { exact: true }).waitFor();
    await audit('real-unknown-after-commit');
    await page.getByRole('button', { name: 'Refresh detail', exact: true }).click();
    await page.getByRole('button', { name: 'Retry original command', exact: true }).waitFor();
    if (commandKeys.length !== 1) throw new Error('GET refresh replayed a command automatically');
    const csrfDenied = page.waitForResponse(response => response.url().endsWith('/' + records.PENJAGA.id + '/verify') && response.status() === 403);
    await page.getByRole('button', { name: 'Retry original command', exact: true }).click();
    if ((await (await csrfDenied).json()).code !== 'CSRF_INVALID') throw new Error('Actual recovery CSRF boundary failed');
    await page.getByText('The original review is still unconfirmed. Check its current status or retry the original command.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Refresh detail', exact: true }).click();
    await page.getByRole('button', { name: 'Retry original command', exact: true }).waitFor();
    if (commandKeys.length !== 2) throw new Error('4xx recovery or GET created an automatic write');
    await page.getByRole('button', { name: 'Retry original command', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'Approved registration ' + records.PENJAGA.publicReference }).waitFor();
    if (commandKeys.length !== 3 || !commandKeys[0] || commandKeys.some(key => key !== commandKeys[0])) throw new Error('Original command handle changed');
    await page.unroute(pattern); checks.push({ name: 'actual-unknown-403-original-handle-recovery', sameKey: true, writes: 3 });
    await audit('real-approved-replay');

    await select(records.VENDOR); await page.setViewportSize({ width: 375, height: 812 });
    await page.getByRole('button', { name: 'Reject registration', exact: true }).click();
    const dialog = page.getByRole('dialog'); await dialog.getByRole('button', { name: 'Confirm rejection', exact: true }).click();
    await dialog.getByText('A reason is required.', { exact: true }).waitFor();
    await dialog.getByRole('combobox', { name: 'Rejection reason', exact: true }).selectOption('INFORMATION_INCOMPLETE');
    await dialog.getByRole('button', { name: 'Confirm rejection', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'Rejected registration ' + records.VENDOR.publicReference }).waitFor();
    await audit('real-rejected-mobile');

    await page.setViewportSize({ width: 1366, height: 768 }); await select(records.EXECUTIVE);
    await page.getByLabel('I compared the synthetic identity record.', { exact: true }).check();
    const other = await page.context().browser().newContext(); contexts.push(other);
    let token = await csrf(other.request);
    const login = await post(other.request, '/api/auth/login', { login: 'review_b', password: 'Public-synthetic-review_1' }, token);
    if (login.status() !== 200) throw new Error('Actual competing staff login failed'); token = await csrf(other.request);
    const competing = await post(other.request, '/api/staff/registrations/' + records.EXECUTIVE.id + '/reject',
      { expectedVersion: 0, reasonCode: 'INFORMATION_INCOMPLETE' }, token, crypto.randomUUID());
    if (competing.status() !== 200) throw new Error('Actual competing review failed');
    await page.getByRole('button', { name: 'Approve registration', exact: true }).click();
    await page.getByText('This record changed. Refresh the detail and complete the checks again.', { exact: true }).waitFor();
    if (await page.getByLabel('I compared the synthetic identity record.', { exact: true }).isChecked()) throw new Error('Conflict retained old staff evidence');
    await audit('real-version-conflict');

    // The control mutates only this owned fixture's epoch; the real next GET/guard clears authorization and cached data.
    const revoked = await page.request.post('http://127.0.0.1:15415/revoke-staff');
    if (revoked.status() !== 204) throw new Error('Owned epoch control failed');
    await page.getByRole('button', { name: 'Refresh detail', exact: true }).click();
    await page.getByRole('heading', { name: 'Registration review', exact: true }).waitFor({ state: 'hidden' });
    if (await page.locator('.review-facts').count()) throw new Error('Revoked session retained masked detail');
    checks.push({ name: 'real-epoch-revocation-clears-review', passed: true });
    if (pageErrors.length) throw new Error('Actual browser page error');
    return { scope: 'Actual M00/M02/M03/M04 HTTP and owned MySQL; synthetic data; no production/hospital acceptance', checks, pageErrors,
      nativeToolbarZoom: 'NOT_RUN', secretsReturned: false };
  } finally { for (const context of contexts) await context.close(); }
}
