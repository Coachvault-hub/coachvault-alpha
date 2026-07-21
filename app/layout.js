import './globals.css';

export const metadata = {
  title: 'CoachVault',
  description: 'The coaching command center for better practices, teams, and seasons.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
