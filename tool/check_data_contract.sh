#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"
cd "$repo_root"

echo "==> Checking generated shared business constants"
node tool/contracts/generate_business_rules.mjs --check

echo "==> Checking schema contract sources"
node tool/contracts/validate_schema_contracts.mjs
node tool/contracts/check_migration_contracts.mjs

echo "==> Checking generated schema contract outputs"
node tool/contracts/generate_schema_contracts.mjs --check
node --test tool/contracts/generate_flutter_form_contract_inventory.test.mjs
node tool/contracts/generate_flutter_form_contract_inventory.mjs --check
node --check tool/contracts/generated/schema_contract_validators.mjs
node tool/contracts/check_schema_type_boundaries.mjs
node tool/contracts/check_schema_fixtures.mjs

echo "==> Checking generated domain classes are current"
node tool/contracts/generate_domain_classes.mjs --check
node --test tool/contracts/generate_domain_classes.test.mjs

echo "==> Checking schema path literals"
node tool/contracts/check_schema_path_literals.mjs

echo "==> Checking Firestore rules semantics against schemas"
node tool/contracts/check_firestore_rules_semantics.mjs

echo "==> Checking demo seed contract validation"
node --check tool/demo/seed_demo_data.mjs
node --check tool/data/recompute_public_profiles.mjs
node --check tool/data/backfill_profile_photos.mjs
node --check tool/data/repair_future_event_attendance.mjs
node --check functions/scripts/backfill-profile-thumbnails.cjs
node --test tool/demo/seed_demo_data_append.test.mjs \
  tool/demo/seed_demo_data_schema.test.mjs \
  tool/lib/firebase_project.test.mjs \
  tool/data/recompute_public_profiles.test.mjs \
  tool/data/backfill_profile_photos.test.mjs \
  tool/data/repair_future_event_attendance.test.mjs
node tool/demo/seed_demo_data.mjs --scenario smoke --json >/dev/null

echo "==> Checking Firestore contract metadata"
node tool/contracts/check_firestore_contract.mjs

echo "==> Checking Firestore query/index parity"
node tool/contracts/check_firestore_query_indexes.mjs

echo "==> Checking Firestore read-limit policy"
node tool/contracts/check_firestore_read_limits.mjs

echo "==> Checking Storage contract metadata"
node tool/contracts/check_storage_contract.mjs

echo "==> Checking Firestore data validator syntax"
node --check tool/data/validate_firestore_data.mjs
node --check tool/data/delete_firestore_reviews.mjs

echo "==> Running Functions lint"
npm --prefix functions run lint

echo "==> Running Functions tests"
npm --prefix functions test

echo "==> Checking seed and Functions profile projection parity"
node --test tool/data/profile_projection_parity.test.mjs

echo "==> Running Firestore rules emulator tests"
firebase emulators:exec --project demo-catch-rules --only firestore,storage \
  "npm --prefix functions run test:rules"

echo "==> Running focused Flutter analysis"
flutter analyze --fatal-infos \
  lib/platform/schema_contracts/generated/callable_request_dtos.g.dart \
  lib/platform/schema_contracts/generated/callables \
  lib/platform/schema_contracts/generated/schema_contracts.g.dart \
  lib/platform/schema_contracts/generated/schemas \
  lib/contexts/organizers/data/organizers_repository.dart \
  lib/contexts/organizers/data/organizer_callable_responses.dart \
  lib/contexts/organizers/data/organizer_posts_repository.dart \
  lib/contexts/profiles/data/image_upload_repository.dart \
  lib/hosts/presentation/organizer_management/create/create_organizer_controller.dart \
  lib/contexts/reviews/data/reviews_repository.dart \
  lib/contexts/reviews/data/review_callable_adapters.dart \
  lib/reviews/shared/reviews_section.dart \
  lib/contexts/events/data/event_repository.dart \
  lib/contexts/events/data/event_callable_adapters.dart \
  lib/contexts/events/data/event_callable_responses.dart \
  lib/contexts/profiles/data/user_profile_repository.dart \
  lib/contexts/safety/data/safety_repository.dart \
  lib/contexts/payments/data/payment_repository.dart \
  lib/contexts/payments/data/payment_history_repository.dart \
  lib/contexts/payments/data/payment_callable_requests.dart \
  lib/contexts/payments/data/payment_callable_responses.dart \
  lib/contexts/events/data/places_repository.dart \
  lib/contexts/events/data/places_callable_requests.dart \
  lib/contexts/events/data/places_callable_responses.dart \
  lib/contexts/connections/data/match_repository.dart \
  lib/contexts/live/data/event_success_callable_responses.dart \
  lib/contexts/live/data/event_success_repository.dart \
  lib/contexts/profiles/data/public_profile_repository.dart \
  test/core/schema_contracts_generated_test.dart \
  test/core/callable_dto_contracts_test.dart \
  test/core/domain_fixture_parity_test.dart \
  test/core/update_user_profile_patch_test.dart \
  test/core/update_organizer_patch_test.dart \
  test/organizers/organizers_repository_test.dart \
  test/image_uploads/image_upload_repository_test.dart \
  test/reviews/reviews_repository_test.dart \
  test/events/event_repository_test.dart \
  test/user_profile/user_profile_repository_test.dart \
  test/safety/safety_repository_test.dart \
  test/payments/payment_repository_test.dart \
  test/payments/payment_history_repository_test.dart \
  test/locations/places_repository_test.dart \
  test/event_success/event_success_repository_test.dart \
  test/public_profile/public_profile_repository_test.dart

echo "==> Running focused Flutter tests"
flutter test \
  test/core/schema_contracts_generated_test.dart \
  test/core/callable_dto_contracts_test.dart \
  test/core/domain_fixture_parity_test.dart \
  test/core/update_user_profile_patch_test.dart \
  test/core/update_organizer_patch_test.dart \
  test/organizers/organizers_repository_test.dart \
  test/image_uploads/image_upload_repository_test.dart \
  test/reviews/reviews_repository_test.dart \
  test/events/event_repository_test.dart \
  test/user_profile/user_profile_repository_test.dart \
  test/safety/safety_repository_test.dart \
  test/payments/payment_repository_test.dart \
  test/payments/payment_history_repository_test.dart \
  test/locations/places_repository_test.dart \
  test/event_success/event_success_repository_test.dart \
  test/public_profile/public_profile_repository_test.dart

echo "Data contract checks passed."
