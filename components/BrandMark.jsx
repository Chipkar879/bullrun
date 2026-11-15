export default function BrandMark({ className = '', title = 'Bull Run' }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/icon.svg" alt={title} width={32} height={32} className={className} />
  );
}