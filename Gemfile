# Mobile release tooling. fastlane drives the TestFlight, App Store and
# Google Play lanes in fastlane/Fastfile; `bundle exec fastlane lanes` lists them.
source "https://rubygems.org"

gem "fastlane", "2.241.2"
# Same version as COCOAPODS_VERSION in tool/ci/toolchain.env. Under bundle exec,
# the runner image's CocoaPods (built for another Ruby) cannot run.
gem "cocoapods", "1.16.2"
