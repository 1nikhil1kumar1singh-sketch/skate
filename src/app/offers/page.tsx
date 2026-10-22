import Link from "next/link";
import { SITE_OFFERS } from "@/lib/offers";

export const metadata = {
  title: "Offers — Klasshi",
  description: "First deposit bonus and referral rewards on Klasshi.",
};

export default function OffersPage() {
  return (
    <main className="promo-page offers-page">
      <section className="promo-hero">
        <p className="promo-kicker">Promotions</p>
        <h1>Offers</h1>
        <p className="promo-lead">
          Active bonuses for new deposits and inviting friends.
        </p>
      </section>

      <div className="offers-grid">
        {SITE_OFFERS.map((offer) => (
          <article key={offer.id} className="offer-card">
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
