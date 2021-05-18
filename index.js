const fs = require('fs');
const YAML = require('yaml');
const WaxWrapper = require('./waxWrapper');
const { Telegraf } = require('telegraf');
const log = require('./logger');
const chalk = require('chalk');
const db = require('./database');
const cluster = require('cluster');
const equal = require('deep-equal');

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

if (cluster.isMaster) {
    log('=== Starting Up TeleWAX... ===', chalk.magentaBright);

    db.init();

    const bot = new Telegraf(config.botToken);
    
    bot.command('quit', (ctx) => {
        ctx.telegram.leaveChat(ctx.message.chat.id);
    
        ctx.leaveChat();
    });
    
    bot.command('test', async (ctx) => {
        await bot.telegram.sendMessage(config.telegramUserId, 'lol!?');
        await ctx.reply('lol');
    });
    
    bot.command('course', async (ctx) => {
        let [tlm_rub, tlm_usd] = await wax.getTokenPrice(wax.URL.GET_TLM_PRICE);
        let [wax_rub, wax_usd] = await wax.getTokenPrice(wax.URL.GET_WAX_PRICE);
    
        await bot.telegram.sendMessage(ctx.chat.id, 
        `<b><a href=\"${wax.URL.COINGECKO_WAX_PAGE}\">WAX</a> -> USD: ${wax_usd}$</b>\n` +
        `<b><a href=\"${wax.URL.COINGECKO_WAX_PAGE}\">WAX</a> -> RUB: ${wax_rub}₽</b>\n` +
        `<b><a href=\"${wax.URL.COINGECKO_TLM_PAGE}\">TLM</a> -> USD: ${tlm_usd}$</b>\n` +
        `<b><a href=\"${wax.URL.COINGECKO_TLM_PAGE}\">TLM</a> -> RUB: ${tlm_rub}₽</b>\n`, 
        {
            parse_mode: 'HTML',
            disable_web_page_preview: true
        }
        );
    });
    
    bot.command('accstat', async (ctx) => {
        let args = ctx.message.text.split(' ');
        args.shift();

        if (!args[0]) {
            return ctx.reply('Пиздуй нахуй')
        } else if (!config.accounts.includes(args[0])) {
            return ctx.reply('Нету такого акка дура')
        }

        let accounts_dump = db.get_table('accounts');
        let account_dump = accounts_dump.find(x => x.name == args[0]);
        
        if (!account_dump) return ctx.reply('Пососи дура');
        await ctx.reply('Loading... Wait 1-5 mins...');

        let account_assets = JSON.parse(account_dump.assets);
        let account_tokens = JSON.parse(account_dump.tokens);

        let total_rub = 0;
        let total_usd = 0;

        let str = 
        `<b>Account: ${args[0]}\n` +
        `NFTs: ${account_assets.length}\n` +
        `Tokens:\n`;

        let [tlm_rub, tlm_usd] = await wax.getTokenPrice(wax.URL.GET_TLM_PRICE);
        await sleep(config.timeout * 1000);
        let [wax_rub, wax_usd] = await wax.getTokenPrice(wax.URL.GET_WAX_PRICE);

        account_tokens.forEach(token => {
            switch (token.symbol) {
                case 'TLM':
                    str += `TLM: ${token.amount.toFixed(4)} (${token.amount * tlm_usd}$) (${token.amount * tlm_rub}₽)\n`;

                    total_rub += token.amount * tlm_rub;
                    total_usd += token.amount * tlm_usd;
                    break
                case 'WAX':
                    str += `WAX: ${token.amount.toFixed(4)} (${token.amount * wax_usd}$) (${token.amount * wax_rub}₽)\n`;

                    total_rub += token.amount * wax_rub;
                    total_usd += token.amount * wax_usd;
                    break
                case 'TOTAL_STAKED':
                    str += `TOTAL_STAKED: ${token.amount.toFixed(4)} (${token.amount * wax_usd}$) (${token.amount * wax_rub}₽)\n`;

                    total_rub += token.amount * wax_rub;
                    total_usd += token.amount * wax_usd;
                    break
                default:
                    str += `${token.symbol}: ${token.amount.toFixed(4)}`;
                    break
            }
        });

        str += '\n\n';
        assets_names = {};

        account_assets.forEach(asset => {
            
        });
    });
    
    bot.launch();

    let worker = cluster.fork();
    
    worker.on('message', async (msg) => {
        await sleep(config.timeout * 1000);
        await bot.telegram.sendMessage(config.telegramUserId, msg,
        {
            parse_mode: 'HTML',
            disable_web_page_preview: true
        }
        );
    });

    // Enable graceful stop
    process.once('SIGINT', () => {
        log('=== Shutting Down TeleWAX... ===', chalk.magentaBright);
        try {
            worker.disconnect();  
        } catch (e) {}
        bot.stop('SIGINT');
    });

    process.once('SIGTERM', () => {
        log('=== Shutting Down TeleWAX... ===', chalk.magentaBright);
        try {
            worker.disconnect();  
        } catch (e) {}
        bot.stop('SIGTERM');
    });
} else {
    infLoop();
}

