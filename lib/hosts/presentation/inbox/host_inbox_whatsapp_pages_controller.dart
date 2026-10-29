import 'package:catch_dating_app/contexts/audience/data/crm/host_whatsapp_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_whatsapp_thread.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_inbox_whatsapp_pages_controller.g.dart';

class HostInboxWhatsappPageState {
  const HostInboxWhatsappPageState({
    required this.threads,
    required this.nextCursor,
    this.loadingMore = false,
    this.error,
  });
  final List<HostWhatsappThreadSummary> threads;
  final String? nextCursor;
  final bool loadingMore;
  final Object? error;
}

@riverpod
class HostInboxWhatsappPages extends _$HostInboxWhatsappPages {
  int _generation = 0;

  @override
  Future<HostInboxWhatsappPageState> build(String organizerId) async {
    _generation++;
    final page = await ref.watch(
      hostWhatsappThreadsProvider(organizerId).future,
    );
    _checkScope(page);
    return HostInboxWhatsappPageState(
      threads: page.threads,
      nextCursor: page.nextCursor,
    );
  }

  void _checkScope(HostWhatsappThreadPage page) {
    if (page.organizerId != organizerId) {
      throw StateError('WhatsApp page belongs to another organizer.');
    }
  }

  Future<void> loadMore() async {
    final generation = _generation;
    final current = state.asData?.value;
    if (current == null || current.nextCursor == null || current.loadingMore) {
      return;
    }
    state = AsyncData(
      HostInboxWhatsappPageState(
        threads: current.threads,
        nextCursor: current.nextCursor,
        loadingMore: true,
      ),
    );
    try {
      final page = await ref
          .read(hostWhatsappRepositoryProvider)
          .listWhatsappThreads(organizerId, cursor: current.nextCursor);
      if (!ref.mounted || generation != _generation) return;
      _checkScope(page);
      if (page.nextCursor == current.nextCursor) {
        throw StateError('WhatsApp cursor did not advance.');
      }
      state = AsyncData(
        HostInboxWhatsappPageState(
          threads: List.unmodifiable(
            {
              for (final t in current.threads) t.threadId: t,
              for (final t in page.threads) t.threadId: t,
            }.values,
          ),
          nextCursor: page.nextCursor,
        ),
      );
    } on Object catch (error) {
      if (ref.mounted && generation == _generation) {
        state = AsyncData(
          HostInboxWhatsappPageState(
            threads: current.threads,
            nextCursor: current.nextCursor,
            error: error,
          ),
        );
      }
    }
  }
}
