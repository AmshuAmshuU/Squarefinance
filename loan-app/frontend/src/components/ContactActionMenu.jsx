"use client";

const ContactActionMenu = ({ contact, onClose }) => {
  if (!contact) return null;

  return (
    <div className="fixed inset-0 z-[200]" onClick={onClose}>
      <div
        className="absolute bg-white rounded-full shadow-2xl border border-slate-100 p-1.5 flex items-center gap-1.5 animate-scale-up"
        style={{
          top: contact.y - 65, // Positioned above the click point
          left: Math.max(
            15,
            Math.min(
              contact.x - 60,
              (typeof window !== "undefined" ? window.innerWidth : 1200) - 175,
            ),
          ),
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <a
          href={`https://wa.me/91${contact.number.replace(/\D/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClose}
          className="w-11 h-11 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-all transform active:scale-95 shadow-sm"
          title="WhatsApp"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.445 0 .081 5.363.079 11.969c0 2.112.551 4.173 1.594 5.973L0 24l6.163-1.617a11.83 11.83 0 005.883 1.586h.005c6.604 0 11.967-5.363 11.969-11.969a11.85 11.85 0 00-3.41-8.462" />
          </svg>
        </a>

        <a
          href={`tel:${contact.number}`}
          onClick={onClose}
          className="w-11 h-11 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-all transform active:scale-95 shadow-sm"
          title="Call Now"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
            />
          </svg>
        </a>

        <a
          href={`sms:${contact.number}`}
          onClick={onClose}
          className="w-11 h-11 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center hover:bg-orange-100 transition-all transform active:scale-95 shadow-sm"
          title="Send SMS"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        </a>
      </div>
    </div>
  );
};

export default ContactActionMenu;
