import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_crawl_state.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_run_state.dart';
import 'package:catch_dating_app/hosts/live/live_scores_state.dart';
import 'package:catch_dating_app/hosts/live/live_state.dart';
import 'package:flutter/foundation.dart';

/// Where the practice console is: reading the rehearsal, practising, or
/// unable to read it.
enum HostRehearsalPracticeStatus { loading, ready, error }

/// Which rebuilt console the rehearsed night runs on, chosen the way a real
/// night's Live link chooses: one room, a run, or a crawl.
enum HostRehearsalPracticeConsole { live, run, crawl }

/// Everything the practice console shows, as plain values: the rehearsal
/// it came from and the rebuilt consoles' own states, built from the
/// rehearsal's made-up guests and virtual clock.
@immutable
class HostRehearsalPracticeState {
  const HostRehearsalPracticeState({
    required this.status,
    this.console = HostRehearsalPracticeConsole.live,
    this.rehearsal,
    this.event,
    this.live = const HostLiveState.loading(),
    this.scores = const HostLiveScoresState.loading(),
    this.run = const HostFormatsRunState.loading(),
    this.crawl = const HostFormatsCrawlState.loading(),
    this.error,
  });

  const HostRehearsalPracticeState.loading()
    : this(status: HostRehearsalPracticeStatus.loading);

  final HostRehearsalPracticeStatus status;
  final HostRehearsalPracticeConsole console;

  /// The rehearsal read, which every practice command is fenced against.
  final EventRehearsalBootstrap? rehearsal;

  /// The rehearsed night as an event that exists only on this phone.
  final Event? event;

  /// The one-room console, for [HostRehearsalPracticeConsole.live].
  final HostLiveState live;

  /// The scores screen, for a one-room night that keeps score.
  final HostLiveScoresState scores;

  /// The run console, for [HostRehearsalPracticeConsole.run].
  final HostFormatsRunState run;

  /// The crawl board, for [HostRehearsalPracticeConsole.crawl].
  final HostFormatsCrawlState crawl;
  final Object? error;

  /// The rehearsal's virtual clock: the time the consoles read.
  DateTime? get now => rehearsal?.session.virtualNow;
}

/// The name the practice scores screen is pushed under, so Now can pop
/// back to the console.
const hostRehearsalPracticeViewRouteName = 'host-rehearsal-practice-view';
