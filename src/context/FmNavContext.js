import { createContext } from 'react';

export const FmNavContext = createContext({
  current: 'Dashboard',
  navigate: () => {},
});
