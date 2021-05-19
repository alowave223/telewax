const axios = (require('axios').default).create({
    timeout: 10000
});

const atomicassetsHeaders = {
    "Accept" : "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
    "Accept-Encoding" : "gzip, deflate",
    "Accept-Language" : "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
    "Cache-Control" : "max-age=0",
    "Connection" : "keep-alive",
    "DNT" : "1",
    "Host" : "wax.api.atomicassets.io",
    "Upgrade-Insecure-Requests" : "1",
    "User-Agent" : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.85 Safari/537.36"
}

const URL = {
    WAX_TOKEN : "https://wax.greymass.com/v1/chain/get_currency_balance",
    TOKENS : "https://wax.eosrio.io/v2/state/get_tokens?account=%account%",
    NFTS : "https://wax.api.atomicassets.io/atomicassets/v1/assets?owner=%account%&page=1&limit=100000&order=desc&sort=asset_id",
    WAX : "https://wax.bloks.io/account/",
    ATOMIC : "https://wax.atomichub.io/profile/",
    ASSETS : 'https://wax.api.atomicassets.io/atomicassets/v1/assets/',
    RESOURCES : "https://wax.greymass.com/v1/chain/get_account",
    GET_PRICE : "https://wax.api.atomicassets.io/atomicmarket/v1/sales",
    GET_WAX_PRICE : 'https://api.coingecko.com/api/v3/coins/wax',
    GET_TLM_PRICE : 'https://api.coingecko.com/api/v3/coins/alien-worlds',

    COINGECKO_WAX_PAGE : "https://www.coingecko.com/ru/%D0%9A%D1%80%D0%B8%D0%BF%D1%82%D0%BE%D0%B2%D0%B0%D0%BB%D1%8E%D1%82%D1%8B/wax",
    COINGECKO_TLM_PAGE : "https://www.coingecko.com/ru/%D0%9A%D1%80%D0%B8%D0%BF%D1%82%D0%BE%D0%B2%D0%B0%D0%BB%D1%8E%D1%82%D1%8B/alien-worlds",
}

const db = require('./database');

