# Events Notifier

[![Coverage Status](https://coveralls.io/repos/github/decentraland/events-notifier/badge.svg)](https://coveralls.io/github/decentraland/events-notifier)

This service is responsible for publishing blockchain events to internal systems. It runs cron jobs that analyze specific blockchain events and publish them to an event-driven architecture (_SNS/SQS_).

## Supported Events

The following events are notified by this service:

| Event               | Description                                                 |
| ------------------- | ----------------------------------------------------------- |
| Bid Accepted        | Triggered whenever a bid has been accepted                  |
| Bid Received        | Triggered whenever a bid has been received                  |
| Item Sold           | Triggered whenever an item has been sold in the marketplace |
| Land Rental Ended   | Triggered whenever a land rental has ended                  |
| Land Rental Started | Triggered whenever a land rental has started                |
| Royalties Earned    | Triggered whenever royalties were earned                    |
