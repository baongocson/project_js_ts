import { mergeConfig } from 'vite';
import appConfig from '../../vite.config';
// Browser profiles/artifacts stay in frontend but must not become watched source.
export default mergeConfig(appConfig, {
  envDir: false,
  // Same-origin production fixture: Vite's default Vary: Origin makes precached
  // no-Origin fetches differ from crossorigin module requests during offline reload.
  preview: { cors: false },
  server: { watch: { ignored: ['**/.artifact-work/**', '**/test-results/**'] } },
});
