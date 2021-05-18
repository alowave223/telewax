const chalk = require('chalk');
const fs = require('fs');

module.exports = function log(text, color) {
    let time = new Date().toLocaleTimeString();

    if (!exists('./logs.log')) {
        fs.writeFileSync('./logs.log', '');
    }

    console.log(chalk.blackBright('[' + time + '] ') + color(text));

    fs.writeFileSync('./logs.log', '[' + time + '] ' + text + '\n', {flag: 'a'});
}

function exists(path) {  
    try {
      fs.accessSync(path)
      return true
    } catch {
      return false
    }
}