import 'package:catch_dating_app/contexts/account/data/require_signed_in_uid.dart';
import 'package:catch_dating_app/contexts/insights/data/host_today_preference_repository.dart';
import 'package:catch_dating_app/contexts/insights/domain/host_today_preference.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_today_preference_controller.g.dart';

@riverpod
Future<HostTodayPreference> hostTodayPreference(
  Ref ref,
  HostTodayPreferenceScope scope,
) => ref.watch(hostTodayPreferenceRepositoryProvider).load(scope);

@riverpod
class HostTodayPreferenceController extends _$HostTodayPreferenceController {
  static final saveMutation = Mutation<void>();

  Future<void>? _saveInFlight;

  @override
  void build(HostTodayPreferenceScope scope) {}

  Future<void> select(HostTodayFocus focus) =>
      _save(HostTodayPreference.selected(focus));

  Future<void> skip() => _save(const HostTodayPreference.skipped());

  Future<void> _save(HostTodayPreference preference) {
    // The full-screen form disables all choices and exit controls while this
    // mutation is pending. Repeated submission shares the captured decision.
    final inFlight = _saveInFlight;
    if (inFlight != null) return inFlight;
    final request = _persist(preference);
    _saveInFlight = request;
    return request.whenComplete(() => _saveInFlight = null);
  }

  Future<void> _persist(HostTodayPreference preference) async {
    final uid = requireSignedInUid(ref, action: 'personalize Today');
    if (uid != scope.accountId) {
      throw const SignInRequiredException('personalize Today');
    }
    final repository = ref.read(hostTodayPreferenceRepositoryProvider);
    await repository.save(scope, preference);
    if (!ref.mounted) return;
    ref.invalidate(hostTodayPreferenceProvider(scope));
  }
}
