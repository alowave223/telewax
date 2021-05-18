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
    RESOURSES : "https://wax.greymass.com/v1/chain/get_account",
    GET_PRICE : "https://wax.api.atomicassets.io/atomicmarket/v1/sales",
    GET_WAX_PRICE : 'https://api.coingecko.com/api/v3/coins/wax',
    GET_TLM_PRICE : 'https://api.coingecko.com/api/v3/coins/alien-worlds',

    COINGECKO_WAX_PAGE : "https://www.coingecko.com/ru/%D0%9A%D1%80%D0%B8%D0%BF%D1%82%D0%BE%D0%B2%D0%B0%D0%BB%D1%8E%D1%82%D1%8B/wax",
    COINGECKO_TLM_PAGE : "https://www.coingecko.com/ru/%D0%9A%D1%80%D0%B8%D0%BF%D1%82%D0%BE%D0%B2%D0%B0%D0%BB%D1%8E%D1%82%D1%8B/alien-worlds",
}

module.exports = class waxWrapper {
    constructor(config) {
        this.config = config
    }
    
    test(lol) {
        test1()
        axios.get()
    }
}