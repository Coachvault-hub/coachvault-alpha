import './globals.css';

export const metadata = {
  title: 'CoachVault',
  description: 'Your coaching knowledge system.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
