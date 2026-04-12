import manifest from './extension.config.json';
import contentDefaults from './content.defaults.json';
import { setup } from './setup.js';

const components = import.meta.glob('./components/**/*.{vue,js}');

export default { manifest, components, contentDefaults, setup };
export { manifest, contentDefaults, setup };
