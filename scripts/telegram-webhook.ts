#!/usr/bin/env npx tsx

/**
 * Script para configurar o webhook do Telegram
 *
 * Uso:
 *   npx tsx scripts/telegram-webhook.ts info          # Ver info do webhook atual
 *   npx tsx scripts/telegram-webhook.ts set <URL>     # Configurar webhook
 *   npx tsx scripts/telegram-webhook.ts delete        # Remover webhook
 */

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8448466741:AAHx9PtZPxvGP6dK1IJsN38IA_-i45qpnpU";
const BASE_URL = `https://api.telegram.org/bot${TOKEN}`;

async function getWebhookInfo() {
  const response = await fetch(`${BASE_URL}/getWebhookInfo`);
  const data = await response.json();

  console.log("\n📡 Webhook Info:\n");
  console.log(JSON.stringify(data, null, 2));

  if (data.result?.url) {
    console.log(`\n✅ Webhook configurado: ${data.result.url}`);
  } else {
    console.log("\n⚠️  Nenhum webhook configurado");
  }

  return data;
}

async function setWebhook(url: string, secret?: string) {
  const body: Record<string, string> = { url };

  if (secret) {
    body.secret_token = secret;
  }

  const response = await fetch(`${BASE_URL}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  console.log("\n🔧 Set Webhook Result:\n");
  console.log(JSON.stringify(data, null, 2));

  if (data.ok) {
    console.log(`\n✅ Webhook configurado com sucesso!`);
    console.log(`   URL: ${url}`);
  } else {
    console.log(`\n❌ Erro ao configurar webhook: ${data.description}`);
  }

  return data;
}

async function deleteWebhook() {
  const response = await fetch(`${BASE_URL}/deleteWebhook`, {
    method: "POST",
  });

  const data = await response.json();

  console.log("\n🗑️  Delete Webhook Result:\n");
  console.log(JSON.stringify(data, null, 2));

  if (data.ok) {
    console.log("\n✅ Webhook removido com sucesso!");
  }

  return data;
}

async function getMe() {
  const response = await fetch(`${BASE_URL}/getMe`);
  const data = await response.json();

  console.log("\n🤖 Bot Info:\n");
  console.log(JSON.stringify(data, null, 2));

  if (data.ok) {
    console.log(`\n✅ Bot: @${data.result.username}`);
  }

  return data;
}

async function getCommands() {
  const response = await fetch(`${BASE_URL}/getMyCommands`);
  const data = await response.json();

  console.log("\n📋 Comandos configurados:\n");
  if (data.ok && data.result.length > 0) {
    data.result.forEach((cmd: { command: string; description: string }) => {
      console.log(`  /${cmd.command} - ${cmd.description}`);
    });
  } else {
    console.log("  Nenhum comando configurado");
  }

  return data;
}

async function setCommands() {
  const commands = [
    { command: "start", description: "Iniciar o bot" },
    { command: "ajuda", description: "Ver como usar o bot" },
    { command: "desfazer", description: "Desfazer último registro" },
    { command: "cancelar", description: "Cancelar operação atual" },
  ];

  const response = await fetch(`${BASE_URL}/setMyCommands`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ commands }),
  });

  const data = await response.json();

  if (data.ok) {
    console.log("\n✅ Comandos configurados com sucesso!");
    commands.forEach((cmd) => {
      console.log(`  /${cmd.command} - ${cmd.description}`);
    });
  } else {
    console.log(`\n❌ Erro ao configurar comandos: ${data.description}`);
  }

  return data;
}

async function main() {
  const [command, ...args] = process.argv.slice(2);

  console.log("🔑 Token:", TOKEN.slice(0, 10) + "..." + TOKEN.slice(-5));

  switch (command) {
    case "info":
      await getMe();
      await getWebhookInfo();
      await getCommands();
      break;

    case "commands":
      await setCommands();
      break;

    case "set":
      const url = args[0];
      const secret = args[1];

      if (!url) {
        console.log("\n❌ Uso: npx tsx scripts/telegram-webhook.ts set <URL> [SECRET]");
        console.log("\nExemplo:");
        console.log("  npx tsx scripts/telegram-webhook.ts set https://hivebudget.com/api/telegram/webhook SEU_SECRET");
        process.exit(1);
      }

      await setWebhook(url, secret);
      await getWebhookInfo();
      break;

    case "delete":
      await deleteWebhook();
      break;

    default:
      console.log(`
📱 Telegram Webhook CLI

Comandos:
  info              Ver informacoes do bot, webhook e comandos
  commands          Configurar comandos do menu do bot
  set <URL> [SEC]   Configurar webhook (SEC = secret_token opcional)
  delete            Remover webhook

Exemplos:
  npx tsx scripts/telegram-webhook.ts info
  npx tsx scripts/telegram-webhook.ts commands
  npx tsx scripts/telegram-webhook.ts set https://hivebudget.com/api/telegram/webhook
  npx tsx scripts/telegram-webhook.ts set https://hivebudget.com/api/telegram/webhook meu_secret_token
  npx tsx scripts/telegram-webhook.ts delete
      `);
  }
}

main().catch(console.error);
