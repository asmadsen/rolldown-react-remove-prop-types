# rolldown-react-remove-prop-types

> Rolldown plugin to remove React PropTypes from production builds

Port of [babel-plugin-transform-react-remove-prop-types](https://github.com/oliviertassinari/babel-plugin-transform-react-remove-prop-types) for Rolldown (with Rollup compatibility).

## Features

- 🚀 **Primary support for Rolldown** with Plugin Hook Filters
- 🔄 **Rollup compatible** via adapter export
- ⚡ **Fast** - Uses Rolldown's native performance
- 🎯 **Precise** - Removes only PropTypes, keeps everything else
- 🔧 **Flexible** - Multiple removal modes

## Installation

```bash
npm install --save-dev rolldown-react-remove-prop-types
# or
pnpm add -D rolldown-react-remove-prop-types
# or
yarn add -D rolldown-react-remove-prop-types
```

## Usage

### Rolldown

```js
// rolldown.config.js
import removePropTypes from 'rolldown-react-remove-prop-types';

export default {
  plugins: [
    removePropTypes({
      mode: 'remove', // default
    }),
  ],
};
```

### Rollup

```js
// rollup.config.js
import removePropTypes from 'rolldown-react-remove-prop-types/rollup';

export default {
  plugins: [
    removePropTypes({
      mode: 'remove', // default
    }),
  ],
};
```

## Options

### `mode`

- `'remove'` (default): Completely removes propTypes definitions
- `'wrap'`: Wraps propTypes with `process.env.NODE_ENV !== "production" ? {...} : {}`
- `'unsafe-wrap'`: Wraps with `if (process.env.NODE_ENV !== "production") {...}`

```js
removePropTypes({ mode: 'remove' })
```

### `removeImport`

- `true`: Remove PropTypes imports when mode is `'remove'`
- `false` (default): Keep imports

```js
removePropTypes({
  mode: 'remove',
  removeImport: true,
})
```

### `include` / `exclude`

Standard Rollup filter patterns.

```js
removePropTypes({
  include: 'src/**/*.{js,jsx,ts,tsx}',
  exclude: 'node_modules/**',
})
```

### `ignoreFilenames`

Array of patterns to ignore. Creates a RegExp with patterns joined by `|`.

```js
removePropTypes({
  ignoreFilenames: ['node_modules'],
})
```

### `additionalLibraries`

Additional PropTypes-like libraries to remove.

```js
removePropTypes({
  additionalLibraries: ['react-immutable-proptypes'],
})
```

### `classNameMatchers`

Custom class names to treat as React components.

```js
removePropTypes({
  classNameMatchers: ['BaseComponent'],
})
```

## Example Transformations

### Input

```jsx
const Baz = (props) => <div {...props} />;

Baz.propTypes = {
  className: PropTypes.string
};
```

### Output (mode: 'remove')

```jsx
const Baz = (props) => <div {...props} />;
```

### With Comment Annotation

Force removal with comment:

```js
Component.propTypes /* remove-proptypes */ = {}
```

## License

MIT
