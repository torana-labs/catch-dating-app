// architecture: provider-free
import 'dart:async';

import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/widgets.dart';

/// Owns the room reveal clock without introducing a visual wrapper.
/// Host and attendee surfaces keep their distinct reveal and consent contracts.
mixin EventSuccessRevealClockMixin<W extends StatefulWidget> on State<W> {
  Timer? _timer;
  DateTime _now = DateTime.now();
  bool _enabled = false;

  bool get revealClockEnabled;

  DateTime get revealClockNow => _now;

  @override
  void initState() {
    super.initState();
    _enabled = revealClockEnabled;
    _syncTimer();
  }

  @override
  void didUpdateWidget(covariant W oldWidget) {
    super.didUpdateWidget(oldWidget);
    final enabled = revealClockEnabled;
    if (_enabled != enabled) {
      _enabled = enabled;
      _syncTimer();
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _syncTimer() {
    _timer?.cancel();
    _timer = null;
    _now = DateTime.now();
    if (!_enabled) return;
    _timer = Timer.periodic(CatchMotion.liveRevealClockTick, (_) {
      if (mounted) setState(() => _now = DateTime.now());
    });
  }
}
