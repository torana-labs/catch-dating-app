import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'celebration_effects_controller.g.dart';

enum CelebrationMomentKind { eventCreated, eventJoined, eventCheckedIn, match }

// keepalive: celebration effects coordinate transient app-wide moments across
// route transitions.
@Riverpod(keepAlive: true)
CelebrationEffectsController celebrationEffectsController(Ref ref) {
  final controller = CelebrationEffectsController();
  ref.onDispose(controller.dispose);
  return controller;
}

/// Plays the haptic + optional sound layered on a full-screen celebration.
///
/// Sound is an enhancement on top of the always-on haptic: it gracefully
/// no-ops when the audio asset is absent (the files in
/// `assets/audio/celebration/` are a design deliverable — see the README
/// there) or the audio plugin is unavailable (web / unit-test). The
/// screen-level `playEffects` flag already controls whether effects run at
/// all, so this never needs a separate user toggle.
class CelebrationEffectsController {
  CelebrationEffectsController();

  AudioPlayer? _effectPlayer;
  final Set<String> _missingAssets = {};
  bool _disposed = false;

  Future<void> play(CelebrationMomentKind kind) async {
    if (_disposed) return;
    await Future.wait([_playHaptic(kind), _playSound(kind)]);
  }

  Future<void> _playHaptic(CelebrationMomentKind kind) async {
    await _runSafely(null, () async {
      switch (kind) {
        case CelebrationMomentKind.eventCreated:
        case CelebrationMomentKind.eventJoined:
          await HapticFeedback.mediumImpact();
          return;
        case CelebrationMomentKind.eventCheckedIn:
          await HapticFeedback.lightImpact();
          return;
        case CelebrationMomentKind.match:
          await HapticFeedback.heavyImpact();
          return;
      }
    });
  }

  Future<void> _playSound(CelebrationMomentKind kind) async {
    final asset = _assetFor(kind);
    if (_missingAssets.contains(asset)) return;
    final player = _effectPlayer ??= AudioPlayer();
    await _runSafely(asset, () async {
      await player.setPlayerMode(PlayerMode.lowLatency);
      await player.setReleaseMode(ReleaseMode.release);
      await player.setVolume(_volumeFor(kind));
      await player.play(AssetSource(asset));
    });
  }

  static String _assetFor(CelebrationMomentKind kind) => switch (kind) {
    CelebrationMomentKind.eventCreated => 'audio/celebration/event_created.mp3',
    CelebrationMomentKind.eventJoined => 'audio/celebration/event_joined.mp3',
    CelebrationMomentKind.eventCheckedIn => 'audio/celebration/checked_in.mp3',
    CelebrationMomentKind.match => 'audio/celebration/match.mp3',
  };

  // The match lands heaviest; check-in is the lightest confirm.
  static double _volumeFor(CelebrationMomentKind kind) => switch (kind) {
    CelebrationMomentKind.match => 0.95,
    CelebrationMomentKind.eventCreated => 0.72,
    CelebrationMomentKind.eventJoined => 0.72,
    CelebrationMomentKind.eventCheckedIn => 0.55,
  };

  Future<void> dispose() async {
    if (_disposed) return;
    _disposed = true;
    final player = _effectPlayer;
    _effectPlayer = null;
    if (player != null) {
      await _runSafely(null, player.dispose);
    }
  }

  /// Catch every plausible failure so a celebration audio gap never breaks the
  /// moment: missing platform plugin (web / unit-test), missing asset file, or
  /// a transient player error. A missing asset is remembered so we stop
  /// retrying it for the rest of the session.
  Future<void> _runSafely(String? asset, Future<void> Function() body) async {
    try {
      await body();
    } catch (error) {
      if (asset != null) _missingAssets.add(asset);
      if (kDebugMode) {
        debugPrint('CelebrationEffects: skipped ${asset ?? 'haptic'} ($error)');
      }
    }
  }
}
