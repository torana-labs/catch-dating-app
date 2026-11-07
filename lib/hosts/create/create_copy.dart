import 'package:catch_dating_app/hosts/create/create_flow_state.dart';

/// The create flow's English copy, from the boards.
///
/// The app's string catalogue (`packages/l10n/lib/app_en.arb`) was held by
/// another change while this flow was rebuilt, so the new strings live here
/// under the keys they take there; strings the catalogue already had come
/// from `context.l10n`. Moving them is a rename, nothing else.
abstract final class CreateCopy {
  static const newEvent = 'New event';
  static const close = 'Close';
  static const back = 'Back';
  static const next = 'Next';
  static const publish = 'Publish';
  static const saveDraft = 'Save draft';
  static const draftSaved = 'Draft saved';
  static const done = 'Done';

  static String stepOf(int index) => 'Step $index of 4';

  static String stepTitle(CreateStep step) => switch (step) {
    CreateStep.basics => 'What are you hosting?',
    CreateStep.when => 'When and where',
    CreateStep.tickets => 'Tickets',
    CreateStep.plan => 'Plan the night',
    CreateStep.share => "It's live. Now tell people.",
  };

  static String railTitle(CreateStep step) => switch (step) {
    CreateStep.basics => 'The basics',
    CreateStep.when => 'When and where',
    CreateStep.tickets => 'Tickets',
    CreateStep.plan => 'The plan',
    CreateStep.share => 'Share',
  };

  static String? railNote(CreateStep step) => switch (step) {
    CreateStep.basics => 'Name, format, photos',
    CreateStep.plan => 'Optional',
    _ => null,
  };

  static String nextTo(CreateStep step) =>
      'Next: ${railTitle(step).toLowerCase()}';

  // The basics.
  static const addPhoto = 'Add a photo';
  static const addPhotoLater = 'After you pick a date';
  static const photos = 'Photos';
  static const name = 'Name';
  static const nameNeeded = 'Give it a name';
  static const format = 'Format';
  static const formatNeeded = 'Pick a format';
  static const whatsItLike = "What's it like?";
  static const distance = 'Distance';
  static const pace = 'Pace';

  static String formatLabel(CreateFormat format) => switch (format) {
    CreateFormat.quiz => 'Quiz or trivia',
    CreateFormat.run => 'Social run',
    CreateFormat.supper => 'Supper',
    CreateFormat.courts => 'Racket sports',
    CreateFormat.party => 'Party',
    CreateFormat.other => 'Something else',
  };

  static String formatShort(CreateFormat format) => switch (format) {
    CreateFormat.quiz => 'Trivia',
    CreateFormat.run => 'Social run',
    CreateFormat.supper => 'Supper',
    CreateFormat.courts => 'Racket sports',
    CreateFormat.party => 'Party',
    CreateFormat.other => 'Event',
  };

  static String formatNote(CreateFormat format) => switch (format) {
    CreateFormat.quiz => 'Your poster and live screens turn yellow.',
    CreateFormat.run => 'Adds distance and pace; the poster turns coral.',
    CreateFormat.supper =>
      'Adds courses and dietary questions; the poster turns pink.',
    CreateFormat.courts => 'Adds courts and levels; the poster turns mint.',
    CreateFormat.party => 'The poster turns magenta.',
    CreateFormat.other => 'Your poster stays ink and white.',
  };

  static String paceLabel(String pace) => switch (pace) {
    'easy' => 'Easy',
    'moderate' => 'Moderate',
    'fast' => 'Fast',
    _ => 'Competitive',
  };

