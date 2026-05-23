import { registerRootComponent } from 'expo';
import App from './App';

// registerRootComponent associates the main App component with the Expo entry flow,
// ensuring accurate resolution in monorepos without module-hoisting path issues.
registerRootComponent(App);
