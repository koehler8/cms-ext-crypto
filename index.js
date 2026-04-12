import manifest from './extension.config.json';
import contentDefaults from './content.defaults.json';

const components = import.meta.glob('./components/**/*.{vue,js}');

export default { manifest, components, contentDefaults };
export { manifest, contentDefaults };
