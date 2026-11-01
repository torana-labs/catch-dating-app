import 'dart:async';

import 'package:catch_dating_app/contexts/organizers/domain/organizer_host_defaults.dart';
import 'package:flutter/foundation.dart';

typedef OrganizerHostDefaultsUpdate =
    OrganizerHostDefaults Function(OrganizerHostDefaults current);
typedef OrganizerHostDefaultsWriter =
    Future<void> Function(OrganizerHostDefaults defaults);
typedef OrganizerHostDefaultsErrorMessage = String Function(Object error);

// provider-graph: ownership-listenable:HostOrganizerDefaultsSaver:reactive-state planned CAT156 -- HostOrganizerDefaultsSaver is a verified existing business-state Listenable owner (the EventPreferencesEditorController entry is the shared abstract base). Migrate its manual loaded/operation/error publication to an immutable generated owner in the bounded CAT156 slice, preserving identity, cancellation, in-flight deduplication and any journal/idempotency guarantees.
/// Serialized optimistic writer for club-level host defaults.
///
/// Rapid functional updates coalesce behind one in-flight write. A failed
/// terminal write restores the last confirmed value; a newer queued update is
/// still attempted against the current optimistic value.
class HostOrganizerDefaultsSaver extends ChangeNotifier {
  HostOrganizerDefaultsSaver({
    required OrganizerHostDefaults initial,
    required this._writer,
    required this._errorMessageFor,
  }) : _confirmed = initial,
       _optimistic = initial;

  final OrganizerHostDefaultsWriter _writer;
  final OrganizerHostDefaultsErrorMessage _errorMessageFor;

  OrganizerHostDefaults _confirmed;
  OrganizerHostDefaults _optimistic;
  OrganizerHostDefaults? _queued;
  bool _flushing = false;
  bool _disposed = false;
  String? _errorMessage;

  OrganizerHostDefaults get optimistic => _optimistic;
  String? get errorMessage => _errorMessage;
  bool get isSaving => _flushing || _queued != null;

  void reconcile(OrganizerHostDefaults value) {
    if (_flushing || _queued != null || value == _confirmed) return;
    _confirmed = value;
    _optimistic = value;
    _errorMessage = null;
    notifyListeners();
  }

  void apply(OrganizerHostDefaultsUpdate update) {
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
