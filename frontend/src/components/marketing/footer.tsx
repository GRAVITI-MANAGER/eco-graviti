import Link from 'next/link';
import Image from 'next/image';

const footerLinks = {
  Producto: [
    { label: 'Sitio web', href: '#features' },
    { label: 'Tienda', href: '#features' },
    { label: 'Reservas', href: '#features' },
  ],
  Recursos: [
    { label: 'Blog', href: '#' },
    { label: 'Ayuda', href: '#' },
    { label: 'Contacto', href: '#' },
  ],
  Legal: [
    { label: 'Terminos', href: '#' },
    { label: 'Privacidad', href: '#' },
    { label: 'Cookies', href: '#' },
  ],
};

export function MarketingFooter() {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-950 px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/Isotipo_color_NERBIS.png"
                alt="NERBIS"
                width={32}
                height={32}
                className="h-8 w-8"
              />
              <span className="text-lg font-bold tracking-tight text-white">NERBIS</span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-zinc-500">
              Tu negocio online en 30 segundos.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <p className="text-sm font-medium text-zinc-300">{category}</p>
              <ul className="mt-4 space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-zinc-500 transition-colors hover:text-zinc-300"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-zinc-800 pt-8">
          <p className="text-center text-sm text-zinc-600">
            &copy; {new Date().getFullYear()} NERBIS. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
