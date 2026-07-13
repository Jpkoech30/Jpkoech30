#!/usr/bin/env node


/**
 * notify-hitl.js — Telegram HITL Notification
 *
 * Sends a Telegram message with inline approval/rejection/retry buttons
 * to alert a human operator about a task escalation.
 *
 * Contract: agency-hitl-webhook@1.0.0
 *
 * Usage:
 *   node .agency/scripts/notify-hitl.js --task <taskId> --agent <slug> --gate <name> --failCount <n> --description <text>
 *
 * Environment:
 *   HITL_TELEGRAM_BOT_TOKEN   — Telegram Bot API token
 *   HITL_TELEGRAM_CHAT_ID     — Target Telegram chat ID
 */

const https = require('https');

// ── CLI Parsing ───────────────────────────────────────────────────────────────

function parseArgs() {
    const args = process.argv.slice(2);
    const opts = { task: '', agent: '', gate: '', failCount: '0', description: '' };

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--task' && i + 1 < args.length) opts.task = args[++i];
        if (args[i] === '--agent' && i + 1 < args.length) opts.agent = args[++i];
        if (args[i] === '--gate' && i + 1 < args.length) opts.gate = args[++i];
        if (args[i] === '--failCount' && i + 1 < args.length) opts.failCount = args[++i];
        if (args[i] === '--description' && i + 1 < args.length) opts.description = args[++i];
    }

    return opts;
}

// ── Message Formatting ───────────────────────────────────────────────────────

/**
 * Build the message text using the contract template.
 * @param {object} opts
 * @returns {string}
 */
function buildMessage(opts) {
    return [
        `🚨 **Task Escalation: ${opts.task}**`,
        '',
        `**Agent:** ${opts.agent}`,
        `**Gate:** ${opts.gate}`,
        `**Failures:** ${opts.failCount}`,
        `**Description:** ${opts.description}`,
        '',
        '*Click a button to respond:*',
    ].join('\n');
}

/**
 * Build the inline keyboard markup with approval/retry/reject buttons.
 * @param {string} taskId
 * @returns {object}
 */
function buildInlineKeyboard(taskId) {
    return {
        inline_keyboard: [
            [
                { text: '✅ Approve', callback_data: `approve_${taskId}` },
                { text: '❌ Reject', callback_data: `reject_${taskId}` },
                { text: '🔄 Retry', callback_data: `retry_${taskId}` },
            ],
        ],
    };
}

// ── Telegram API ──────────────────────────────────────────────────────────────

/**
 * Send a message via the Telegram Bot API using https module.
 * @param {string} botToken
 * @param {string} chatId
 * @param {string} text
 * @param {object} replyMarkup
 * @returns {Promise<object>}
 */
function sendTelegramMessage(botToken, chatId, text, replyMarkup) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: 'Markdown',
            reply_markup: replyMarkup,
        });

        const options = {
            hostname: 'api.telegram.org',
            path: `/bot${botToken}/sendMessage`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
            },
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (_) {
                    reject(new Error(`Telegram API returned non-JSON: ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
    const opts = parseArgs();

    // Validate required args
    const missing = [];
    if (!opts.task) missing.push('--task');
    if (!opts.agent) missing.push('--agent');
    if (!opts.gate) missing.push('--gate');
    if (!opts.failCount) missing.push('--failCount');
    if (!opts.description) missing.push('--description');

    if (missing.length > 0) {
        console.error(`FAIL: Missing required argument(s): ${missing.join(', ')}`);
        console.error('Usage: node notify-hitl.js --task <taskId> --agent <slug> --gate <name> --failCount <n> --description <text>');
        process.exit(1);
    }

    // Validate environment
    const botToken = process.env.HITL_TELEGRAM_BOT_TOKEN;
    const chatId = process.env.HITL_TELEGRAM_CHAT_ID;

    if (!botToken) {
        console.error('FAIL: HITL_TELEGRAM_BOT_TOKEN environment variable is not set');
        process.exit(1);
    }

    if (!chatId) {
        console.error('FAIL: HITL_TELEGRAM_CHAT_ID environment variable is not set');
        process.exit(1);
    }

    const text = buildMessage(opts);
    const keyboard = buildInlineKeyboard(opts.task);

    console.log(`📤 Sending HITL notification for task "${opts.task}" to Telegram...`);

    sendTelegramMessage(botToken, chatId, text, keyboard)
        .then((result) => {
            if (result.ok) {
                console.log(`✅ HITL notification sent successfully (message_id: ${result.result.message_id})`);
                process.exit(0);
            } else {
                console.error(`❌ Telegram API error: ${result.description || 'Unknown error'}`);
                process.exit(1);
            }
        })
        .catch((err) => {
            console.error(`❌ Failed to send Telegram message: ${err.message}`);
            process.exit(1);
        });
}

main();

export {};
