export default function Footer() {
  return (
    <footer className="border-t border-bull-line bg-bull-surface py-6 mt-12 text-center text-xs text-bull-muted">
      <p>&copy; {new Date().getFullYear()} Bull Run. All rights reserved.</p>
    </footer>
  );
}
