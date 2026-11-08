/// A countdown as the boards print it: "9:40", "0:07", "12:00".
String formatsClock(Duration value) {
  final minutes = value.inMinutes;
  final seconds = value.inSeconds % 60;
  return '$minutes:${seconds.toString().padLeft(2, '0')}';
}

/// A pace or a length given in whole seconds, as a clock: "6:00".
String formatsClockSeconds(int seconds) =>
    formatsClock(Duration(seconds: seconds));
