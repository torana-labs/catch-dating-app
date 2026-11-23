part of 'onboarding_welcome_body.dart';

double _welcomeTrackOffset({required double spinValue, required bool landed}) {
  final trackH =
      welcomePhraseBank.length * CatchWelcomeTokens.welcomeReelRowHeight;
  final base =
      CatchWelcomeTokens.welcomeReelLandingOffset(welcomeLandingIndex) % trackH;
  if (landed) return base;

  final eased = _welcomeSpinEase(spinValue, CatchMotion.welcomeSpinCurvePower);
  final endY = base + (CatchMotion.welcomeReelSpins * trackH);
  return (endY * eased) % trackH;
}

int welcomeFocusedPhraseIndex({
  required double spinValue,
  required bool landed,
}) {
  final offset = _welcomeTrackOffset(spinValue: spinValue, landed: landed);
  final centeredRow =
      ((offset +
                  CatchWelcomeTokens.welcomeReelFocus -
                  CatchWelcomeTokens.welcomeReelRowHalfHeight) /
              CatchWelcomeTokens.welcomeReelRowHeight)
          .round();
  return centeredRow % welcomePhraseBank.length;
}

double _welcomeSpinEase(double progress, double curvePower) {
  if (progress <= 0) return 0;
  if (progress >= 1) return 1;
  final a = math.pow(progress, curvePower).toDouble();
  final b = math.pow(1 - progress, curvePower).toDouble();
  return a / (a + b);
}

double _revealProgress(double value, int order) {
  final totalMs = CatchMotion.welcomeLandingReveal.inMilliseconds;
  final startMs =
      CatchMotion.welcomeRevealStart.inMilliseconds +
      (order * CatchMotion.welcomeRevealStagger.inMilliseconds);
  final endMs = startMs + CatchMotion.welcomeRevealSettle.inMilliseconds;
  final start = startMs / totalMs;
  final end = endMs / totalMs;
  final raw = ((value - start) / (end - start)).clamp(0, 1).toDouble();
  return CatchMotion.welcomeRevealCurve.transform(raw);
}

class WelcomePhrase {
  const WelcomePhrase(this.object, this.activityKind);

  final String object;
  final ActivityKind activityKind;
}

double _durationProgress(double value, Duration duration) {
  final end =
      duration.inMilliseconds / CatchMotion.welcomeLandingReveal.inMilliseconds;
  return (value / end).clamp(0, 1).toDouble();
}

const welcomePhraseBank = <WelcomePhrase>[
  WelcomePhrase('the 6:30 run', ActivityKind.socialRun),
  WelcomePhrase('the long table', ActivityKind.dinner),
  WelcomePhrase('Tuesday trivia', ActivityKind.pubQuiz),
  WelcomePhrase('Sunday doubles', ActivityKind.padel),
  WelcomePhrase('the sunset 5K', ActivityKind.running),
  WelcomePhrase('the climb', ActivityKind.strengthTraining),
  WelcomePhrase('the record fair', ActivityKind.barCrawl),
  WelcomePhrase('the gallery', ActivityKind.yoga),
  WelcomePhrase('morning swim', ActivityKind.cycling),
  WelcomePhrase('the supper club', ActivityKind.dinner),
  WelcomePhrase('someone\'s eye', ActivityKind.singlesMixer),
  WelcomePhrase('someone real', ActivityKind.socialRun),
];

const welcomeLandingIndex = 4;

String _authLocation(BuildContext context) {
  final from = _safeFrom(
    GoRouterState.of(
      context,
    ).uri.queryParameters[context.l10n.onboardingWelcomePageVisiblecopyFrom],
  );
  if (from == null) return context.l10n.onboardingWelcomePageVisiblecopyAuth;

  return Uri(
    path: context.l10n.onboardingWelcomePageVisiblecopyAuth,
    queryParameters: {'from': from},
  ).toString();
}

String? _safeFrom(String? from) {
  if (from == null || from.isEmpty || !from.startsWith('/')) return null;
  final uri = Uri.tryParse(from);
  if (uri == null || uri.hasScheme || uri.hasAuthority) return null;
  return uri.toString();
}
