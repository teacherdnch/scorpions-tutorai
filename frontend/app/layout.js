import './globals.css';

export const metadata = {
  title: 'Tutorai — AI-Powered Learning',
  description: 'Take AI-generated tests, track progress, and get personalised study recommendations.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
