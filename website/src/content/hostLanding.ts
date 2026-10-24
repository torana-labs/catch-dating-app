export const hostLandingCopy = {
  navLabel: "Explore Catch Host",
  nav: [{href: "#how-it-works", label: "How it works"}, {href: "#adoption", label: "Ways to use Catch"}, {href: "#pricing", label: "Pricing & access"}],
  apply: "Apply for a pilot", seeHow: "See how it works", example: "Illustrative example · fictional data",
  hero: {
    title: "Run great events. Build a business around them.",
    body: "Bring bookings, payments, and guest communication together. Get to know your audience, understand what brings them back, and create more opportunities for people to participate and connect.",
    audience: "For independent hosts, growing clubs, community organisers, and event teams. Start with the tools you need.",
    note: "Selected pilots. Hands-on setup. No platform switch required.",
  },
  benefits: {
    title: "Good for your business. Great for your guests.",
    body: "From your first gathering to a full calendar, bring the work behind your events and the experience of attending them together.",
    businessTitle: "Less chasing. More hosting.",
    businessBody: "Your public profile, applications, approvals, payments, and messages belong in one connected workflow. Spend less time matching payments to names and moving information between tools.",
    workflowTitle: "From interested to expected",
    workflow: [{title: "Application received", detail: "The answers you need, with the guest."}, {title: "Approved for this event", detail: "You decide who gets an offer."}, {title: "Payment confirmed", detail: "A clear payment record, including UPI."}, {title: "Booking confirmed", detail: "Arrival details and reminders follow."}],
    guestTitle: "Help people get more out of being there.",
    guestBody: "An introduction, a shared activity, or a thoughtful group gives guests a reason to talk. Choose the tools that fit your event, and let people join in at their own pace.",
    promptLabel: "A first hello", prompt: "Ask someone at your table: what meal would you travel for?",
    guestAlt: "Guests sharing a conversation around a dinner table",
    note: "A connected workflow is the direction we’re building. We’ll agree the tools available for your event during pilot setup.",
  },
  explorer: {
    title: "Your event has its own rhythm.", body: "See how Catch brings it together.", label: "Choose an event format",
    stages: ["Before", "During", "After"], host: "Host view", guest: "Guest view",
    note: "Illustrative experiences. Your pilot’s tools and setup are agreed with the team.",
  },
  participation: {
    title: "A little guidance. More room to connect.",
    body: "A prompt gives someone a reason to approach. A shared activity makes conversation expected. Technology should help the interaction begin, then leave people to enjoy it.",
    items: [
      {title: "Brief moments on a phone.", body: "A first hello, a new partner, or the next table. Use the lightest touch that helps, then bring attention back to the people in the room."},
      {title: "A quieter way to say hello.", body: "With Help me say hi, a guest can privately ask the host for an introduction. The other person isn’t notified of the request; the host decides whether and how to help."},
      {title: "People stay in control.", body: "Guests can skip a prompt or request another. Hosts choose the activities and can adjust groups or override assignments when the room changes."},
    ],
  },
  insights: {
    title: "Know what brings people in—and brings them back.",
    body: "Get to know your guests across bookings, attendance, and feedback. See which campaigns and referral links lead to paid bookings, and use that understanding to plan your next move.",
    guestTitle: "A guest record that grows with you.", guestBody: "Find your regulars, welcome newcomers, and send a relevant invitation instead of starting from a new spreadsheet every time.",
    recordTitle: "Asha’s guest history", visits: "3 events attended", preference: "Social play · weekend sessions", feedback: "Opted in to beginner-session invitations", invitation: "Next invitation: Sunday social play",
    campaignTitle: "See what your promotion brings in.", campaignBody: "Give a partner, promoter, or campaign its own link. Follow the path from a visit to a paid booking, then decide where to put your next effort.",
    tableCaption: "Campaign performance", tableHeaders: ["Link", "Visits", "Bookings", "Revenue"],
    campaigns: [{name: "Community newsletter", visits: 180, bookings: 24, revenue: 14400}, {name: "Partner · Meera", visits: 120, bookings: 18, revenue: 10800}, {name: "Instagram bio", visits: 240, bookings: 12, revenue: 7200}],
    privacyTitle: "Useful insights. Private answers stay private.",
    privacyBody: "Keep booking details and agreed follow-up preferences in your guest records. Private social questionnaire answers, introduction requests, and matching choices stay separate. For private event feedback, hosts see combined patterns—not individual responses—so they can improve the next event without exposing a guest’s answers.",
    note: "Illustrative data and product direction. Link attribution measures recorded activity; it doesn’t reveal private forwards. Private matching choices stay private.",
  },
  adoption: {
    title: "Start with what you need.", body: "Use Catch alongside your existing setup, bring your bookings onto Catch, or connect with the wider network. Each layer builds on the one inside it. You choose how far to go.",
    circlesLabel: "Ways to use Catch", circlesHint: "Choose a circle to see what it adds.", layersNote: "Ways to use Catch, not fixed pricing plans. Tools and availability are agreed for your event.",
    layers: [
      {id: "tools", label: "Catch tools", kicker: "Alongside your existing setup", title: "Keep your tools. Add to the experience.", body: "Bring a guest list from the platform you already use. Add check-in, introductions, groups, and activities that help your event run well and your guests join in.", bullets: ["Your booking platform can stay.", "Guests join supported live experiences in a mobile browser.", "Choose the tools that earn their place in your event."]},
      {id: "booking", label: "Catch booking", kicker: "Connect more of the workflow", title: "From application to payment to arrival.", body: "Bring registration, approvals, UPI payments, reminders, and attendance together. With booking connected, guest records and tracked links can tell you more about what brings people in.", bullets: ["Forms, approvals, and payments in one flow.", "Guest communication stays connected to the booking.", "Follow promotion through to paid bookings."]},
      {id: "network", label: "Catch network", kicker: "Connect beyond one event", title: "Give your community somewhere to grow.", body: "Build a public organiser presence so people can discover your events, follow what you do, and find their next reason to return. Optional member experiences can help connections continue after a shared event.", bullets: ["A public home for your club, community, or business.", "Discovery and repeat attendance across events.", "Optional post-event connections, with private, mutual choices." ]},
    ],
    toolsTitle: "Already have tools you like?", toolsBody: "Start with a reviewed CSV or XLSX guest-list import. Keep what works, and agree the handoffs with our team. A file import doesn’t require changing your ticketing platform.",
    toolsSummary: "Booking, payments, messaging, and other tool handoffs",
    scopeSummary: "Other formats, larger programmes, and detailed workflow options",
    reassurance: "Supported live experiences work in a mobile browser. Guests can skip optional activities. You control the format; they control how they join in.",
  },
  faqTitle: "A few things you might be wondering.",
  faqs: [
    {question: "Is Catch only for singles events?", answer: "No. Catch is for independent hosts, clubs, communities, and event teams. Runs, dinners, games, sports, and nights out can all benefit from easier coordination and more opportunities to participate. Social tools are optional."},
    {question: "Do my guests need to download an app?", answer: "For supported live-event pilots, guests use a phone-verified mobile browser. They don’t need to download the app or create a dating profile. Participation is scoped to your event; the wider Catch member network is separate."},
    {question: "Do I have to move my bookings to Catch?", answer: "No. You can keep your existing booking or RSVP tool and start with a reviewed CSV or XLSX guest-list import. We’ll confirm the handoff and capacity together. Direct sync with another platform isn’t implied."},
    {question: "Can I choose which activities guests see?", answer: "Yes. Agree the tools and format during setup, and use the host controls to adjust groups or override assignments during the live event. Introductions, prompts, and group activities are optional. Guests can choose to skip them."},
    {question: "What guest information can my team see?", answer: "Your team uses booking and application information guests provide for the event, with access appropriate to each person’s role. Private social questionnaire answers and matching choices are not part of the CRM. Introduction requests are shared only with the host who can help. Private feedback is summarised as combined patterns, not individual answers. Application approval, membership, payment, and event admission are separate decisions."},
    {question: "What does the pilot involve?", answer: "Apply with a real upcoming event, your current setup, and the tools you’d like to try. If it’s a fit, we’ll agree the scope, review your guest list, and help you prepare and rehearse. Afterwards, we’ll review what worked and what to improve."},
  ],
  close: {
    title: "Your next event. A stronger foundation.",
    body: "Whether you run a monthly community gathering or a full calendar of events, explore how Catch can support the way you host.",
    priceTitle: "Free during the selected live-event pilot.",
    priceBody: "Hands-on onboarding is included. Broader booking, network, and managed-event scope, capacity, and commercial terms are agreed with the team before you start.",
    steps: [{title: "Tell us about your event", body: "Share your format, current tools, and what you want to improve."}, {title: "Agree the right setup", body: "We review the fit and confirm the tools, support, and terms."}, {title: "Host, learn, and build", body: "Run your event, review the experience, and plan what’s next."}],
    note: "We review each application and follow up if it’s a fit. Applying doesn’t book a call or grant access.",
  },
} as const;

