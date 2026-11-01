import 'dart:convert';
import 'dart:math';

import 'package:catch_dating_app/contexts/programmes/data/phone_contact_picker.dart';
import 'package:catch_dating_app/contexts/programmes/domain/phone_contact.dart';
import 'package:catch_dating_app/contexts/programmes/domain/phone_import_draft.dart';
import 'package:flutter/foundation.dart';

enum PhoneImportNotice {
  cancelled,
  denied,
  unavailable,
  failed,
  tooMany,
  reviewLimit,
  empty,
}

// provider-graph: ownership-listenable:PhoneImportController:reactive-state planned CAT156 -- PhoneImportController is a verified existing business-state Listenable owner (the EventPreferencesEditorController entry is the shared abstract base). Migrate its manual loaded/operation/error publication to an immutable generated owner in the bounded CAT156 slice, preserving identity, cancellation, in-flight deduplication and any journal/idempotency guarantees.
/// Owns the disposable in-memory review; submission uses the canonical adapter.
class PhoneImportController extends ChangeNotifier {
  PhoneImportController({required this.picker, this.contactReferenceId});
  final String Function(String localContactId)? contactReferenceId;
  final PhoneContactPicker picker;
  final Map<String, String> _localIds = {};
  List<PhoneImportEntry> _entries = [];
  bool _picking = false;
  bool _submissionLocked = false;
  bool _sharingConfirmed = false;
  bool _disposed = false;
  int _generation = 0;
  PhoneImportNotice? _notice;
  PhoneImportReview? _review;
  List<PhoneImportEntry> get entries => List.unmodifiable(_entries);
  bool get picking => _picking;
  bool get interactionLocked => _picking || _submissionLocked;
  void setSubmissionLocked(bool value) {
    if (_disposed || value == _submissionLocked) return;
    _submissionLocked = value;
    _changed();
  }

  PhoneImportNotice? get notice => _notice;
  bool get sharingConfirmed => _sharingConfirmed;
  bool get canReview =>
      !_picking &&
      _sharingConfirmed &&
      _entries.isNotEmpty &&
      _entries.every((entry) => entry.valid);
  Set<String> get sharedPhones {
    final keys = <String, int>{};
    for (final entry in _entries) {
      if ((entry.phoneForImport ?? entry.selectedPhone) case final value?) {
        final key = phoneSelectionKey(value);
        keys[key] = (keys[key] ?? 0) + 1;
      }
    }
    return keys.entries
        .where((entry) => entry.value > 1)
        .map((entry) => entry.key)
        .toSet();
  }

  Future<void> pickContacts() async {
    if (interactionLocked || _disposed) return;
    final generation = _generation;
    _picking = true;
    _notice = null;
    _changed();
    PhoneContactPickerResult result;
    try {
      result = await picker.pickContacts();
    } catch (_) {
      // Native failures intentionally become the user-visible failed notice.
      // Contact payloads must never enter logs.
      result = PhoneContactPickerResult(PhoneContactPickerStatus.failed);
    }
    if (_disposed || generation != _generation) return;
    _picking = false;
    _notice = switch (result.status) {
      PhoneContactPickerStatus.cancelled => PhoneImportNotice.cancelled,
      PhoneContactPickerStatus.denied => PhoneImportNotice.denied,
      PhoneContactPickerStatus.unavailable => PhoneImportNotice.unavailable,
      PhoneContactPickerStatus.failed => PhoneImportNotice.failed,
      PhoneContactPickerStatus.tooMany => PhoneImportNotice.tooMany,
      PhoneContactPickerStatus.selected => null,
    };
    if (result.status == PhoneContactPickerStatus.selected) {
      final newIds = result.contacts
          .map((contact) => contact.localId)
          .toSet()
          .difference(_localIds.keys.toSet());
      if (_entries.length + newIds.length > 100) {
        _notice = PhoneImportNotice.reviewLimit;
      } else {
        var changed = false;
        for (final contact in result.contacts) {
          final existingId = _localIds[contact.localId];
          if (existingId != null) {
            final index = _entries.indexWhere(
              (entry) => entry.id == existingId,
            );
            if (index >= 0) {
              final entry = _entries[index];
              final numbers = [...entry.numbers];
              for (final number in contact.numbers) {
                if (!numbers.any(
                  (n) =>
                      phoneSelectionKey(n.value) ==
                      phoneSelectionKey(number.value),
                )) {
                  numbers.add(number);
                  changed = true;
                }
              }
              _entries[index] = entry.copyWith(numbers: numbers);
            }
            continue;
          }
          final id = contactReferenceId?.call(contact.localId) ?? _id();
          _localIds[contact.localId] = id;
          _entries.add(
            PhoneImportEntry(
              id: id,
              displayName: contact.displayName,
              originalName: contact.displayName,
              numbers: contact.numbers,
              selectedPhone: contact.numbers.length == 1
                  ? contact.numbers.single.value
                  : null,
            ),
          );
          changed = true;
        }
        if (changed) _invalidateReview();
        if (result.contacts.isEmpty) {
          _notice = PhoneImportNotice.empty;
        }
      }
    }
    _changed();
  }

