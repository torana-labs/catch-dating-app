import 'package:catch_kernel/brand.dart';
import 'package:catch_platform/brand/live_brand.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const hostIos = 'https://apps.apple.com/app/catch-host/id6778927317';
  const catchAndroid =
      'https://play.google.com/store/apps/details?id=com.catchdates.app';
  final fallback = LiveBrand(
    consumer: StoreLinks(android: Uri.parse(catchAndroid)),
    host: StoreLinks(ios: Uri.parse(hostIos)),
  );

  test('the generated fallback mirrors brand.dart', () {
    expect(LiveBrand.generated.host.ios?.toString(), Brand.storesHostIos);
    expect(
      LiveBrand.generated.host.android?.toString(),
      Brand.storesHostAndroid,
    );
    expect(
      LiveBrand.generated.consumer.ios?.toString(),
      Brand.storesConsumerIos,
    );
    expect(
      LiveBrand.generated.consumer.android?.toString(),
      Brand.storesConsumerAndroid,
    );
  });

  test('a missing or unreadable document keeps the fallback', () {
    expect(LiveBrand.fromConfig(null, fallback: fallback), fallback);
    expect(LiveBrand.fromConfig({'stores': 3}, fallback: fallback), fallback);
  });

  test('a set slot in config/brand replaces the generated value', () {
    const newIos = 'https://apps.apple.com/app/catch/id1000000001';
    final live = LiveBrand.fromConfig({
      'stores': {
        'consumer': {'ios': newIos, 'android': catchAndroid},
        'host': {'ios': hostIos, 'android': null},
      },
    }, fallback: fallback);
    expect(live.consumer.ios, Uri.parse(newIos));
    expect(live.consumer.android, Uri.parse(catchAndroid));
  });

  test('a null slot in config/brand takes the link down', () {
    final live = LiveBrand.fromConfig({
      'stores': {
        'consumer': {'ios': null, 'android': null},
        'host': {'ios': null, 'android': null},
      },
    }, fallback: fallback);
    expect(live, const LiveBrand(consumer: StoreLinks(), host: StoreLinks()));
  });

  test('a missing, mistyped or off-store slot keeps the fallback', () {
    final live = LiveBrand.fromConfig({
      'stores': {
        'consumer': {'ios': 42, 'android': 'https://evil.example/app'},
        'host': {'android': 'https://apps.apple.com/app/id1'},
      },
    }, fallback: fallback);
    expect(live, fallback);
  });

  test('a link is offered only on its own platform', () {
    final links = StoreLinks(
      ios: Uri.parse(hostIos),
      android: Uri.parse(catchAndroid),
    );
    expect(
      links.forPlatform(TargetPlatform.iOS, isWeb: false),
      Uri.parse(hostIos),
    );
    expect(
      links.forPlatform(TargetPlatform.android, isWeb: false),
      Uri.parse(catchAndroid),
    );
    expect(links.forPlatform(TargetPlatform.macOS, isWeb: false), isNull);
    expect(links.forPlatform(TargetPlatform.iOS, isWeb: true), isNull);
  });

  test('fromStrings drops a malformed generated link', () {
    final links = StoreLinks.fromStrings(ios: 'nope', android: catchAndroid);
    expect(links.ios, isNull);
    expect(links.android, Uri.parse(catchAndroid));
  });

  test('the provider reads config/brand once and keeps it', () async {
    final firestore = FakeFirebaseFirestore();
    await firestore.doc('config/brand').set({
      'stores': {
        'consumer': {'ios': null, 'android': catchAndroid},
        'host': {'ios': hostIos, 'android': null},
      },
    });
    final container = ProviderContainer(
      overrides: [firebaseFirestoreProvider.overrideWithValue(firestore)],
    );
    addTearDown(container.dispose);

    final live = await container.read(liveBrandProvider.future);
    expect(live.consumer.android, Uri.parse(catchAndroid));
    expect(live.host.ios, Uri.parse(hostIos));
  });

  test('a missing document falls back to the generated values', () async {
    final container = ProviderContainer(
      overrides: [
        firebaseFirestoreProvider.overrideWithValue(FakeFirebaseFirestore()),
      ],
    );
    addTearDown(container.dispose);

    expect(await container.read(liveBrandProvider.future), LiveBrand.generated);
  });
}
