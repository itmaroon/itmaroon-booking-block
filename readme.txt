=== ITMAROON Booking Block ===
Contributors:      itmaroon
Tags:              booking, reservation, block
Requires at least: 6.4
Tested up to:      7.0
Stable tag:        0.1.0
Requires PHP:      8.2
License:           GPL-2.0-or-later
License URI:       https://www.gnu.org/licenses/gpl-2.0.html

A Gutenberg block for creating reservation calendars, managing capacity, and letting logged-in users book, change, or cancel reservations.

== Description ==

ITMAROON BOOKING BLOCK provides a reservation calendar block backed by dedicated WordPress database tables.

Site administrators can:

* Define reservable resource units and their capacity.
* Generate daily and time-based reservation slots.
* Open, close, edit, and remove reservation slots.
* Review and delete booking records.

Logged-in users can:

* View current availability.
* Create a reservation.
* Change the number of guests.
* Cancel their own reservation.

The plugin stores reservation data in the site's WordPress database. It does not send reservation data to an external service.


== Screenshots ==

== Changelog ==
= 0.1.0 =
* Initial release.

== Upgrade Notice ==
= 0.1.0 =
Initial release.

== Related Links ==
* ec-relate-blocks: GitHub
  https://github.com/itmaroon/itmaroon-booking-block
* block-class-package: GitHub
  https://github.com/itmaroon/block-class-package
* block-class-package: Packagist
  https://packagist.org/packages/itmar/block-class-package
* itmar-block-packages: npm
  https://www.npmjs.com/package/itmar-block-packages
* itmar-block-packages: GitHub
  https://github.com/itmaroon/itmar-block-packages

== Developer Notes ==

The unminified TypeScript and SCSS source is available at:
https://github.com/itmaroon/itmaroon-booking-block

Build the production assets with `npm install` followed by `npm run build`.

== External Services ==

This plugin does not connect to external services.
