// GENERATED CODE - DO NOT MODIFY BY HAND.
// Source: copy/notifications_en.json

export const notificationCopyEn = {
  "eventReminder": {
    "title": "Your event starts soon",
    "body": "Your {eventLabel} from {locationName} starts in about 15 minutes.",
    "audience": "consumer",
    "owner": "product"
  },
  "eventSignup": {
    "title": "You're booked",
    "body": "Your {eventLabel} from {locationName} is confirmed.",
    "audience": "consumer",
    "owner": "product"
  },
  "waitlistPromotion": {
    "title": "You're in",
    "body": "A spot opened for your {eventLabel} from {locationName}.",
    "audience": "consumer",
    "owner": "product"
  },
  "waitlistOffer": {
    "title": "A spot is available",
    "body": "You have a limited-time spot for your {eventLabel} from {locationName}.",
    "audience": "consumer",
    "owner": "product"
  },
  "waitlistOfferExpiring": {
    "title": "Your spot is expiring",
    "body": "Confirm your {eventLabel} from {locationName} soon to keep the spot.",
    "audience": "consumer",
    "owner": "product"
  },
  "waitlistOfferExpired": {
    "title": "Spot offer expired",
    "body": "Your spot offer for the {eventLabel} from {locationName} has expired.",
    "audience": "consumer",
    "owner": "product"
  },
  "eventUpdated": {
    "title": "Event details changed",
    "body": "Check the latest time and meeting point for your {eventLabel}.",
    "audience": "consumer",
    "owner": "product"
  },
  "eventCancelled": {
    "title": "Event cancelled",
    "body": "Your {eventLabel} from {locationName} has been cancelled.",
    "audience": "consumer",
    "owner": "product"
  },
  "eventUpdate": {
    "title": "Event update",
    "body": "There is an update for your {eventLabel} from {locationName}.",
    "audience": "consumer",
    "owner": "product"
  },
  "eventCompanionReady": {
    "title": "Your event companion is ready",
    "body": "Open the live guide for your {eventLabel} from {locationName}.",
    "audience": "consumer",
    "owner": "product"
  },
  "organizerBillIssued": {
    "title": "Catch bill issued",
    "body": "Your Catch bill for {period} has been issued.",
    "audience": "host",
    "owner": "product"
  },
  "organizerBillReminder": {
    "title": "Catch bill reminder",
    "body": "Your Catch bill for {period} is still open.",
    "audience": "host",
    "owner": "product"
  },
  "organizerRazorpayRevoked": {
    "title": "Reconnect Razorpay",
    "body": "{organizerName} can't take payments until you reconnect Razorpay in Catch.",
    "audience": "host",
    "owner": "product"
  }
} as const;

export type NotificationCopyKey = keyof typeof notificationCopyEn;
