import 'package:catch_dating_app/core/schema_contracts/generated/callable_request_dtos.g.dart'
    show UpdateUserProfilePatch;
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:catch_dating_app/user_profile/presentation/profile_edit_controller.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

typedef InlineSaveCallback = VoidCallback;

mixin InlineSaveState<T extends ConsumerStatefulWidget> on ConsumerState<T> {
  bool _isSaving = false;
  Object? _saveError;

  bool get isSaving => _isSaving;
  Object? get saveError => _saveError;

  void clearSaveError() {
    if (_saveError == null) return;
    setState(() => _saveError = null);
  }

  Future<bool> _save(Future<void> Function() save) async {
    if (_isSaving) return false;
    setState(() {
      _isSaving = true;
      _saveError = null;
    });

    try {
      await save();
      if (!mounted) return false;
      setState(() => _isSaving = false);
      return true;
    } catch (error) {
      if (!mounted) return false;
      setState(() {
        _isSaving = false;
        _saveError = error;
      });
      return false;
    }
  }

  Future<bool> saveFields(UpdateUserProfilePatch patch) {
    return _save(
      () => ProfileEditController.saveFieldsMutation.run(
        ref,
        (tx) async =>
            tx.get(profileEditControllerProvider.notifier).saveFields(patch),
      ),
    );
  }

  /// Runs an injected descriptor-layer save through the same field-local
  /// pending/error state as the legacy profile save helpers.
  Future<bool> saveWith(Future<void> Function() save) => _save(save);

  Future<bool> saveFieldsFromLatest(LatestProfilePatchBuilder buildPatch) {
    return _save(
      () => ProfileEditController.saveFieldsMutation.run(
        ref,
        (tx) async => tx
            .get(profileEditControllerProvider.notifier)
            .saveFieldsFromLatest(buildPatch),
      ),
    );
  }

  Widget? buildSaveError() {
    final error = _saveError;
    if (error == null) return null;
    return CatchBanner.error(
      message: appErrorMessage(
        error,
        l10n: context.l10n,
        context: AppErrorContext.profile,
      ),
    );
  }
}
