import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_success_live_effects_controller.g.dart';

/// Per-moment effect dispatched by the companion runtime. Haptic and audio
/// signatures are layered so each kind has a distinct *feel* — countdown
/// rises, reveal lands with weight, afterglow softly closes.
enum EventSuccessLiveEffectKind {
  stepChange,
  countdownStart,
  assignmentRevealed,
  liveEntry,
  guideComplete,
  revealReset,
}

/// Looping background pad keyed to the moment's vibe pack. Plays *under* the
/// one-shot effects so the room reads as continuously alive instead of a
/// chain of disconnected confirmations.
enum EventSuccessAmbientBed {
  /// Warm theatrical pad — pre-event, arrival, questionnaire, first hello.
  theatrical,

  /// Beat-driven pad — live prompts, cues, assignments, wingman.
  pulse,

  /// Soft warm bed — afterglow recap.
  sunrise,

  /// Explicit "no ambient bed" (anticipation cinematic owns the soundscape).
  silent,
}

/// Asset path resolution for the audio palette. See
/// `assets/audio/event_success/README.md` for what each file represents.
class _EventSuccessAudioPalette {
  const _EventSuccessAudioPalette();

  static const _base = 'audio/event_success';

  String effectAsset(EventSuccessLiveEffectKind kind) {
    return switch (kind) {
      EventSuccessLiveEffectKind.stepChange ||
      EventSuccessLiveEffectKind.liveEntry => '$_base/ui_confirm.mp3',
      EventSuccessLiveEffectKind.countdownStart => '$_base/countdown_rise.mp3',
      EventSuccessLiveEffectKind.assignmentRevealed =>
        '$_base/reveal_climax.mp3',
      EventSuccessLiveEffectKind.guideComplete => '$_base/afterglow_settle.mp3',
      EventSuccessLiveEffectKind.revealReset => '$_base/transition_whoosh.mp3',
    };
  }

  /// Returns null for the silent bed — caller should stop, not play.
  String? bedAsset(EventSuccessAmbientBed bed) {
    return switch (bed) {
      EventSuccessAmbientBed.theatrical ||
      EventSuccessAmbientBed.pulse ||
      EventSuccessAmbientBed.sunrise => '$_base/ambient_warm_pad.mp3',
      EventSuccessAmbientBed.silent => null,
    };
  }
}

// keepalive: account-free: live effects are driven through imperative ref.read
// calls, and ambient-bed playback must not auto-dispose between route
// callbacks.
@Riverpod(keepAlive: true)
EventSuccessLiveEffectsController eventSuccessLiveEffectsController(Ref ref) {
  final controller = EventSuccessLiveEffectsController();
  ref.onDispose(controller.dispose);
  return controller;
}

/// Multi-channel effects controller layering haptics + asset audio. Designed
/// to gracefully no-op when audio assets are missing (so UI work isn't
/// blocked on the sound designer landing files).
class EventSuccessLiveEffectsController {
  EventSuccessLiveEffectsController();

  static const _palette = _EventSuccessAudioPalette();

  /// One reusable player for one-shot effects. `play()` cancels any prior
  /// playback — fine because effects are short, single-fire, and never
  /// stacked.
  AudioPlayer? _effectPlayer;

  /// Persistent player for the looping ambient bed. Lives until the
  /// controller disposes or `stopAmbientBed` is called.
  AudioPlayer? _bedPlayer;
  EventSuccessAmbientBed _currentBed = EventSuccessAmbientBed.silent;

  /// Assets we've already tried and failed to find. We don't keep retrying
  /// missing files every frame.
  final Set<String> _missingAssets = <String>{};

  bool _disposed = false;

  Future<void> play(EventSuccessLiveEffectKind kind) async {
    if (_disposed) return;
    // Haptics and audio in parallel — haptic latency is the dominant signal
    // on tap, audio gives the weight a beat behind.
    await Future.wait([_playHaptic(kind), _playEffectSound(kind)]);
  }

