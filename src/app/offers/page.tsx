import Image from "next/image";
import Link from "next/link";
import { SITE_OFFERS } from "@/lib/offers";

export const metadata = {
  title: "Offers — Klasshi",
  description: "First deposit bonus and referral rewards on Klasshi.",
};

export default function OffersPage() {
  return (
    <main className="promo-page offers-page">
      <section className="promo-hero promo-hero--visual">
        <div className="promo-hero__media" aria-hidden>
          <Image
            src="/games/crash.jpg"
            alt=""
            fill
            priority
            className="promo-hero__img"
            sizes="100vw"
          />
          <div className="promo-hero__veil" />
        </div>
        <div className="promo-hero__copy">
          <p className="promo-kicker">Promotions</p>
          <h1>Offers</h1>
          <p className="promo-lead">
            Active bonuses for new deposits and inviting friends.
          </p>
        </div>
      </section>

      <div className="offers-grid">
        {SITE_OFFERS.map((offer) => (
          <article key={offer.id} className="offer-card">
            <div className="offer-card__media">
              <Image
                src={offer.image}
                alt=""
                fill
                className="offer-card__img"
                sizes="(max-width: 820px) 100vw, 420px"
              />
            </div>
            <header className="offer-card__top">
              <div>
                <p className="offer-card__eyebrow">{offer.eyebrow}</p>
                <h2>{offer.title}</h2>
              </div>
              <p className="offer-card__amount">{offer.amount}</p>
            </header>

            <p className="offer-card__summary">{offer.summary}</p>

            <details className="offer-card__terms">
              <summary>Terms</summary>
              <ul>
                {offer.details.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              {offer.finePrint ? (
                <p className="offer-card__fine">{offer.finePrint}</p>
              ) : null}
            </details>

            <Link href={offer.ctaHref} className="btn btn--primary offer-card__cta">
              {offer.ctaLabel}
            </Link>
          </article>
        ))}
      </div>
    </main>
  );
}
