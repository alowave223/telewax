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
                    str += `TLM: ${token.amount.toFixed(4)} (${(token.amount * tlm_usd).toFixed(2)}$) (${(token.amount * tlm_rub).toFixed(2)}₽)\n`;

                    total_rub += token.amount * tlm_rub;
                    total_usd += token.amount * tlm_usd;
                    break
                case 'WAX':
                    str += `WAX: ${token.amount.toFixed(4)} (${(token.amount * wax_usd).toFixed(2)}$) (${(token.amount * wax_rub).toFixed(2)}₽)\n`;

                    total_rub += token.amount * wax_rub;
                    total_usd += token.amount * wax_usd;
                    break
                case 'TOTAL_STAKED':
                    str += `TOTAL_STAKED: ${token.amount.toFixed(4)} (${(token.amount * wax_usd).toFixed(2)}$) (${(token.amount * wax_rub).toFixed(2)}₽)\n`;

                    total_rub += token.amount * wax_rub;
                    total_usd += token.amount * wax_usd;
                    break
                default:
                    str += `${token.symbol}: ${token.amount.toFixed(4)}\n`;
                    break
            }
        });

        str += '\n';
        assets_names = {};

        for (let i in account_assets) {
            let asset = account_assets[i];

            let parsed = await wax.fetchAsset(asset);
            if (!Object.keys(assets_names).includes(parsed.name)) {
                assets_names[parsed.name] = {
                    count: 1,
                    info: parsed
                }
            } else {
                assets_names[parsed.name].count++;
            }
        }

        for (let i in assets_names) {
            let asset = assets_names[i];
            await sleep(config.timeout * 1000);

            let price = await wax.getPrice(asset.info.template_id);

            if (asset.count > 1) {
                str += `${i} - ${asset.count} pcs. ${price} WAX (~${(price * asset.count).toFixed(2)} WAX)\n`;
            } else {
                str += `${i} - ${asset.count} pcs. ${price} WAX\n`;
            }

            total_rub += price * wax_rub;
            total_usd += price * wax_usd;
        }

        str += 
        `\nAccount total RUB price: ${total_rub.toFixed(2)} RUB\n` +
        `Account total USD price: ${total_usd.toFixed(2)} USD</b>`;

        await bot.telegram.sendMessage(config.telegramUserId, str,
        {
            parse_mode: 'HTML',
            disable_web_page_preview: true
        }
        );
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

    for (let index in accounts) {
        let account = accounts[index];

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
            for (let i in tokens_response) {
                let token = tokens_response[i];

                await sleep(config.timeout * 1000);

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
            }

            if (isNewToken == false) {
                for (let i in account_tokens) {
                    let token = account_tokens[i];

                    await sleep(config.timeout * 1000);

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

                        account_tokens[i] = newToken;
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

                        account_tokens[i] = newToken;
                        db.update_account(account, JSON.stringify(account_tokens), 'tokens');
                        
                        log(`Account ${account} removed/transfered funds: -${amountDiff.toFixed(4)} ${newToken.symbol} [${newToken.amount.toFixed(4)}]`, chalk.greenBright);   
                    }
                }
            };
        }

        // NFTs notifications
        let account_assets = JSON.parse(account_dump.assets);
        if (!equal(account_assets, assets)) {
            let new_assets = assets.filter(x => !account_assets.includes(x));
            let deleted_assets = account_assets.filter(x => !assets.includes(x));

            if (new_assets.length > 0) {
                let str =
                `<b>New NFTs:\n` +
                `Account: <code>${account}</code></b>\n\n`;

                let price_sum = 0;

                for (let i in new_assets) {
                    let asset = new_assets[i];

                    await sleep(config.timeout * 1000);

                    let parsed = await wax.fetchAsset(asset);
                    let price = await wax.getPrice(parsed.template_id);

                    str += 
                    `<b>Asset: ${asset}\n` +
                    `Name: ${parsed.name}\n` +
                    `Rarity: ${parsed.rarity}\n` +
                    `Price: ${price} WAX</b>\n\n`

                    log(`New NFT on account ${account}: ID: ${asset} NAME: ${parsed.name} PRICE: ${price} WAX`, chalk.blueBright);
                    price_sum += price;
                }

                if (config.nftsNotification) {
                    str += `<b>+${price_sum.toFixed(2)} WAX</b>`
                    process.send(str);
                }

                db.update_account(account, JSON.stringify(assets), 'assets');
            } else if(deleted_assets.length) {
                let str =
                `<b>Transfer/Remove NFTs:\n` +
                `Account: <code>${account}</code></b>\n\n`;

                let price_sum = 0;
                for (let i in deleted_assets) {
                    let asset = deleted_assets[i];

                    await sleep(config.timeout * 1000);

                    let parsed = await wax.fetchAsset(asset);
                    let price = await wax.getPrice(parsed.template_id);

                    str += 
                    `<b>Asset: ${asset}\n` +
                    `Name: ${parsed.name}\n` +
                    `Rarity: ${parsed.rarity}\n` +
                    `Price: ${price} WAX</b>\n\n`

                    log(`Removed/Transfered NFT on account ${account}: ID: ${asset} NAME: ${parsed.name} PRICE: ${price} WAX`, chalk.blueBright);
                    price_sum += price;
                }

                if (config.nftsNotification) {
                    str += `<b>-${price_sum.toFixed(2)} WAX</b>`
                    process.send(str);
                }

                db.update_account(account, JSON.stringify(assets), 'assets');
            }
        }

        if ((index + 1) == accounts.length) {
            await infLoop();
        }
    }
}