  Future<void> playAmbientBed(EventSuccessAmbientBed bed) async {
    if (_disposed) return;
    if (bed == _currentBed && _bedPlayer != null) return;
    _currentBed = bed;
    final asset = _palette.bedAsset(bed);
    if (asset == null) {
      await stopAmbientBed();
      return;
    }
    if (_missingAssets.contains(asset)) return;
    final player = _bedPlayer ??= _newBedPlayer();
    await _runSafely(asset, () async {
      await player.setReleaseMode(ReleaseMode.loop);
      await player.setVolume(0.42);
      await player.play(AssetSource(asset));
    });
  }

  Future<void> stopAmbientBed() async {
    final player = _bedPlayer;
    if (player == null) return;
    _currentBed = EventSuccessAmbientBed.silent;
    await _runSafely(null, player.stop);
  }

  Future<void> dispose() async {
    if (_disposed) return;
    _disposed = true;
    final effect = _effectPlayer;
    final bed = _bedPlayer;
    _effectPlayer = null;
    _bedPlayer = null;
    if (effect != null) {
      await _runSafely(null, effect.dispose);
    }
    if (bed != null) {
      await _runSafely(null, bed.dispose);
    }
  }

  Future<void> _playHaptic(EventSuccessLiveEffectKind kind) async {
    await _runSafely(null, () async {
      switch (kind) {
        case EventSuccessLiveEffectKind.stepChange:
        case EventSuccessLiveEffectKind.liveEntry:
          await HapticFeedback.lightImpact();
          return;
        case EventSuccessLiveEffectKind.countdownStart:
        case EventSuccessLiveEffectKind.guideComplete:
          await HapticFeedback.mediumImpact();
          return;
        case EventSuccessLiveEffectKind.assignmentRevealed:
          await HapticFeedback.heavyImpact();
          return;
        case EventSuccessLiveEffectKind.revealReset:
          await HapticFeedback.selectionClick();
          return;
      }
    });
  }

  Future<void> _playEffectSound(EventSuccessLiveEffectKind kind) async {
    final asset = _palette.effectAsset(kind);
    if (_missingAssets.contains(asset)) return;
    final player = _effectPlayer ??= _newEffectPlayer();
    await _runSafely(asset, () async {
      await player.setReleaseMode(ReleaseMode.release);
      // Volume tuned per kind so reveal lands heavier than tap confirms.
      final volume = switch (kind) {
        EventSuccessLiveEffectKind.assignmentRevealed => 0.95,
        EventSuccessLiveEffectKind.countdownStart => 0.78,
        EventSuccessLiveEffectKind.guideComplete => 0.62,
        EventSuccessLiveEffectKind.revealReset => 0.55,
        EventSuccessLiveEffectKind.liveEntry ||
        EventSuccessLiveEffectKind.stepChange => 0.48,
      };
      await player.setVolume(volume);
      await player.play(AssetSource(asset));
    });
  }

  AudioPlayer _newEffectPlayer() =>
      AudioPlayer()..setPlayerMode(PlayerMode.lowLatency);
  AudioPlayer _newBedPlayer() =>
      AudioPlayer()..setPlayerMode(PlayerMode.mediaPlayer);

  /// Catch every plausible failure mode so audio gaps never break the UI:
  /// missing platform plugin (web/unit-test envs), missing asset file
  /// (sound designer hasn't shipped it yet), platform errors, anything else.
  /// On asset-missing, memoize the path so we don't retry every frame.
  Future<void> _runSafely(
    String? assetPath,
    Future<void> Function() action,
  ) async {
    try {
      await action();
    } on MissingPluginException {
      return;
    } on PlatformException catch (error) {
      if (assetPath != null && _isMissingAssetError(error)) {
        _missingAssets.add(assetPath);
      }
      return;
    } catch (error, stack) {
      // Last-resort guard — log in debug, swallow in release. Audio is
      // best-effort and must never throw past the controller.
      assert(() {
        debugPrint('EventSuccessLiveEffects suppressed error: $error\n$stack');
        return true;
      }());
      if (assetPath != null) _missingAssets.add(assetPath);
    }
  }

  bool _isMissingAssetError(PlatformException error) {
    final message = error.message?.toLowerCase() ?? '';
    return message.contains('not found') ||
        message.contains('no such file') ||
        message.contains('unable to load') ||
        error.code.toLowerCase().contains('not_found');
  }
}
