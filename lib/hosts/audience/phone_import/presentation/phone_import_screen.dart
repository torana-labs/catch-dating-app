import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/audience/phone_import/presentation/phone_import_controller.dart';
import 'package:catch_dating_app/hosts/audience/phone_import/presentation/phone_import_review_screen.dart';
import 'package:catch_dating_app/hosts/audience/phone_import/presentation/phone_import_route_controller.dart';
import 'package:catch_dating_app/hosts/audience/phone_import/presentation/phone_import_submission_controller.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Native-first program import. Both entry and every gateway operation require
/// live canonical access; a cached program page can only navigate here.
class PhoneImportScreen extends ConsumerStatefulWidget {
  const PhoneImportScreen({super.key, required this.programId});
  final String programId;

  @override
  ConsumerState<PhoneImportScreen> createState() => _PhoneImportScreenState();
}

class _PhoneImportScreenState extends ConsumerState<PhoneImportScreen>
    with WidgetsBindingObserver {
  ProviderSubscription<AsyncValue<String?>>? _authSubscription;
  Timer? _expiryTimer;
  PhoneImportController? _review;
  PhoneImportSubmissionController? _submission;
  ProgramWorkAccess? _access;
  String? _accountId;
  Object? _error;
  bool _loading = true;
  bool _refreshing = false;
  int _generation = 0;

  String? get _currentAccount =>
      ref.read(phoneImportRouteControllerProvider.notifier).readAccountId();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _authSubscription = ref.listenManual(uidProvider, (_, next) {
      if (next.isLoading) return;
      if (next.hasError || next.asData?.value != _accountId) {
        _reload();
      }
    });
    unawaited(_load());
  }

  @override
  void didUpdateWidget(PhoneImportScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.programId != widget.programId) _reload();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) unawaited(_refreshAccess());
  }

  bool _current(int generation, String account, String program) =>
      mounted &&
      generation == _generation &&
      _currentAccount == account &&
      widget.programId == program;

  void _closeReview() {
    _expiryTimer?.cancel();
    _expiryTimer = null;
    _submission?.dispose();
    _review?.dispose();
    _submission = null;
    _review = null;
    _access = null;
  }

  void _reload() {
    _generation++;
    _closeReview();
    if (!mounted) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    unawaited(_load());
  }

  Future<void> _load() async {
    final generation = _generation;
    final account = _currentAccount;
    final program = widget.programId;
    _accountId = account;
    try {
      // provider-graph: ownership-widget-async:_PhoneImportScreenState._load:await:phoneImportRouteControllerProvider.open watch CAT156 -- Existing bounded review signal at _PhoneImportScreenState._load (await:phoneImportRouteControllerProvider.open). The method combines local completion publication with an awaited provider seam or declared Future callback. Its mutated fields/caller contract need focused classification: navigation, form/media/animation feedback may be mechanical, while loaded data, authorization, server pending/error or retry identity need a generated owner. This watch disposition does not certify compliance or declare a confirmed violation; inspect the exact responsibility before its CAT156 migration.
      final session = await ref
          .read(phoneImportRouteControllerProvider.notifier)
          .open(
            programId: program,
            isCurrent: () =>
                mounted &&
                generation == _generation &&
                widget.programId == program,
          );
      if (!_current(generation, session.accountId, program)) {
        session.dispose();
        return;
      }
      _review = session.review;
      _submission = session.submission;
      setState(() {
        _access = session.access;
        _loading = false;
        _error = null;
      });
      _scheduleExpiry(session.access);
    } catch (error) {
      if (!mounted || generation != _generation) return;
      _closeReview();
      setState(() {
        _loading = false;
        _error = error;
      });
    }
  }

  void _scheduleExpiry(ProgramWorkAccess access) {
    _expiryTimer?.cancel();
    final now = DateTime.now();
    final deadline = access.nextAccessChangeAt(now);
    if (deadline == null) return;
    final delay = deadline.difference(now);
    _expiryTimer = Timer(
      delay.isNegative ? Duration.zero : delay,
      () => unawaited(_refreshAccess()),
    );
  }

  Future<void> _refreshAccess() async {
    if (_loading || _refreshing || _access == null) return;
    _refreshing = true;
    final generation = _generation;
    final account = _accountId;
    final program = widget.programId;
    try {
      // provider-graph: ownership-widget-async:_PhoneImportScreenState._refreshAccess:await:phoneImportRouteControllerProvider.refreshAccess watch CAT156 -- Existing bounded review signal at _PhoneImportScreenState._refreshAccess (await:phoneImportRouteControllerProvider.refreshAccess). The method combines local completion publication with an awaited provider seam or declared Future callback. Its mutated fields/caller contract need focused classification: navigation, form/media/animation feedback may be mechanical, while loaded data, authorization, server pending/error or retry identity need a generated owner. This watch disposition does not certify compliance or declare a confirmed violation; inspect the exact responsibility before its CAT156 migration.
      final access = await ref
          .read(phoneImportRouteControllerProvider.notifier)
          .refreshAccess(
            programId: program,
            accountId: account,
            organizerId: _access?.organizerId,
            isCurrent: () =>
                mounted &&
                generation == _generation &&
                widget.programId == program,
          );
      if (account == null || !_current(generation, account, program)) return;
      _access = access;
      _scheduleExpiry(access);
    } catch (error) {
      if (!mounted || generation != _generation) return;
      _closeReview();
      setState(() {
        _loading = false;
        _error = error;
      });
    } finally {
      _refreshing = false;
    }
  }

  @override
  void dispose() {
    _generation++;
    _authSubscription?.close();
    WidgetsBinding.instance.removeObserver(this);
    _closeReview();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(phoneImportRouteControllerProvider);
    if (!_loading && _error == null && _review != null && _submission != null) {
      return PhoneImportReviewScreen(
        controller: _review!,
        submission: _submission!,
        weddingName: _access!.title,
        onReloadSaved: _reload,
      );
    }
    return CatchRouteScaffold(
      topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
        title: context.l10n.phoneImportTitle,
        emphasis: scrolledUnder
            ? CatchTopBarEmphasis.divided
            : CatchTopBarEmphasis.plain,
        navigation: const CatchTopBarNavigation(
          mode: CatchTopBarNavigationMode.back,
        ),
      ),
      body: CatchRouteBody.standardViewport(
        child: _loading
            ? const CatchStateViewport.loading(accountForBottomOverlay: false)
            : CatchLocalizedErrorState(
                _error!,
                context: AppErrorContext.event,
                onRetry: _reload,
              ),
      ),
    );
  }
}
