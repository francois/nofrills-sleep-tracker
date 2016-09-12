# No Frills Sleep Tracker Part 2: Server Side Storage

I wanted the possibility of data portability when changing phones. Sending myself a link to a webpage that I would open on the new phone would be perfect for me.

Alternatively, imagine a family that just had a kid: both the mother and father could wish to track the sleeping patterns of their infant. To that end, cloud-based storage was the solution. Since I had chosen to build a web app instead of a plain app, I could not use iCloud storage. Good old PostgreSQL was better for me.

## Schema Design

The schema changed a few times. I could have gone the traditional route:

* `user_id`
* `start_at`
* `end_at`
* `sleep_type`
* `timezone`

That would have gotten me pretty far. Since everyone's access to the data would filter on the `user_id` field, my primary key would necessitate to be `user_id` + `start_at`. I don't think the storage requirements would have been really extreme, but I had another design which I wanted to try: each user would get their own table, consisting of

* `start_at`
* `end_at`
* `sleep_type`
* `timezone`

The only difference is the extraction of the `user_id` field to the table's name. Since each table is quite small, and all reports I had in mind required a seq scan on the table (a full table scan), adding an index would only waste time. 100 small tables of 20 records each, or 2000 records in the same table. In both cases, the data size is ridiculous and PostgreSQL would be more than capable of coping with this data.

Writing this now, I don't remember the exact decision process I went through before choosing the 2<sup>nd</sup> option.

One other option I briefly entertained was:

* `event` `jsonb`
* `created_at`

where `event` would have been JSON documents of the form `{"event_type": "start_nap", "timezone": "America/Montreal"}` and `{"event_type": "end_night", "timezone": "America/Montreal"}`. This gave me extra flexibility in tracking sleep events accross timezones, such as people who fly.

Unfortunately, reporting with this schema was much harder to implement. With start and end in the same record, I don't have to hunt for the next record with the correct event type and a larger `created_at`: a simple `end_at` - `start_at` suffices.
