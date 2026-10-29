import 'dart:async';

import 'package:catch_dating_app/contexts/organizers/domain/club_host_defaults.dart';
import 'package:flutter/foundation.dart';

typedef ClubHostDefaultsUpdate =
    ClubHostDefaults Function(ClubHostDefaults current);
typedef ClubHostDefaultsWriter =
    Future<void> Function(ClubHostDefaults defaults);
typedef ClubHostDefaultsErrorMessage = String Function(Object error);

/// Serialized optimistic writer for club-level host defaults.
///
/// Rapid functional updates coalesce behind one in-flight write. A failed
/// terminal write restores the last confirmed value; a newer queued update is
/// still attempted against the current optimistic value.
class HostClubDefaultsSaver extends ChangeNotifier {
  HostClubDefaultsSaver({
    required ClubHostDefaults initial,
    required this._writer,
    required this._errorMessageFor,
  }) : _confirmed = initial,
       _optimistic = initial;

  final ClubHostDefaultsWriter _writer;
  final ClubHostDefaultsErrorMessage _errorMessageFor;

  ClubHostDefaults _confirmed;
  ClubHostDefaults _optimistic;
  ClubHostDefaults? _queued;
  bool _flushing = false;
  bool _disposed = false;
  String? _errorMessage;

  ClubHostDefaults get optimistic => _optimistic;
  String? get errorMessage => _errorMessage;
  bool get isSaving => _flushing || _queued != null;

  void reconcile(ClubHostDefaults value) {
    if (_flushing || _queued != null || value == _confirmed) return;
    _confirmed = value;
    _optimistic = value;
    _errorMessage = null;
    notifyListeners();
  }

  void apply(ClubHostDefaultsUpdate update) {
    final next = update(_optimistic);
    if (next == _optimistic) return;
    _optimistic = next;
    _queued = next;
    _errorMessage = null;
    notifyListeners();
    unawaited(_flush());
  }

  Future<void> _flush() async {
    if (_flushing) return;
    _flushing = true;
    _notifyIfActive();
    try {
      while (!_disposed) {
        final target = _queued;
        if (target == null) break;
        _queued = null;
        try {
          await _writer(target);
        } catch (error) {
          if (_disposed) return;
          _errorMessage = _errorMessageFor(error);
          if (_queued == null) _optimistic = _confirmed;
          notifyListeners();
          continue;
        }
        if (_disposed) return;
        _confirmed = target;
        if (_queued == null) _optimistic = target;
        _errorMessage = null;
        notifyListeners();
      }
    } finally {
      _flushing = false;
      _notifyIfActive();
    }
  }

  void _notifyIfActive() {
    if (!_disposed) notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    super.dispose();
  }
}