  // When and where.
  static String dateRange(String from, String to) =>
      from == to ? 'Date · $from' : 'Date · $from to $to';
  static const pickDate = 'Pick a date';
  static const dates = 'Dates';
  static const dateNeeded = 'Pick a date';
  static const starts = 'Starts';
  static const ends = 'Ends';
  static const startNeeded = 'Set a start';
  static const where = 'Where';
  static const pickPlace = 'Pick a place';
  static const placeNeeded = 'Pick where it is';
  static const change = 'Change';
  static const howToFindYou = 'How to find you · optional';
  static String onTheMap(String place) => '$place on the map';
  static const alreadyOn = 'You already have something on';
  static String useDate(String date) => 'Use $date';

  // Tickets.
  static const whereSold = 'Where tickets are sold';
  static const sellOnCatch = 'Sell on Catch';
  static const sellElsewhere = 'I sell elsewhere';
  static const pricePerPlace = 'Price per place';
  static const priceNeeded = 'Set a price, or 0 for free';
  static const places = 'Places';
  static const fewerPlaces = 'Fewer places';
  static const morePlaces = 'More places';
  static const whoCanCome = 'Who can come';

  static String admissionTitle(CreateAdmission admission) =>
      switch (admission) {
        CreateAdmission.open => 'Anyone can book',
        CreateAdmission.invite => 'Invite only',
      };

  static String admissionNote(CreateAdmission admission) => switch (admission) {
    CreateAdmission.open => 'Paid places are confirmed straight away',
    CreateAdmission.invite => 'Only people with your link can book',
  };

  static const payoutNotice =
      'Guests pay into your own Razorpay account. After 30 days free, Catch '
      'bills you 5% of ticket sales, never more than ₹10,000 a cycle.';

  // The plan.
  static const planIntro =
      "The plan runs your live screen on the night: what's now, what's "
      'next, and when to move on.';
  static const startFrom = 'Start from';
  static const blank = 'Blank';

  static String template(CreateFormat format) => switch (format) {
    CreateFormat.quiz => 'Trivia night',
    CreateFormat.run => 'Social run',
    CreateFormat.supper => 'Supper club',
    CreateFormat.courts => 'Open play',
    CreateFormat.party => 'Party night',
    CreateFormat.other => 'Doors to goodbyes',
  };

  static const addStep = 'Add a step';
  static const editStep = 'Edit the step';
  static String editStepLabel(String title) => 'Edit $title';
  static const stepWhat = 'What happens';
  static const stepNote = 'Note · optional';
  static const minutes = 'Minutes';
  static const shorter = 'Shorter';
  static const longer = 'Longer';
  static const removeStep = 'Remove the step';
  static String stepMinutes(int minutes, String? note) =>
      note == null || note.isEmpty ? '$minutes min' : '$minutes min · $note';
  static const newStep = 'New step';
  static const doorsAndHellos = 'Doors and hellos';
  static const goodbyes = 'Goodbyes';

  static String mainStep(CreateFormat format) => switch (format) {
    CreateFormat.quiz => 'Quiz rounds',
    CreateFormat.run => 'The run',
    CreateFormat.supper => 'Supper',
    CreateFormat.courts => 'Games',
    CreateFormat.party => 'The party',
    CreateFormat.other => 'The main event',
  };

  // The desktop preview.
  static const whatGuestsSee = 'What guests see';
  static const previewNote =
      "The poster, ticket and live screens take the format's colour. "
      'Changes show here as you type.';
  static const stillToSet = 'Still to set';
  static const nothingToSet = 'Ready to publish';
  static const dateToCome = 'Date to come';
  static const placeToCome = 'Place to come';
  static const untitled = 'Your event';
  static const booked = 'Booked';
  static const dash = '—';

  // Share.
  static const published = 'Published';
  static const shareNote =
      'Most bookings come in the first two days, from the link in your bio '
      'and your WhatsApp groups.';
  static const copyLink = 'Copy link';
  static const linkCopied = 'Link copied';
  static const qrTitle = 'A QR for the door';
  static const qrNote = 'Walk-ins scan it to book on the spot';
  static const print = 'Print';
  static const shareStory = 'Share to your Instagram story';
  static const tellFollowers = 'Tell your followers on WhatsApp';
}