  void rename(String id, String name) =>
      _update(id, (entry) => entry.copyWith(displayName: name));
  void choosePhone(String id, String? phone) => _update(
    id,
    (entry) => phone == null || entry.numbers.any((n) => n.value == phone)
        ? entry.copyWith(
            selectedPhone: phone,
            clearPhone: phone == null,
            clearReviewedPhone: true,
          )
        : entry,
  );
  void reviewInternationalPhone(String id, String value) =>
      _update(id, (entry) => entry.copyWith(reviewedInternationalPhone: value));

  void assignFamilySide(String id, PhoneImportFamilySide side) =>
      _update(id, (entry) => entry.copyWith(familySide: side));
  void assignHousehold(String id, String value) =>
      _update(id, (entry) => entry.copyWith(household: value));
  void remove(String id) {
    if (interactionLocked || _disposed) return;
    _entries.removeWhere((entry) => entry.id == id);
    _localIds.removeWhere((_, value) => value == id);
    _invalidateReview();
    _changed();
  }

  void addHouseholdMember({required String name, String household = ''}) {
    if (interactionLocked || _disposed || _entries.length >= 100) return;
    _entries.add(
      PhoneImportEntry(
        id: _id(),
        displayName: name,
        numbers: const [],
        household: household,
        source: PhoneImportEntrySource.manualHouseholdMember,
      ),
    );
    _invalidateReview();
    _changed();
  }

  void confirmSharing(bool value) {
    if (interactionLocked || _disposed) return;
    _sharingConfirmed = value;
    _review = null;
    _changed();
  }

  PhoneImportReview? prepareReview() {
    if (!canReview) return null;
    return _review ??= PhoneImportReview(reviewId: _id(), entries: _entries);
  }

  void discard() {
    if (_submissionLocked || _disposed) return;
    _generation++;
    _picking = false;
    _entries = [];
    _localIds.clear();
    _notice = null;
    _invalidateReview();
    _changed();
  }

  void _update(String id, PhoneImportEntry Function(PhoneImportEntry) update) {
    if (interactionLocked || _disposed) return;
    final index = _entries.indexWhere((entry) => entry.id == id);
    if (index < 0) return;
    _entries[index] = update(_entries[index]);
    _invalidateReview();
    _changed();
  }

  void _invalidateReview() {
    _sharingConfirmed = false;
    _review = null;
  }

  void _changed() {
    if (!_disposed) notifyListeners();
  }

  static String _id() =>
      base64Url.encode(List.generate(18, (_) => Random.secure().nextInt(256)));
  @override
  void dispose() {
    _disposed = true;
    _generation++;
    _entries.clear();
    _localIds.clear();
    _review = null;
    super.dispose();
  }
}
