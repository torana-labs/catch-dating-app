import 'package:catch_kernel/activity_taxonomy.dart';
import 'package:catch_tokens/catch_tokens.dart';

/// The system format colour an event's activity takes: running and
/// movement are `run`, racket sports `courts`, a table `dinner`, a crawl
/// `nightsOut`, and quizzes, mixers and anything open `games`.
CatchFormat catchFormatForActivity(ActivityKind kind) => switch (kind) {
  ActivityKind.socialRun ||
  ActivityKind.running ||
  ActivityKind.walking ||
  ActivityKind.cycling ||
  ActivityKind.spinClass ||
  ActivityKind.yoga ||
  ActivityKind.strengthTraining => CatchFormat.run,
  ActivityKind.pickleball ||
  ActivityKind.padel ||
  ActivityKind.tennis ||
  ActivityKind.badminton => CatchFormat.courts,
  ActivityKind.dinner => CatchFormat.dinner,
  ActivityKind.barCrawl => CatchFormat.nightsOut,
  ActivityKind.pubQuiz ||
  ActivityKind.singlesMixer ||
  ActivityKind.openActivity => CatchFormat.games,
};
