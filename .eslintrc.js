const config = {
  extends: ['pretty-standard'],
  plugins: [],
  rules: {}
};

if (process.stdin.isTTY) {
  // Enable plugin-prettier when running in a terminal. Allows us to have
  // eslint verify prettier formatting, while not being bothered by it in our
  // editors.
  config.plugins.push('prettier');
  config.rules['prettier/prettier'] = 'error';
}

module.exports = config;
