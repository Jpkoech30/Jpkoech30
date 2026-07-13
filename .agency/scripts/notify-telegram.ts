#!/usr/bin/env node
// @ts-nocheck

/**
 * notify-telegram.js — Telegram Notification Sender
 *
 * Sends notifications to a Telegram chat using the Bot API.
 * Uses only built-in `https` module — zero external dependencies.
 *
 * Usage:
 *   node .agency/scripts/notify-telegram.js --message "Build complete"
 *   node .agency/scripts/notify-telegram.js --handoff
 *   node .agency/scripts/notify-telegram.js --error "Something went wrong"
 *
 * Environment:
 *   TELEGRAM_BOT_TOKEN — Bot token from @BotFather (required)
 *   TELEGRAM_CHAT_ID   — Target chat/group ID (required)
 *
 * Exit codes:
 *   0 — Message sent successfully
 *   1 — Missing args, missing env vars, or API error
 */

const https = require('https');

// ── CLI Parsing ──────────────────────────────────────────────────────────────

function parseArgs() {
    const args = process.argv.slice(2);
    const opts = { message: null, handoff: false, error: false };

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--message' && i + 1 < args.length) {
            opts.message = args[++i];
        }
        if (args[i] === '--handoff') {
            opts.handoff = true;
        }
        if (args[i] === '--error' && i + 1 < args.length) {
            opts.error = args[++i];
        }
    }

    return opts;
}

// ── Message Builder ──────────────────────────────────────────────────────────

/**
 * Build the message text based on the mode.
 * @param {object} opts - Parsed CLI options
 * @returns {string} The formatted message text
 */
function buildMessage(opts) {
    if (opts.handoff) {
        return (
            '🔄 **Task Handoff**\n\n' +
            'A new task has been handed off to an agent. Check ORCHESTRATION.md for details.\n\n' +
            `_Timestamp: ${new Date().toISOString()}_`
        );
    }

    if (opts.error) {
        return (
            '❌ **Error Alert**\n\n' +
            `${opts.error}\n\n` +
            `_Timestamp: ${new Date().toISOString()}_`
        );
    }

    // Default: generic message
    return opts.message || 'ℹ️ Notification from ZooCode Agency';
}

// ── Telegram API ─────────────────────────────────────────────────────────────

/**
 * Send a message to Telegram via the Bot API.
 *
 * Uses https.get with the sendMessage endpoint:
 *   https://api.telegram.org/bot<TOKEN>/sendMessage?chat_id=<ID>&text=<MSG>&parse_mode=Markdown
 *
 * @param {string} botToken - Telegram bot token
 * @param {string} chatId - Target chat ID
 * @param {string} text - Message text (Markdown)
 * @returns {Promise<object>} Resolves with the parsed JSON response
 */
function sendTelegramMessage(botToken, chatId, text) {
    return new Promise((resolve, reject) => {
        const encodedText = encodeURIComponent(text);
        const path = `/bot${botToken}/sendMessage?chat_id=${chatId}&text=${encodedText}&parse_mode=Markdown`;

        const options = {
            hostname: 'api.telegram.org',
            port: 443,
            path,
            method: 'GET',
        };

        const req = https.get(options, (res) => {
            let body = '';
            res.on('data', (chunk) => { body += chunk; });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    if (parsed.ok) {
                        resolve(parsed);
                    } else {
                        reject(new Error(`Telegram API error: ${parsed.description || 'Unknown error'}`));
                    }
                } catch (err) {
                    reject(new Error(`Failed to parse Telegram response: ${err.message}`));
                }
            });
        });

        req.on('error', (err) => {
            reject(new Error(`HTTPS request failed: ${err.message}`));
        });

        req.setTimeout(15000, () => {
            req.destroy();
            reject(new Error('Request timed out after 15 seconds'));
        });
    });
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
    const opts = parseArgs();

    // Validate: at least one mode is specified
    if (!opts.message && !opts.handoff && !opts.error) {
        console.error('FAIL: No message content specified.');
        console.error('Usage: node notify-telegram.js --message <text>');
        console.error('       node notify-telegram.js --handoff');
        console.error('       node notify-telegram.js --error <description>');
        process.exit(1);
    }

    // Read required environment variables
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    const missingEnv = [];
    if (!botToken) missingEnv.push('TELEGRAM_BOT_TOKEN');
    if (!chatId) missingEnv.push('TELEGRAM_CHAT_ID');

    if (missingEnv.length > 0) {
        console.error(`FAIL: Missing required environment variable(s): ${missingEnv.join(', ')}`);
        process.exit(1);
    }

    // Build the message
    const text = buildMessage(opts);

    // Send
    sendTelegramMessage(botToken, chatId, text)
        .then(() => {
            console.log('PASS: Telegram notification sent successfully');
            process.exit(0);
        })
        .catch((err) => {
            console.error(`FAIL: ${err.message}`);
            process.exit(1);
        });
}

main();
