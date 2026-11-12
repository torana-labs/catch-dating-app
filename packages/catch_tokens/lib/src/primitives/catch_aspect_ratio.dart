/// Named media/tile ratios so repeated visual geometry is owned centrally.
abstract final class CatchAspectRatio {
  static const double square = 1.0;
  static const double wide16x9 = 16 / 9;
  static const double activityCard = 16 / 10;
  static const double roomMap = 6 / 5;
  static const double standardPhoto = 4 / 3;
  // Organizer media roles intentionally point at shared ratios so a future
  // client-display policy change is a one-line edit per role.
  static const double organizerLogo = square;
  static const double organizerCover = wide16x9;
  static const double organizerGallery = standardPhoto;
  static const double portrait4x5 = 4 / 5;
  static const double portrait3x4 = 3 / 4;
  static const double poster = portrait3x4;
  static const double profileSlotFeedback = 112 / 150;
}
