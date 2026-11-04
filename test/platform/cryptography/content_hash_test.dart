import 'package:catch_platform/cryptography/content_hash.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  // Computed with `operationContentHash` in functions/src/operations/
  // durableActions.ts; the two derivations must stay equal.
  test('matches the Functions operationContentHash', () {
    expect(
      operationContentHash({
        'b': 1,
        'a': [
          true,
          null,
          'x',
          {'d': 'é', 'c': -2},
        ],
      }),
      '5c6cf7ecbc6f0ed42b5f60a4ecec29757443b9fbd89be89d3d3b42d49141fdf7',
    );
    expect(
      operationContentHash([
        {'mode': 'live', 'organizerId': 'org-1', 'eventId': 'event-1'},
        'event:whole',
      ]),
      '763536da95cdb87bce6bad6f19ac4b406a48212521bb493f673300ca87bde7a5',
    );
    expect(
      operationContentHash('plain'),
      '945603a8f587786b463c3f94fce115c0fae88fac2728cc96ddf5981cf7f61741',
    );
    expect(
      operationContentHash(null),
      '74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b',
    );
  });

  test('object key order does not change the hash', () {
    expect(
      operationContentHash({'b': 1, 'a': 2}),
      operationContentHash({'a': 2, 'b': 1}),
    );
  });

  test('non-JSON values and fractional numbers are refused', () {
    expect(() => operationContentHash(1.5), throwsArgumentError);
    expect(() => operationContentHash(DateTime(2026)), throwsArgumentError);
  });
}
