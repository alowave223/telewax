const chalk = require('chalk');
const log = require('./logger');
const db = require('better-sqlite3')('accounts.db');

function init() {
    try {
        db.prepare('SELECT 1 FROM accounts').get();
        db.prepare('SELECT 1 FROM assets').get();
    } catch {
        db.prepare('CREATE TABLE IF NOT EXISTS accounts (name TEXT NOT NULL, assets TEXT NOT NULL, tokens TEXT NOT NULL)').run();
        db.prepare('CREATE TABLE IF NOT EXISTS assets (asset_id INTEGER NOT NULL, name TEXT NOT NULL, rarity TEXT NOT NULL, contract TEXT NOT NULL, collection_name TEXT NOT NULL, template_id INTEGER NOT NULL)').run();
    }
}

function add_account(name, assets, tokens) {
    try {
        db.prepare('INSERT INTO accounts (name, assets, tokens) VALUES(?, ?, ?)').run([name, assets, tokens]);
    } catch (e) {
        log('Error was occured while adding account:\n' + e, chalk.bgRed);
    }
}

function add_asset(asset_id, name, rarity, contract, collection_name, template_id) {
    try {
        db.prepare('INSERT INTO assets (asset_id, name, rarity, contract, collection_name, template_id) VALUES(?, ?, ?, ?, ?, ?)').run([asset_id, name, rarity, contract, collection_name, template_id]);
    } catch (e) {
        log('Error was occured while adding asset:\n' + e, chalk.bgRed);
    }
}

function get_table(table) {
    try {
        return db.prepare(`SELECT * FROM ${table}`).all();
    } catch (e) {
        log('Error was occured while getting table from db:\n' + e, chalk.bgRed);
    }
}

function get_asset(asset_id) {
    try {
        return db.prepare(`SELECT * FROM assets WHERE asset_id = ?`).get([asset_id]);
    } catch (e) {
        log('Error was occured while getting asset from db:\n' + e, chalk.bgRed);
    }
}

function update_account(account, data, row) {
    try {
        return db.prepare(`UPDATE accounts SET ${row} = ? WHERE name = ?`).run([data, account]);
    } catch (e) {
        log('Error was occured while updating account db:\n' + e, chalk.bgRed);
    }
}

function get_tokens(account) {
    try {
        return db.prepare(`SELECT tokens FROM accounts WHERE name = ?`).get([account]);
    } catch (e) {
        log('Error was occured while getting tokens from db:\n' + e, chalk.bgRed);
    }
}

module.exports = { init, add_account, add_asset, get_table, get_asset, update_account, get_tokens };