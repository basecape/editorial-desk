import './globals.css';

export const metadata = {
  title: 'The Editorial Desk',
  description: 'South African health publication workflow',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en-ZA">
      <body>{children}</body>
    </html>
  );
}