module.exports = class waxWrapper {
    constructor(config) {
        this.config = config;
    }

    URL = URL;
    
    async getTokenPrice(URL) {
        let success = false;
        let response;

        for (let _ in [...Array(3).keys()]) {
            try {
                response = await axios.get(URL);
                success = true;
                break;
            } catch (e) {
                continue
            }
        }

        if (success == false)
            return [
                0,
                0
            ]

        let data = response.data;

        return [
            data.market_data.current_price.rub,
            data.market_data.current_price.usd
        ];
    }

    async getAccountTokens(URL, account) {
        let success = false;
        let response;

        for (let _ in [...Array(3).keys()]) {
            try {
                response = await axios.get(URL);
                success = true;
                break;
            } catch (e) {
                continue
            }
        }

        if (success == false)
            return db.get_tokens(account);

        let data = response.data;

        return data.tokens;
    }

    async getAccountNfts(URL) {
        let success = false;
        let response;

        for (let _ in [...Array(3).keys()]) {
            try {
                response = await axios.get(URL, {
                    headers: atomicassetsHeaders,
                    timeout: 10000
                });
                success = true;
                break;
            } catch (e) {
                continue
            }
        }

        if (success == false)
            return null;

        let data = response.data;

        return data.data;
    }

    async getRecources(URL, account) {
        let success = false;
        let response;

        for (let _ in [...Array(3).keys()]) {
            try {
                response = await axios.get(URL, {
                    data: {
                        account_name: account
                    }
                });
                success = true;
                break;
            } catch (e) {
                continue
            }
        }

        if (success == false)
            return null

        let data = response.data;

        let cpu = parseInt((data.cpu_limit.used / data.cpu_limit.max * 100).toFixed(2));
        let net = parseInt((data.net_limit.used / data.net_limit.max * 100).toFixed(2));
        let ram = parseInt((data.ram_usage / data.ram_quota * 100).toFixed(2));
        let cpu_staked;
        let ram_bytes;
        let net_staked;
        let total_staked;

        if ("total_resources" in data) {
            cpu_staked = parseFloat(parseFloat(data.total_resources.cpu_weight.substr(0, data.total_resources.cpu_weight.length - 5)).toFixed(2));
            net_staked = parseFloat(parseFloat(data.total_resources.net_weight.substr(0, data.total_resources.cpu_weight.length - 5)).toFixed(2));
            ram_bytes = data.total_resources.ram_bytes;
        } else {
            cpu_staked = 0;
            net_staked = 0;
            ram_bytes = 0;
        }

        if ("voter_info" in data) {
            let before = data.voter_info.staked.toString().length > 8 ? data.voter_info.staked.toString().substr(0, data.voter_info.staked.toString().length - 8) : '0';
            let after = data.voter_info.staked.toString().substr(data.voter_info.staked.toString().length - 8, data.voter_info.staked.toString().length - 6);
            total_staked = parseFloat(before + '.' + after);
        } else {
            total_staked = 0
        }

        return {
            cpu: cpu,
            net: net,
            ram: ram,
            cpu_staked: cpu_staked,
            ram_bytes: ram_bytes,
            net_staked: net_staked,
            total_staked: total_staked
        }

    }

    async getPrice(template_id) {
        let success = false;
        let response;

        for (let _ in [...Array(3).keys()]) {
            try {
                response = await axios.get(this.URL.GET_PRICE, {
                    data: {
                        "state":"1",
                        "template_id": template_id.toString(),
                        "order": "asc",
                        "sort": "price",
                        "limit": "1",
                        "symbol": "WAX"
                    },
                    timeout: 10000
                });
                success = true;
                break
            } catch (e) {
                continue
            }
        }

        if (success == false)
            return 0;

        let data = response.data.data;
        let price = data[0].listing_price;

        let before = price.length > 8 ? price.substr(0, price.length - 8) : '0';
        let after = price.substr(price.length - 8, price.length - 6);

        return parseFloat(before + '.' + after);
    }

    async fetchAsset(asset_id) {
        let indb = db.get_asset(asset_id);

        if (indb != undefined) {
            return indb;
        } else {
            let success = false;
            let asset_response;
    
            for (let _ in [...Array(3).keys()]) {
                try {
                    asset_response = await axios.get(URL, {
                        headers: atomicassetsHeaders,
                        timeout: 10000
                    });
                    success = true;
                    break;
                } catch (e) {
                    continue
                }
            }

            if (success == false)
                return null;

            let asset = asset_response.data.data;

            let collection_name = asset.collection != undefined || asset.collection ? asset.collection.name : "";

            let info = {
                asset_id: asset_id,
                contract: asset.contract,
                collection_name: collection_name,
                name: asset.name,
                template_id: asset.template != undefined ? asset.template.template_id : "",
                rarity: collection_name == 'Alien Worlds' ? asset.data.rarity : ""
            };

            db.add_asset(
                info.asset_id,
                info.name,
                info.rarity,
                info.contract,
                info.collection_name,
                info.template_id
            );

            return info;
        }
    }

    getAssets(nfts_response) {
        let res = {};

        nfts_response.forEach(asset => {
            let asset_id = asset.asset_id;
            let collection_name = asset.collection != undefined || asset.collection ? asset.collection.name : "";

            let info = {
                contract: asset.contract,
                collection_name: collection_name,
                name: asset.name,
                template_id: asset.template != undefined ? asset.template.template_id : "",
                rarity: collection_name == 'Alien Worlds' ? asset.data.rarity : ""
            };

            res[asset_id] = info;

            if (!db.get_asset(asset_id)) {
                db.add_asset(
                    asset_id,
                    info.name,
                    info.rarity,
                    info.contract,
                    info.collection_name,
                    info.template_id
                );
            };
        });

        return res
    }

    getURL(account) {
        return [
            this.URL.TOKENS.replace('%account%', account),
            this.URL.NFTS.replace('%account%', account)
        ]
    }
}