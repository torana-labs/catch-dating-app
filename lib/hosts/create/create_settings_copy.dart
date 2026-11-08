/// Copy for the Create fields the board drew and the backend now carries.
///
/// It lives here, not in `packages/l10n/lib/app_en.arb`, only because another
/// lane holds the ARB while this one runs. Move these into `hostCreate…`
/// messages when it frees.
abstract final class CreateSettingsCopy {
  static const bookingLink = 'Where guests buy tickets';
  static const bookingLinkHint = 'https://';
  static const waitlist = "Waitlist when it's full";
  static const waitlistBody = 'You offer freed places in order';
  static const approveEach = 'You approve each request';
  static const approveEachBody = 'People ask to join; you let them in';
  static const planVisible = 'Guests see the plan';
  static const planVisibleBody = "On their phones, with the step that's on now";
  static const repeat = 'Every week';
  static String repeatOn(String weekday) => 'Every $weekday';
  static const repeatBody = "We'll set up the next 8 for you to edit";
}
