const fs = require('fs');
const YAML = require('yaml');
const WaxWrapper = require('./waxWrapper');
const { Telegraf } = require('telegraf');
const log = require('./logger');
const chalk = require('chalk');

log('=== Starting Up TeleWAX... ===', chalk.magentaBright);

if (!exists('./config.yml')) {
    fs.writeFileSync('./config.yml', fs.readFileSync('./data/config-sample.yml', 'utf-8'), {
        encoding: 'utf-8'
    });

    log('Succesfully generated config.yml', chalk.yellow);
    log('Please, configure your TeleWAX before restarting this.', chalk.yellow);

    return process.emit('SIGINT');
}

const config = YAML.parse(fs.readFileSync('./config.yml', 'utf-8'));
const wax = new WaxWrapper(config);

const bot = new Telegraf(config.botToken);

wax.test('sd');

bot.command('quit', (ctx) => {
    ctx.telegram.leaveChat(ctx.message.chat.id);

    ctx.leaveChat();
});

bot.command('test', async (ctx) => {
    await bot.telegram.sendMessage(config.telegramUserId, 'lol!?');
    await ctx.reply('lol');
});

bot.launch();

// Enable graceful stop
process.once('SIGINT', () => {
    log('=== Shutting Down TeleWAX... ===', chalk.magentaBright);
    bot.stop('SIGINT');
});

process.once('SIGTERM', () => {
    log('=== Shutting Down TeleWAX... ===', chalk.magentaBright);
    bot.stop('SIGTERM');
});

function exists(path) {  
    try {
      fs.accessSync(path)
      return true
    } catch {
      return false
    }
}