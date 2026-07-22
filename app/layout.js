import './globals.css';

export const metadata = {
  title: 'CoachVault',
  description: 'The home for everything a coach knows and chooses to teach.'
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
