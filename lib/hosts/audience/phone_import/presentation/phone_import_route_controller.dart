import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/phone_contact_picker.dart';
import 'package:catch_dating_app/contexts/programmes/data/phone_import_adapter.dart';
import 'package:catch_dating_app/contexts/programmes/data/phone_import_retry_store.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_setup_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/phone_contact_reference.dart';
import 'package:catch_dating_app/contexts/programmes/domain/phone_import_access.dart';
import 'package:catch_dating_app/contexts/programmes/domain/phone_import_draft.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/core/persistence/command_journal_provider.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/hosts/audience/phone_import/presentation/phone_import_controller.dart';
import 'package:catch_dating_app/hosts/audience/phone_import/presentation/phone_import_route_state.dart';
import 'package:catch_dating_app/hosts/audience/phone_import/presentation/phone_import_submission_controller.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'phone_import_route_controller.g.dart';

/// Canonical entry composition and fresh access checks. Route widgets own
/// subscriptions, navigation and Flutter lifetime mechanics, not repositories.
@riverpod
class PhoneImportRouteController extends _$PhoneImportRouteController {
  @override
  void build() {}

  String? readAccountId() =>
      ref.mounted ? ref.read(authRepositoryProvider).currentUser?.uid : null;

  void _assertCurrent(String account, bool Function() isCurrent) {
    if (!ref.mounted || !isCurrent() || readAccountId() != account) {
      throw const PermissionException(
        'The wedding or signed-in account changed.',
      );
    }
  }

  Future<ProgramWorkAccess> refreshAccess({
    required String programId,
    required String? accountId,
    String? organizerId,
    required bool Function() isCurrent,
  }) async {
    if (accountId == null) {
      throw const SignInRequiredException('import wedding guests');
    }
    _assertCurrent(accountId, isCurrent);
    final access = await ref
        .read(programWorkRepositoryProvider)
        .getWorkAccess(programId, snapshotAccountId: accountId);
    _assertCurrent(accountId, isCurrent);
    if (access.programId != programId ||
        (organizerId != null && organizerId != access.organizerId) ||
        !canImportWeddingPhoneContacts(access, DateTime.now())) {
      throw const PermissionException(
        'Current wedding-wide guest access is required.',
      );
    }
    return access;
  }

  Future<PhoneImportRouteSession> open({
    required String programId,
    required bool Function() isCurrent,
  }) async {
    final account = readAccountId();
    if (account == null) {
      throw const SignInRequiredException('import wedding guests');
    }
    final access = await refreshAccess(
      programId: programId,
      accountId: account,
      isCurrent: isCurrent,
    );
    final review = PhoneImportController(
      picker: const NativePhoneContactPicker(),
      contactReferenceId: (localId) => phoneContactReferenceId(
        accountId: account,
        programId: programId,
        localContactId: localId,
      ),
    );
    final submission = PhoneImportSubmissionController(
      review: review,
      adapter: PhoneImportAdapter(
        workRepository: ref.read(programWorkRepositoryProvider),
        setupRepository: ref.read(programSetupRepositoryProvider),
        currentAccountId: readAccountId,
        currentProgramId: () => ref.mounted && isCurrent() ? programId : null,
      ),
      retryStore: PhoneImportRetryStore(
        storage: ref.read(commandJournalStorageProvider),
        currentAccountId: readAccountId,
      ),
      accountId: account,
      programId: programId,
      organizerId: access.organizerId,
      familySideLabels: const {
        PhoneImportFamilySide.partnerOne: 'Partner one family',
        PhoneImportFamilySide.partnerTwo: 'Partner two family',
        PhoneImportFamilySide.both: 'Both families',
      },
    );
    try {
      await submission.initialize();
      final currentAccess = await refreshAccess(
        programId: programId,
        accountId: account,
        organizerId: access.organizerId,
        isCurrent: isCurrent,
      );
      if (currentAccess.isManager != access.isManager) {
        throw const PermissionException(
          'Current wedding-wide guest access must be reviewed again.',
        );
      }
      return PhoneImportRouteSession(
        accountId: account,
        access: currentAccess,
        review: review,
        submission: submission,
      );
    } catch (_) {
      submission.dispose();
      review.dispose();
      rethrow;
    }
  }
}
