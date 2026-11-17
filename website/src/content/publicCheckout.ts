// Checkout as the LiveCheckout board lays it out: the step rail, the booking
// summary rows and multi-place booking (decision 29, 16 Nov: up to four places
// on one booking, a name for each guest, the member price on the member's own
// place only). The rest of the checkout's copy stays in publicCheckoutCopy
// (events.ts) and eventOfferCopy (eventOffer.ts).
export const publicCheckoutFlowCopy = {
  steps: {
    label: "Booking steps",
    phone: "Your phone",
    review: "Review",
    pay: "Pay",
    confirmed: "Confirmed",
    status: {
      complete: "done",
      needsInformation: "to do",
      optional: "optional",
    },
  },
  summary: {
    label: "Your booking",
    total: "Total",
    when: "When",
  },
  places: {
    label: "Places",
    hint: "Book up to {max} places on one booking.",
    fewer: "One fewer place",
    more: "One more place",
    value: {
      one: "1 place",
      other: "{count} places",
    },
    perPlace: "{count} places × {amount}",
    memberPlace: "Your place, member price",
    guestPlaces: {
      one: "1 guest place × {amount}",
      other: "{count} guest places × {amount}",
    },
    guestName: "Guest {number}’s name",
    guestNameHint: "As it should read on the guest list.",
    guestNamesError: "Add a name for each guest, up to 80 characters.",
    notEnoughPlaces: {
      one: "Only 1 place is left. Choose fewer places.",
      other: "Only {count} places are left. Choose fewer places.",
    },
    pay: "Reserve {count} places and pay {amount}",
    held: "{count} places on this booking",
  },
} as const;
