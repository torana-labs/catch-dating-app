import 'package:flutter/foundation.dart';

// provider-graph: ownership-listenable:HostReplyDrafts:reactive-state watch CAT156 -- Mixed workspace text/selected-route mechanics and sending/payload-bound retry identity. Preserve the current operation key and draft lifetime; focused responsibility/caller tests must decide the business-owner split before migration. Not classified as a confirmed business ChangeNotifier violation in this slice.
/// Workspace-owned drafts survive pane rebuilds and keep retries on one operation.
class HostReplyDrafts extends ChangeNotifier {
  final Map<String, _Draft> _drafts = {};
  final Map<String, String> _selectedRoutes = {};
  int _sequence = 0;
  bool _disposed = false;

  @override
  void dispose() {
    _disposed = true;
    _drafts.clear();
    _selectedRoutes.clear();
    super.dispose();
  }

  String? selectedRoute(String context) => _selectedRoutes[context];
  void selectRoute(String context, String route) {
    if (_disposed) return;
    _selectedRoutes[context] = route;
    notifyListeners();
  }

  String text(String key) => _drafts[key]?.text ?? '';
  bool sending(String key) => _drafts[key]?.sending ?? false;
  void setText(String key, String text) {
    if (_disposed) return;
    final draft = _drafts.putIfAbsent(key, _Draft.new);
    if (draft.text == text) return;
    draft.text = text;
    notifyListeners();
  }

  String? begin(String key, String body) {
    if (_disposed) return null;
    final draft = _drafts.putIfAbsent(key, _Draft.new);
    if (draft.sending) return null;
    if (draft.operationBody != body || draft.operationId == null) {
      draft.operationBody = body;
      draft.operationId =
          'reply-${DateTime.now().microsecondsSinceEpoch}-${_sequence++}';
    }
    draft.sending = true;
    notifyListeners();
    return draft.operationId;
  }

  void finish(String key, String operation, {required bool succeeded}) {
    if (_disposed) return;
    final draft = _drafts[key];
    if (draft == null || draft.operationId != operation) return;
    draft.sending = false;
    if (succeeded) {
      if (draft.text.trim() == draft.operationBody) draft.text = '';
      draft.operationId = null;
      draft.operationBody = null;
    }
    notifyListeners();
  }

  void clear() {
    if (_disposed) return;
    _drafts.clear();
    _selectedRoutes.clear();
    notifyListeners();
  }
}

class _Draft {
  String text = '';
  String? operationId;
  String? operationBody;
  bool sending = false;
}
