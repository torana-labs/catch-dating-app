import 'package:catch_tokens/generated/catch_design_tokens.g.dart';
import 'package:flutter/painting.dart';

/// An event format. Each has a full-strength colour that means "this event";
/// quizzes and trivia are games. `@catch/web-ui` names the same five, with the
/// same `nightsOut` spelling (the token sheet writes `nights-out`).
enum CatchFormat { run, dinner, games, courts, nightsOut }

/// The four format colours from `GeneratedCatchFormatTokens`.
extension CatchFormatColors on CatchFormat {
  /// The full-strength colour: a spotlight's or band's fill.
  Color get accent => switch (this) {
    CatchFormat.run => GeneratedCatchFormatTokens.runAccent,
    CatchFormat.dinner => GeneratedCatchFormatTokens.dinnerAccent,
    CatchFormat.games => GeneratedCatchFormatTokens.gamesAccent,
    CatchFormat.courts => GeneratedCatchFormatTokens.courtsAccent,
    CatchFormat.nightsOut => GeneratedCatchFormatTokens.nightsOutAccent,
  };

  /// The deep shade: the format's colour as text on white.
  Color get deep => switch (this) {
    CatchFormat.run => GeneratedCatchFormatTokens.runDeep,
    CatchFormat.dinner => GeneratedCatchFormatTokens.dinnerDeep,
    CatchFormat.games => GeneratedCatchFormatTokens.gamesDeep,
    CatchFormat.courts => GeneratedCatchFormatTokens.courtsDeep,
    CatchFormat.nightsOut => GeneratedCatchFormatTokens.nightsOutDeep,
  };

  /// Text and icons on the accent.
  Color get ink => switch (this) {
    CatchFormat.run => GeneratedCatchFormatTokens.runInk,
    CatchFormat.dinner => GeneratedCatchFormatTokens.dinnerInk,
    CatchFormat.games => GeneratedCatchFormatTokens.gamesInk,
    CatchFormat.courts => GeneratedCatchFormatTokens.courtsInk,
    CatchFormat.nightsOut => GeneratedCatchFormatTokens.nightsOutInk,
  };

  /// Secondary text on the accent.
  Color get inkSecondary => switch (this) {
    CatchFormat.run => GeneratedCatchFormatTokens.runInkSecondary,
    CatchFormat.dinner => GeneratedCatchFormatTokens.dinnerInkSecondary,
    CatchFormat.games => GeneratedCatchFormatTokens.gamesInkSecondary,
    CatchFormat.courts => GeneratedCatchFormatTokens.courtsInkSecondary,
    CatchFormat.nightsOut => GeneratedCatchFormatTokens.nightsOutInkSecondary,
  };
}