function exists(path) {  
    try {
      fs.accessSync(path)
      return true
    } catch {
      return false
    }
}

function sleep(n) {
    return new Promise(done => {
      setTimeout(() => {
        done();
      }, n);
    });
}

async function infLoop() {
    let accounts = config.accounts;
    let accounts_dump = db.get_table('accounts');

    accounts.forEach(async (account, index) => {
        await sleep(config.timeout * 1000);
        let account_dump = accounts_dump.find(x => x.name == account);

        if (!account_dump) {
            db.add_account(account, '[]', '[]');
            account_dump = {
                name: account,
                assets: '[]',
                tokens: '[]'
            }
        }

        let [tokens, nfts] = wax.getURL(account);

        await sleep(config.timeout * 1000);
        let tokens_response = await wax.getAccountTokens(tokens);

        await sleep(config.timeout * 1000);
        let resourses = await wax.getRecources(wax.URL.RESOURCES, account);

        tokens_response.push({
            symbol: 'TOTAL_STAKED',
            amount: resourses.total_staked
        });

        await sleep(config.timeout * 1000);
        let nfts_response = await wax.getAccountNfts(nfts);

        await sleep(config.timeout * 1000);
        let assets = Object.keys(wax.getAssets(nfts_response));

        // Tokens notification
        let isNewToken = false;
        let account_tokens = JSON.parse(account_dump.tokens);
        if (!equal(account_tokens, tokens_response)) {
            tokens_response.forEach(token => {
                sleep(config.timeout * 1000).then(e => {
                    if (!account_tokens.find(x => x.symbol == token.symbol)) {
                        if(config.tokenNotification) {
                            process.send(
                                '<b>New token deposit to your wallet:\n' +
                                `Account: <code>${account}</code>\nToken: ${token.symbol} - ${token.amount.toFixed(4)}</b>`
                            );
                        }
                        log(`New token deposit to your wallet ${account}: ${token.symbol} - ${token.amount.toFixed(4)}`, chalk.greenBright);
    
                        db.update_account(account, JSON.stringify(tokens_response), 'tokens');
                        isNewToken = true;
                    }
                });
            });

            if (isNewToken == false) {
                account_tokens.forEach((token, index) => {
                    sleep(config.timeout * 1000).then(e => {
                        let newToken = tokens_response.find(x => x.symbol == token.symbol);
                        if (newToken.amount > token.amount) {
                            let amountDiff = parseFloat(newToken.amount.toFixed(4)) - parseFloat(token.amount.toFixed(4));
    
                            if (amountDiff <= 0.0001 & newToken.symbol == 'TLM') {
                                process.send(
                                    `<b>Account: <code>${account}</code>\n` +
                                    `+${amountDiff.toFixed(4)} TLM\n` +
                                    `Seems like account was flagged...</b>`
                                );
                            } else {
                                if(config.tokenNotification) {
                                    process.send(
                                        `<b>Account: <code>${account}</code>\n` +
                                        `+${amountDiff.toFixed(4)} ${newToken.symbol} [${newToken.amount.toFixed(4)}]</b>`
                                    );
                                }
                            }
    
                            account_tokens[index] = newToken;
                            db.update_account(account, JSON.stringify(account_tokens), 'tokens');
                            
                            log(`Account ${account} added new funds: +${amountDiff.toFixed(4)} ${newToken.symbol} [${newToken.amount.toFixed(4)}]`, chalk.greenBright);
                        } else if (newToken.amount < token.amount) {
                            let amountDiff = parseFloat(token.amount.toFixed(4)) - parseFloat(newToken.amount.toFixed(4));
    
                            if(config.tokenNotification) {
                                process.send(
                                    `<b>Account: <code>${account}</code>\n` +
                                    `-${amountDiff.toFixed(4)} ${newToken.symbol} [${newToken.amount.toFixed(4)}]</b>`
                                );
                            }
    
                            account_tokens[index] = newToken;
                            db.update_account(account, JSON.stringify(account_tokens), 'tokens');
                            
                            log(`Account ${account} removed/transfered funds: -${amountDiff.toFixed(4)} ${newToken.symbol} [${newToken.amount.toFixed(4)}]`, chalk.greenBright);   
                        }
                    });
                });
            };
        }

        if ((index + 1) == accounts.length) {
            await infLoop();
        }
    });
}