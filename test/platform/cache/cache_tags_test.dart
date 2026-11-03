import 'package:catch_platform/cache/cache_tags.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('tags are equal by type and values', () {
    expect(const _RosterTag('e1'), const _RosterTag('e1'));
    expect(const _RosterTag('e1').hashCode, const _RosterTag('e1').hashCode);
    expect(const _RosterTag('e1'), isNot(const _RosterTag('e2')));
    expect(const _RosterTag('e1'), isNot(const _InsightsTag('e1')));
  });

  test('the registry calls only the owners that provide a tag', () {
    final registry = CacheTagRegistry();
    final calls = <String>[];
    final unregister = registry.register({const _RosterTag('e1')}, () {
      calls.add('roster e1');
    });
    registry.register({const _RosterTag('e2'), const _InsightsTag('e1')}, () {
      calls.add('e2 or insights');
    });

    expect(registry.invalidate({const _RosterTag('e1')}), 1);
    expect(registry.invalidate({const _InsightsTag('e1')}), 1);
    expect(calls, ['roster e1', 'e2 or insights']);

    unregister();
    expect(registry.invalidate({const _RosterTag('e1')}), 0);
    expect(registry.registrationCount, 1);
  });

  test('a read owner registers for one build and leaves when disposed', () {
    final container = ProviderContainer.test();
    var builds = 0;
    final owner = Provider.autoDispose<int>((ref) {
      ref.providesTags({const _RosterTag('e1')});
      return ++builds;
    });
    final sub = container.listen(owner, (_, _) {});
    final registry = container.read(cacheTagsProvider);
    expect(registry.registrationCount, 1);

    registry.invalidate({const _RosterTag('e1')});
    expect(container.read(owner), 2);
    expect(registry.registrationCount, 1, reason: 'one registration per build');

    sub.close();
    container.dispose();
    expect(registry.registrationCount, 0);
  });
}

final class _RosterTag extends CacheTag {
  const _RosterTag(this.eventId);

  final String eventId;

  @override
  List<Object?> get props => [eventId];
}

final class _InsightsTag extends CacheTag {
  const _InsightsTag(this.eventId);

  final String eventId;

  @override
  List<Object?> get props => [eventId];
}
