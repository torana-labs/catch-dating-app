// Copy for the weddings product (/weddings/ and /weddings/apply/), from the
// owner's RbWebWeddings and RbWebWeddingsApply boards in the design canvas
// (page "Website · rebuilt"). Copy is the owner's: change it on the board
// first. Every example is fictional. Screens are capture slots in
// tool/marketing/capture_manifest.json.
import type {CatchIconName} from "@catch/web-ui";
import {brand} from "./brand.ts";

/** A status's tone on the running order and the messages list. */
export type WeddingsStatusTone = "success" | "warning" | "info" | "secondary";

/** A screen in a chapter: its capture slot and the line under it. */
export interface WeddingsScreen {
  slot: string;
  caption: string;
  /** A second, quieter line under the first. */
  detail?: string;
}

export const weddingsCopy = {
  header: {
    title: `${brand.name} for weddings`,
    nav: [
      {label: "Follow one wedding", href: "#follow"},
      {label: "Your team", href: "#team"},
      {label: "Pricing", href: "#pricing"},
      {label: "Questions", href: "#questions"},
    ],
    apply: "Apply for the pilot",
  },
  hero: {
    kicker: "For wedding planners and destination events",
    title: "The whole wedding weekend, on one running order.",
    /** The headline on a phone (owner, 9 Nov). */
    titleShort: "One wedding, one running order.",
    body: "Guest list, replies for every function, flights, airport pickups, rooms, staff and messages, in one place your team, the hotel desks and the family can all see. Guests need no app.",
    apply: "Apply for the pilot",
    follow: "Follow one wedding",
    note: "A few pilot weddings at a time · set up with you · priced by headcount",
    slot: "wedding-rsvp",
    stickers: [
      {label: "Sangeet · Sat 12 Dec · 8 PM", title: "266 coming", ground: "white", labelAccent: "magenta"},
      {label: "Flights · Friday", title: "171 of 196 shared", ground: "ink", labelAccent: "yellow"},
      {label: "Taj Fateh Prakash", title: "58 of 62 rooms placed", ground: "pink"},
    ],
  },
  order: {
    kicker: "Aditi and Kabir’s wedding · Udaipur · 45 days to go",
    title: "Three months of work, one running order.",
    illustrative: "Illustrative example · fictional data",
    rows: [
      {month: "Sep", day: 14, title: "Guest list in: 312 people, 118 households", subtitle: "Imported from the family’s spreadsheet", status: "Done", tone: "success"},
      {month: "Oct", day: 10, title: "Reply links out, one per household", subtitle: "80 households replied for everyone in a week", status: "Done", tone: "success"},
      {month: "Nov", day: 20, title: "Flights in for 171 of 196 people", subtitle: "25 still to share · a reminder goes Friday", status: "Chasing", tone: "warning"},
      {month: "Dec", day: 11, title: "58 people land between 12 and 2", subtitle: "Ten cars at the curb · hotel desks see who’s on the way", status: "Day 1", tone: "info"},
      {month: "Dec", day: 12, title: "Sangeet, Durbar hall, 8 PM", subtitle: "266 coming · checked in at the door on a phone", status: "Day 2", tone: "info"},
      {month: "Dec", day: 15, title: "Attendance, and the car vendors’ bills", subtitle: "Every trip recorded as it happened", status: "After", tone: "secondary"},
    ] satisfies readonly {month: string; day: number; title: string; subtitle: string; status: string; tone: WeddingsStatusTone}[],
  },
  problem: {
    kicker: "Why planners switch",
    title: "Replace the clipboard, the spreadsheet and forty WhatsApp groups.",
    body: "A destination wedding is a small airline, a hotel and five events in three days. Most of it still runs on memory and phone calls.",
    withCatch: `With ${brand.name}`,
    pains: [
      {number: "01", title: "Flight times live in someone’s head", before: "Delays are checked by hand, guest by guest, all day.", after: "Live flight status on every guest, with the time they actually reach the curb."},
      {number: "02", title: "Cars are grouped by mental arithmetic", before: "Half-empty cars leave while guests wait at the curb.", after: "Cars suggested by landing time and hotel. Your team decides what leaves."},
      {number: "03", title: "The hotel finds out when 20 people walk in", before: "Keys are sorted while families stand in the lobby.", after: "The desk sees every car on its way, who is in it, and their rooms."},
      {number: "04", title: "The vendor bill becomes an argument", before: "Trips, vehicle types and routes are reconstructed days later.", after: "Every dispatch records the plate and vendor, so the ledger writes itself."},
      {number: "05", title: "The same question, three hundred times", before: "“What time is the haldi?” arrives on six phones at once.", after: "The wedding’s own number answers from each family’s itinerary, in their language."},
    ],
  },
  follow: {
    kicker: "Follow one wedding",
    title: "From the guest list to the last car home.",
    lead: `Aditi and Kabir’s wedding: 312 guests over three days in Udaipur, 196 of them flying in, 24 people on the planner’s team. Every screen below is from ${brand.name}.`,
    setUp: {
      kicker: "01 · Set up",
      title: "Functions, households and who is invited to what.",
      body: `Start from the wedding preset: five functions with dress codes. Import the family’s spreadsheet as it is; ${brand.name} maps the columns and flags the gaps.`,
      points: [
        {icon: "forms", title: "Invite each function separately", body: "Everyone to the reception, close family to the haldi."},
        {icon: "people", title: "Households reply, people count", body: "The Mehras are 4 at the Sangeet and 3 at the haldi."},
      ],
      screen: {slot: "wedding-guests", caption: "Planner · on a laptop", address: "/weddings/aditi-and-kabir/guests"},
    },
    invite: {
      kicker: "02 · Invite and collect",
      title: "One link per household. No app, no login.",
      body: "Each family ticks who is coming to each function, tells you about food and access needs, shares their flight and says yes to WhatsApp updates. Then the same link becomes their itinerary.",
      points: [
        {icon: "send", title: "Links go out on WhatsApp", body: "Reminders reach only the households still to reply."},
        {icon: "protected", title: "Consent asked once, clearly", body: "Anyone who says no to updates is never messaged."},
      ],
      screens: [
        {slot: "wedding-rsvp", caption: "Guest · the reply link"},
        {slot: "wedding-itinerary", caption: "Guest · their itinerary"},
      ] satisfies readonly WeddingsScreen[],
    },
    writeIn: {
      kicker: "03 · Guests write in",
      title: "The wedding’s own WhatsApp number, answered from each family’s plans.",
      body: "Guests send tickets, ID photos and questions to a number in the couple’s name. Tickets become flights they confirm, IDs go to your checklist, and questions are answered in the language they were asked. Anything else comes to your team.",
      points: [
        {icon: "arrivals", title: "Tickets read into flights", body: "The guest confirms before anything is saved."},
        {icon: "protected", title: "IDs for the hotels", body: "Checked by your team, sent to each hotel, deleted three days after checkout."},
        {icon: "chat", title: "One inbox for your team", body: "Only what the assistant can’t answer from the itinerary."},
      ],
      screens: [
        {slot: "wedding-whatsapp", caption: "Your team · guest messages"},
        {slot: "wedding-ids", caption: "Guest · IDs for the hotel"},
      ] satisfies readonly WeddingsScreen[],
    },
    travel: {
      kicker: "04 · Travel and rooms",
      title: "Know who lands when, and where everyone sleeps.",
      body: "Flights are tracked live. Arrivals are grouped by time and hotel, so you know how many cars you need and when. Room blocks fill by household, without double-booking anyone.",
      points: [
        {icon: "arrivals", title: "Arrival waves by the hour", body: "58 people on 9 flights between 12 and 2 on Friday: plan 10 cars."},
        {icon: "hotel", title: "Rooms by household", body: "Ground floor for Dadi, connecting rooms for the Mehras."},
      ],
      screen: {slot: "wedding-rooms", caption: "Planner · rooms", address: "/weddings/aditi-and-kabir/rooms"},
    },
    weekend: {
      kicker: "05 · The weekend",
      title: "Everyone on the ground sees one job, live.",
      body: "Greeters, dispatchers, drivers, hotel desks, porters and door staff open a link on their phone and see only their job, on their dates. It keeps working without signal. You watch it all on one live board, with alerts for diverted flights and late arrivals.",
      screen: {slot: "wedding-live", caption: "Planner · the live board", address: "/weddings/aditi-and-kabir/live"},
      staffLabel: "Staff on the ground",
      staff: [
        {slot: "wedding-door", caption: "Door staff", detail: "The Sangeet door · checks people in"},
        {slot: "wedding-departures", caption: "Hotel lobby", detail: "Departures desk · Tuesday"},
        {slot: "wedding-driver", caption: "Driver", detail: "A trip link · no app"},
      ] satisfies readonly WeddingsScreen[],
    },
    after: {
      kicker: "06 · After",
      title: "Close the weekend with numbers, not arguments.",
      body: "Attendance for every function, for the family’s records. Every car trip as it was recorded, matched against what each vendor bills. Then the guest data is archived and anonymised.",
      points: [
        {icon: "checklist", title: "Attendance per function", body: "Exported for the family and your own report."},
        {icon: "receipt", title: "A vendor ledger by default", body: "Plates, vehicle types and times, recorded as the work happened."},
      ],
      screen: {slot: "wedding-reconcile", caption: "Planner · after the wedding", address: "/weddings/aditi-and-kabir/trips/bills"},
    },
  },
  team: {
    kicker: "Your team",
    title: "Everyone sees only their job.",
    body: "Invite people by phone number for the dates they work. Their access ends when the wedding does. Nobody sees money unless you say so.",
    roles: [
      {icon: "host", title: "Planner and coordinators", body: "Everything, on a laptop or a phone", access: "App and web"},
      {icon: "people", title: "Guest relations", body: "Replies, households, imports", access: "App and web"},
      {icon: "arrivals", title: "Airport greeters", body: "Who is at the curb, who lands next", access: "Phone link"},
      {icon: "route", title: "Dispatch", body: "Cars, drivers, plates", access: "Phone link"},
      {icon: "hotel", title: "Hotel desks", body: "Cars on the way, rooms ready", access: "Web link"},
      {icon: "checkIn", title: "Door staff", body: "Check-in for one function", access: "Phone link"},
      {icon: "live", title: "Function leads", body: "Now and next, late arrivals", access: "Phone link"},
      {icon: "route", title: "Drivers", body: "Passengers, pickup and hotel", access: "Trip link"},
      {icon: "celebrate", title: "Porters", body: "Welcome hampers, room by room", access: "Hamper link"},
      {icon: "protected", title: "The family", body: "Numbers only, no phone numbers", access: "View-only link"},
    ] satisfies readonly {icon: CatchIconName; title: string; body: string; access: string}[],
    hotel: {slot: "wedding-hotel", address: "/w/taj-fateh-prakash/rooming", title: "Hotel desks get a link, not a login.", body: "The Taj sees its own guests, rooms and IDs, and the cars on their way. Nothing else."},
  },
  messages: {
    kicker: "Messages",
    title: "Messages that follow the schedule.",
    body: "Tie a message to a function or a flight. If the Sangeet moves, its reminders move with it. Approve each message once; it sends by itself, never at night.",
    slot: "wedding-message",
    listTitle: "Aditi and Kabir’s messages",
    rows: [
      {status: "Sent", tone: "success", title: "Save the date", when: "Mon 14 Sep · 118 households"},
      {status: "Sent", tone: "success", title: "Your invitation and replies", when: "Sat 10 Oct · 80 replied for everyone"},
      {status: "Next", tone: "info", title: "Itinerary and your room", when: "Sat 5 Dec · everyone coming"},
      {status: "Planned", tone: "secondary", title: "Your pickup tomorrow", when: "The day before each flight · moves if it moves"},
      {status: "Planned", tone: "secondary", title: "Today at the wedding", when: "Each morning · what, where, what to wear"},
    ] satisfies readonly {status: string; tone: WeddingsStatusTone; title: string; when: string}[],
  },
  family: {
    kicker: "The family",
    title: "A link for the family, with numbers only.",
    body: "Who is coming to what, food needs for the caterer and how many have replied. Names, phone numbers and rooms stay with you.",
    slot: "wedding-family",
    stats: [{label: "coming", value: "298"}, {label: "flying in", value: "196"}],
    dietsTitle: "For the caterer",
    diets: [{label: "Jain", count: "64"}, {label: "Vegan", count: "18"}, {label: "Nut allergy", count: "7"}],
  },
  pricing: {
    kicker: "Pricing",
    title: "Priced per wedding, by headcount.",
    body: "One price for the whole wedding, set by how many guests are invited. Your team is included. Guests never pay.",
    includedTitle: "Every wedding includes",
    included: [
      "Every function, household and reply",
      "Flights, airport pickups, dispatch and drivers",
      "Rooms, hotel desks and guest IDs",
      "The wedding’s own WhatsApp number and assistant",
      "Your whole crew, each with their own job",
      "Guest pages and itineraries, no app",
      "Setup and the weekend, with us on call",
    ],
    tiersTitle: "Guests invited",
    quote: "Quoted after a walkthrough",
    tiers: [
      {title: "Up to 150 guests", body: "Intimate weddings and offsites", badge: ""},
      {title: "150 to 400 guests", body: "Most destination weddings", badge: "Most pilots"},
      {title: "400 to 800 guests", body: "Large weddings, several hotels", badge: ""},
      {title: "800 and more", body: "Several hotels and cities: we plan it with you", badge: ""},
    ],
    action: "Apply for a quote",
    atCost: "At cost, on the same bill: WhatsApp messages at WhatsApp’s own rates, and live flight alerts. Running ten or more weddings a year? Ask about a yearly plan.",
  },
  pilot: {
    kicker: "The pilot",
    title: "A guided pilot, not a sign-up form.",
    body: "We take on a few weddings at a time, so we can set each one up properly and be there for the weekend.",
    steps: [
      {title: "Apply with a real wedding", body: "Dates, destination, guest count and the team you’ll bring."},
      {title: "A 30-minute walkthrough", body: "We look at your current spreadsheet and how your weekend runs, and send a quote."},
      {title: "We set it up with you", body: "Guest list, functions, hotels, pickup points and car vendors."},
      {title: "Your team rehearses", body: "A practice run on their phones the week before."},
      {title: "We’re on call that weekend", body: "One number to reach us from the airport to the reception."},
      {title: "A review afterwards", body: "What worked, what didn’t, and the next wedding."},
    ],
    hosting: `Hosting regular events instead? ${brand.stores.hostAppName} is self-serve and free for 30 days from your first event.`,
    hostingAction: "Start a free trial",
    hostingHref: "/host/#start",
  },
  stepOne: {
    title: "Apply for the pilot",
    step: "Step 1 of 2",
    who: {label: "You are", options: ["A wedding planner", "The couple or family"], error: "Choose who you are"},
    what: {label: "What you’re running", options: ["A wedding", "Another multi-day programme"], error: "Choose what you’re running"},
    name: {label: "Your name", hint: "Meher Shah", error: "Enter your name"},
    company: {label: "Planning company (optional)", hint: "Meher Shah Weddings"},
    phone: {label: "WhatsApp number", prefix: "+91", hint: "98201 44718", missing: "Enter a WhatsApp number", invalid: "Enter a 10-digit Indian mobile number"},
    date: {label: "Starts on", error: "Choose the first day"},
    destination: {label: "Destination", hint: "Udaipur", error: "Enter the destination"},
    guests: {label: "Guests invited", options: ["Under 150", "150 to 400", "400 to 800", "800 and more"], error: "Choose how many guests are invited"},
    tools: {label: "What you use today (optional)", options: ["Spreadsheets", "WhatsApp groups", "Another app", "A hospitality agency"]},
    continue: "Continue",
    reply: "We read every application and reply on WhatsApp within two working days. If the wedding is a fit, we book a 30-minute walkthrough. Applying doesn’t commit you to anything.",
  },
  stepTwo: {
    kicker: "Apply for the pilot · step 2 of 2",
    heading: "Tell us about the weekend.",
    yours: "Your wedding",
    summary: "{destination} · from {date} · {guests} guests",
    contact: "{name} · {company} · +91 {phone}",
    contactNoCompany: "{name} · +91 {phone}",
    change: "Change step 1",
    nextTitle: "What happens next",
    next: [
      {title: "A walkthrough", body: "We look at your spreadsheet and how the weekend runs."},
      {title: "A quote for this wedding", body: "By headcount, with your team included."},
      {title: "Setup with you", body: "Guest list, functions, hotels, pickups and cars."},
      {title: "Your team rehearses", body: "The week before."},
    ],
    title: "About the weekend",
    step: "Step 2 of 2",
    functions: {title: "Functions", subtitle: "Mehendi, sangeet and so on", one: "function", initial: 5, min: 1, max: 12},
    hotels: {title: "Hotels guests stay at", subtitle: "Where you’ve blocked rooms", one: "hotel", initial: 2, min: 1, max: 8},
    team: {title: "Your team that weekend", subtitle: "Greeters, desks, doors, coordinators", one: "person on your team", initial: 24, min: 1, max: 80},
    fewer: "One fewer {unit}",
    more: "One more {unit}",
    flying: {label: "Roughly how many are flying in?", options: ["Hardly anyone", "Under half", "More than half", "Almost everyone"], error: "Choose roughly how many are flying in"},
    wants: {
      label: `What you’d want from ${brand.name}`,
      options: ["Replies for every function", "Airport pickups and cars", "Rooms and hotel desks", "Guest IDs for the hotels", "Guests writing in on WhatsApp", "Door check-in", "The family’s numbers link", "Car vendor bills"],
      error: `Pick at least one thing you’d want from ${brand.name}`,
    },
    lastTime: {label: "Anything that went wrong last time? (optional)", hint: "Two families waited an hour at the airport because a flight landed early and nobody knew.", max: 600,
      count: "{length} of {max}", error: "Keep it under {max} characters"},
    heard: {label: "How you heard about us", options: ["Another planner", "A hotel", "Instagram", `A ${brand.name} event`, "Search"], error: "Tell us how you heard about us"},
    back: "Back",
    send: "Send our application",
    consent: "We review applications and follow up on this number if the wedding is a fit. Sending doesn’t book a call or grant access.",
  },
  sent: {
    kicker: "Application sent",
    heading: "We’ll be in touch.",
    badge: "Application sent",
    title: "Thanks, {name}.",
    body: "We’ll message you on WhatsApp within two working days. If the wedding is a fit, we book a 30-minute walkthrough: bring the spreadsheet you use today.",
    summaryTitle: "What you sent",
    summary: "{functions} functions · {hotels} · a team of {team} · {flying} flying in · wants: {wants}",
    hotelOne: "1 hotel",
    hotelMany: "{count} hotels",
    back: `Back to ${brand.name} for weddings`,
    follow: "Follow one wedding",
    edit: "Edit our answers",
  },
  faq: {
    kicker: "Questions",
    title: "Before you apply.",
    apply: "Apply for the pilot",
    items: [
      {title: "Do guests need to download an app?", body: "No. Each household gets a link on WhatsApp. They reply, share their flight and see their itinerary in the browser. Your staff use a link too."},
      {title: "Can we keep our spreadsheet?", body: `Yes. Import it as it is and keep using your car vendors, hotels and agencies. ${brand.name} runs the coordination between them.`},
      {title: "What does the family see?", body: "A view-only link with numbers: who is coming to what, food needs, rooms and replies. No names, phone numbers or money unless you choose to share them."},
      {title: "What happens to guest data after the wedding?", body: "It is used only for this wedding. Guests are never added to anyone’s marketing list, and the wedding is archived and anonymised after you close it."},
      {title: "Who sees guests’ IDs?", body: "Only your team and the hotel they’re staying at, and only that hotel’s guests. Every view is logged, and IDs are deleted three days after checkout."},
      {title: "Can guests message us back?", body: "Yes, on the wedding’s own WhatsApp number. The assistant answers from each family’s itinerary and passes everything else to your team."},
      {title: "Does it work at the airport without signal?", body: "Yes. Greeters and door staff keep working offline; their updates go through when the phone reconnects."},
      {title: "Is it only for weddings?", body: `Weddings first. The same tools work for destination birthdays, offsites and conferences with travel and several sessions. Running regular events instead? ${brand.stores.hostAppName} is self-serve, with a 30-day free trial.`},
      {title: "How is it priced?", body: "Per wedding, by the number of guests invited, with your team included. We quote after a 30-minute walkthrough. WhatsApp messages and flight alerts are passed on at cost."},
    ],
  },
  foot: {
    title: `${brand.name} for weddings`,
    body: `Part of ${brand.name}. For planners running weddings and destination events in India. Illustrative interface, fictional data.`,
    applyBody: `Part of ${brand.name}. For planners running weddings and destination events in India.`,
  },
} as const;

export const weddingsApplyPath = "/weddings/apply/";