export interface HostFormatStage {
  title: string; body: string; view: "host" | "guest";
  mock: {title: string; subtitle: string; rows: readonly {label: string; value: string}[]; highlight: {label: string; text: string}; status: string};
}
export interface HostFormat {
  id: string; label: string; title: string; connection: string; stages: readonly HostFormatStage[];
}
export const hostFormats: readonly HostFormat[] = [
  {id: "run-club", label: "Run club", title: "Find your pace. Find your people.", connection: "A pace preference becomes a group, then a relevant invitation.", stages: [
    {title: "Know your runners.", body: "Collect pace and distance preferences when people book.", view: "host", mock: {title: "Asha’s registration", subtitle: "Riverside Run Club", rows: [{label: "Distance", value: "5 km"}, {label: "Comfortable pace", value: "6:30–7:00 / km"}], highlight: {label: "A place to start", text: "Steady 5K"}, status: "Booking confirmed"}},
    {title: "Give everyone a place to start.", body: "Form pace groups and give newcomers an easy first introduction.", view: "guest", mock: {title: "Your group: Steady 5K", subtitle: "Riverside Run Club", rows: [{label: "Meet your group", value: "By the fountain"}, {label: "Today’s distance", value: "5 km together"}], highlight: {label: "First hello", text: "Introduce yourself to someone in your group."}, status: "Join in at your own pace"}},
    {title: "Make the next run easier to join.", body: "Gather feedback and invite runners to a session that suits them.", view: "host", mock: {title: "Next run invitation", subtitle: "Riverside Run Club", rows: [{label: "Invite", value: "Steady 5K runners"}, {label: "Include", value: "Interested past attendees"}], highlight: {label: "From the feedback", text: "More relaxed Sunday runs"}, status: "Invitation ready to review"}},
  ]},
  {id: "dinner", label: "Dinner", title: "A thoughtful guest list. A table that gets talking.", connection: "Guest preferences inform the table; feedback informs the next dinner.", stages: [
    {title: "Set the table before they arrive.", body: "Collect dietary needs and interests, approve guests when needed, and take payment.", view: "host", mock: {title: "Asha’s application", subtitle: "Dinner at Harbour Room", rows: [{label: "Dietary needs", value: "Vegetarian"}, {label: "Interests", value: "Food, travel"}], highlight: {label: "Application", text: "Ready for your review"}, status: "Approval before booking"}},
    {title: "Make the first conversation easier.", body: "Arrange tables and offer an opening question, with optional seat changes.", view: "guest", mock: {title: "Your table: Table 3", subtitle: "Dinner at Harbour Room", rows: [{label: "Around your table", value: "Asha, Ravi, Meera + 3"}, {label: "Tonight", value: "Good food. New company."}], highlight: {label: "A question to start", text: "What meal would you travel for?"}, status: "Join in when you’re ready"}},
    {title: "Give guests a reason to return.", body: "Learn what they enjoyed and invite interested guests to another dinner.", view: "host", mock: {title: "Dinner follow-up", subtitle: "Dinner at Harbour Room", rows: [{label: "Ask about", value: "The food and conversation"}, {label: "Invite", value: "Guests interested in returning"}], highlight: {label: "Next time", text: "Another table. New conversation."}, status: "Follow-up ready to review"}},
  ]},
  {id: "games", label: "Games & mixers", title: "New teams. More chances to connect.", connection: "Application answers shape teams; feedback shapes the next format.", stages: [
    {title: "Build the guest list your event needs.", body: "Set entry requirements and collect useful grouping answers.", view: "host", mock: {title: "Trivia social application", subtitle: "Saturday Trivia Social", rows: [{label: "Interests", value: "Films, food"}, {label: "Team preference", value: "Meet new people"}], highlight: {label: "Entry", text: "Approval required"}, status: "Answers stay with the guest"}},
    {title: "Keep the room mixing.", body: "Form teams and rotate guests, taking earlier groupings into account.", view: "guest", mock: {title: "Round 2 · Team Cedar", subtitle: "Saturday Trivia Social", rows: [{label: "Your team", value: "Asha, Ravi, Meera, Kabir"}, {label: "Earlier rounds", value: "Previous groupings considered"}], highlight: {label: "Meet Team Cedar", text: "Share your most unlikely trivia fact."}, status: "A new round. New company."}},
    {title: "Find out what brought people together.", body: "Use feedback on activities and introductions to shape the next session.", view: "host", mock: {title: "Post-event questions", subtitle: "Saturday Trivia Social", rows: [{label: "Rotations", value: "How did the team changes feel?"}, {label: "Activities", value: "Which round would you play again?"}], highlight: {label: "For the next session", text: "Build on the moments guests enjoyed."}, status: "Feedback ready to review"}},
  ]},
  {id: "pickleball", label: "Pickleball", title: "More play. New partners. Less organising.", connection: "Playing levels inform the round; pairing history informs the rotation.", stages: [
    {title: "Get the right mix on court.", body: "Collect playing levels and manage places and payments together.", view: "host", mock: {title: "Asha’s registration", subtitle: "Pickleball Social", rows: [{label: "Playing level", value: "Social player"}, {label: "Payment", value: "Received"}], highlight: {label: "Place on court", text: "Booking confirmed"}, status: "Ready for the first round"}},
    {title: "Rotate partners without the mental maths.", body: "Plan rounds using playing levels and previous pairings.", view: "host", mock: {title: "Round 3 · Court 2", subtitle: "Pickleball Social", rows: [{label: "Pair 1", value: "Asha + Ravi"}, {label: "Pair 2", value: "Meera + Kabir"}], highlight: {label: "Pairing history", text: "Asha + Ravi: first pairing"}, status: "Next round ready to review"}},
    {title: "Build your regular playing community.", body: "Gather feedback and invite players to a suitable next session.", view: "host", mock: {title: "Next session invitation", subtitle: "Pickleball Social", rows: [{label: "Format", value: "Social play"}, {label: "Invite", value: "Players at a similar level"}], highlight: {label: "From this session", text: "Asha, Ravi, Meera, Kabir + 8"}, status: "Invitation ready to review"}},
  ]},
  {id: "pub-crawl", label: "Pub crawl", title: "Keep the night moving. Keep people mixing.", connection: "The route guides the group; shared activities help people connect.", stages: [
    {title: "Give everyone a clear starting point.", body: "Take bookings and send meeting and arrival details.", view: "host", mock: {title: "Arrival message", subtitle: "Friday Pub Crawl", rows: [{label: "First stop", value: "The Courtyard"}, {label: "Meet your host", value: "By the entrance"}], highlight: {label: "Before the night", text: "Your starting point, in one message."}, status: "Send after booking"}},
    {title: "A new stop. A new conversation.", body: "Share location changes, introductions, and optional group missions.", view: "guest", mock: {title: "Next stop: The Lantern", subtitle: "Friday Pub Crawl", rows: [{label: "On the way", value: "Walk with your group"}, {label: "Next arrival", value: "Your host will meet you there"}], highlight: {label: "Optional activity", text: "Ask someone new: what song gets you dancing?"}, status: "Take part, or just enjoy the walk"}},
    {title: "Make the next night better.", body: "Gather feedback on venues, pacing, and activities.", view: "host", mock: {title: "Night-out feedback", subtitle: "Friday Pub Crawl", rows: [{label: "Venues", value: "Which stop would you revisit?"}, {label: "Pacing", value: "Did the pace feel right?"}], highlight: {label: "Meeting people", text: "Which activity helped you talk to someone new?"}, status: "Questions ready to review"}},
  ]},
];
