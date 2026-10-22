import {
  BONUS_MATCH_BPS,
  BONUS_MAX_USDC,
  BONUS_MIN_DEPOSIT_USDC,
} from "@/lib/bonus";
import { REFERRAL_REWARD_USD, REFERRAL_UNLOCK_DAYS } from "@/lib/referral";

export type OfferCard = {
  id: string;
  eyebrow: string;
  title: string;
  amount: string;
  summary: string;
  details: string[];
  finePrint?: string;
  ctaLabel: string;
  ctaHref: string;
};

export const FIRST_DEPOSIT_OFFER: OfferCard = {
  id: "first-deposit",
  eyebrow: "Welcome bonus",
  title: "First deposit match",
  amount: `$${BONUS_MAX_USDC}`,
  summary: `${BONUS_MATCH_BPS / 100}% match up to $${BONUS_MAX_USDC} on your first deposit.`,
  details: [
    `${BONUS_MATCH_BPS / 100}% bonus on your first qualifying deposit`,
    `Maximum bonus $${BONUS_MAX_USDC}`,
    `Minimum deposit $${BONUS_MIN_DEPOSIT_USDC}`,
    "Available once per account",
  ],
  ctaLabel: "Deposit now",
  ctaHref: "/profile",
};

export const REFERRAL_OFFER: OfferCard = {
  id: "referral",
  eyebrow: "Invite friends",
  title: "Referral credit",
  amount: `$${REFERRAL_REWARD_USD}`,
  summary: `Earn $${REFERRAL_REWARD_USD} for each friend who plays.`,
  details: [
    `$${REFERRAL_REWARD_USD} when a referred friend plays any game`,
    "Share your personal link from Referral",
  ],
  finePrint: `Credit unlocks ${REFERRAL_UNLOCK_DAYS} days after it is earned.`,
  ctaLabel: "Open referral",
  ctaHref: "/referral",
};

export const SITE_OFFERS: OfferCard[] = [FIRST_DEPOSIT_OFFER, REFERRAL_OFFER];

export const OFFER_POPUP_STORAGE_KEY = "klasshi_offer_popup_v1";
