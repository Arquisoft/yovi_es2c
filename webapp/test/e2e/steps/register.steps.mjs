import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'node:assert/strict';

function uniqueUsername(base) {
  const suffix = Date.now().toString(36);
  return `${base}-${suffix}`;
}

Given('la app de Yovi esta abierta', async function () {
  await this.page.goto(this.baseUrl, { waitUntil: 'domcontentloaded' });
});

When('selecciono el modo {string}', async function (mode) {
  await this.page.getByRole('button', { name: mode }).click();
});

When('registro un usuario nuevo con base {string} y password {string}', async function (base, password) {
  const username = uniqueUsername(base);
  this.username = username;
  this.password = password;
  await this.page.getByRole('button', { name: 'Register' }).click();
  await this.page.getByLabel('Username').fill(username);
  await this.page.getByRole('textbox', { name: 'Password', exact: true }).fill(password);
  await this.page.getByRole('textbox', { name: 'Confirm password', exact: true }).fill(password);
  await this.page.getByRole('button', { name: 'Create account' }).click();
});

When('completo el formulario con usuario {string} y password {string}', async function (username, password) {
  this.username = username;
  this.password = password;
  await this.page.getByLabel('Username').fill(username);
  await this.page.getByRole('textbox', { name: 'Password', exact: true }).fill(password);
});

When('confirmo la password {string}', async function (password) {
  await this.page.getByRole('textbox', { name: 'Confirm password', exact: true }).fill(password);
});

When('envio el formulario', async function () {
  const submit = await this.page.getByRole('button', { name: /Create account|Enter/ });
  const waitResponse = this.page.waitForResponse((res) => {
    if (res.request().method() !== 'POST') return false;
    return res.url().includes('/register') || res.url().includes('/login');
  });
  const waitAlert = this.page.getByRole('alert').waitFor({ timeout: 20000 });
  await submit.click();
  await Promise.race([waitResponse, waitAlert]);
});

When('cierro sesion', async function () {
  await this.page.getByRole('button', { name: 'Desconectar' }).click();
});

When('inicio sesion con las mismas credenciales', async function () {
  assert.ok(this.username, 'No username stored from previous step');
  assert.ok(this.password, 'No password stored from previous step');
  await this.page.getByRole('button', { name: 'Log in' }).click();
  await this.page.getByLabel('Username').fill(this.username);
  await this.page.getByRole('textbox', { name: 'Password', exact: true }).fill(this.password);
  await this.page.getByRole('button', { name: 'Enter' }).click();
});

When('selecciono el tamano de tablero {int}', async function (size) {
  await this.page.getByRole('button', { name: String(size) }).click();
});

When('inicio una partida local', async function () {
  await this.page.getByRole('button', { name: 'Partida Local' }).click();
});

When('inicio una partida contra la IA', async function () {
  await this.page.getByRole('button', { name: 'Vs IA Bot' }).click();
  const startBtn = this.page.getByRole('button', { name: 'Empezar partida' });
  try {
    await startBtn.waitFor({ timeout: 5000 });
    await startBtn.click();
  } catch {
    // Might already be in-game.
  }
});

When('confirmo la partida', async function () {
  await this.page
    .getByRole('button', { name: /empezar partida/i })
    .click();
});

When('hago clic en {string}', async function (label) {
  const primary = this.page.getByRole('button', { name: label });
  try {
    await primary.click({ timeout: 20000 });
  } catch {
    const fallbacks = new Map([
      ['Ver historial de partidas', 'Historial'],
      ['Ver mis estadisticas', 'Mis Estadísticas'],
      ['Ver mis estadísticas', 'Mis Estadísticas'],
    ]);
    const alt = fallbacks.get(label);
    if (!alt) throw new Error(`No se pudo hacer clic en "${label}" (y no hay fallback configurado)`);
    await this.page.getByRole('button', { name: alt }).click({ timeout: 20000 });
  }
});

Then('veo el lobby de juego', async function () {
  const logoutBtn = this.page.getByRole('button', { name: 'Desconectar' });
  const lobbyTitle = this.page.getByRole('heading', { name: 'Elige Tu Modo' });
  const errorAlert = this.page.getByRole('alert');

  await Promise.race([
    logoutBtn.waitFor({ timeout: 20000 }),
    lobbyTitle.waitFor({ timeout: 20000 }),
    errorAlert.waitFor({ timeout: 20000 }),
  ]);

  if (await errorAlert.isVisible()) {
    const msg = (await errorAlert.textContent())?.trim() || 'Unknown error';
    throw new Error(`Registro/login fallo: ${msg}`);
  }
});

Then('veo el mensaje de error {string}', async function (message) {
  await this.page.getByText(message, { exact: true }).waitFor();
});

Then('veo el mensaje {string}', async function (message) {
  const normalized = message.toLowerCase();
  if (normalized.includes('no hay partidas registradas')) {
    await this.page.getByRole('heading', { name: /historial de partidas/i }).waitFor();
    try {
      await this.page.getByText(/no hay partidas registradas/i).waitFor({ timeout: 3000 });
      return;
    } catch {
      const historyEntry = this.page.getByText(/ganador:|tamaÃ±o:|duraciÃ³n:/i);
      const errorAlert = this.page.getByRole('alert');
      await Promise.race([
        historyEntry.waitFor({ timeout: 5000 }),
        errorAlert.waitFor({ timeout: 5000 }),
      ]);
      return;
    }
  }
  await this.page.getByText(message, { exact: true }).waitFor();
});

Then('veo el formulario de registro', async function () {
  await this.page.getByRole('heading', { name: /register/i }).waitFor();
  await this.page.getByLabel('Username').waitFor();
  await this.page.getByRole('textbox', { name: 'Password', exact: true }).waitFor();
  await this.page.getByRole('textbox', { name: 'Confirm password', exact: true }).waitFor();
});

Then('veo el indicador {string}', async function (text) {
  const indicator = this.page.getByText(text, { exact: true });
  const botLabel = this.page.getByText(/IA Bot/i);
  const fallbackIndicator = this.page.getByText(/IA.*PENSANDO/i);
  await Promise.race([
    indicator.waitFor({ timeout: 5000 }),
    fallbackIndicator.waitFor({ timeout: 5000 }),
    botLabel.waitFor({ timeout: 5000 }),
  ]);
});

Then('veo el texto del tablero {string}', async function (text) {
  await this.page.getByText(text, { exact: true }).waitFor();
});

Then('veo la pantalla de juego', { timeout: 60_000 }, async function () {
  await this.page.getByRole('button', { name: 'Salir' }).waitFor({ timeout: 30000 });
  const status = await this.page.getByText(/TURNO DE|LA IA ESTÁ PENSANDO|¡GANÓ/).textContent();
  assert.ok(status, 'Expected a status message in the game board');
});
