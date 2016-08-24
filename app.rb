Bundler.require :default, ENV.fetch("RACK_ENV", "development")
require "json"
require "logger"
require "rollbar"
require "rollbar/middleware/sinatra"
require "sequel"
require "sinatra"
require "sinatra/reloader" if development?

class RollbarPersonData
  def initialize(app)
    @app = app
  end

  def call(env)
    path = Rack::Request.new(env).path_info
    match = UUID_RE.match(path)
    if match && match[1] then
      env["rollbar.person_data"] = { id: match[1] }
    else
      env["rollbar.person_data"] = nil
    end

    @app.call(env)
  end
end

UUID_RE = /([A-Fa-f0-9]{8}(?:-[A-Fa-f0-9]{4}){3}-[A-Fa-f0-9]{12})/.freeze
VALID_EVENT_KEYS = %w(timezone sleep_type start_at end_at).map(&:freeze).freeze

configure :development do
  set :port, 4321
end

configure :production do
  use Rollbar::Middleware::Sinatra
  use RollbarPersonData
  enable :method_override

  Rollbar.configure do |config|
    config.access_token = ENV.fetch("ROLLBAR_ACCESS_TOKEN")
    config.environment  = ENV.fetch("STAGE", "development")
    config.framework    = "Sinatra"

    # Use threaded async reporter
    config.use_thread
  end unless ENV["ROLLBAR_ACCESS_TOKEN"].to_s.empty?
end

configure do
  # Connect immediately, ensures database is correctly configured during boot, instead of when clients connect
  DB = Sequel.connect(ENV.fetch("DATABASE_URL", "postgresql://vagrant:vagrant@localhost:5432/vagrant"), logger: Logger.new(STDERR))
  DB.run "SELECT version()"

  set :server, %i[trinidad thin]
  set :bind, "0.0.0.0"
end

before do
  @stage = ENV.fetch("STAGE", "developemnt")
  @human_stage = case @stage
                 when "production" ; nil
                 else " - #{@stage}"
                 end
end

before do
  unless request.path_info == "/" then
    # 99% of pages must not be cached: only the home page should be
    cache_control :no_cache, :no_store, :must_revalidate, max_age: 0 unless @stage == "development"
  end
end

def table_name_from_user_id(user_id)
  "events_#{user_id}".tr("-", "_").to_sym
end

get "/" do
  cache_control :public, max_age: 3600 if @stage == "production"
  erb :home, layout: :layout
end

post "/" do
  user_id = SecureRandom.uuid
  tz = TZInfo::Timezone.get(params["timezone"]) # Validates the timezone exists
  DB.create_table(table_name_from_user_id(user_id)) do
    column :event_id, :uuid, null: false
    column :timezone, :text, null: false
    column :start_at, "timestamp with time zone", null: false, index: true
    column :end_at, "timestamp with time zone", null: false
    column :sleep_type, :text, null: false
    column :created_at, "timestamp with time zone", null: false, default: Sequel.function(:now)

    primary_key [:event_id]
    constraint :start_lt_end, "start_at < end_at"
    constraint :sleep_type_in_list, "sleep_type in ('nap', 'night')"
  end

  Rollbar.info "New user", user_id: user_id
  redirect "/me/#{user_id}?timezone=#{tz.name}"
end

get %r{\A/me/#{UUID_RE}\z} do |user_id|
  @last5 = DB[table_name_from_user_id(user_id)].
    select(
      :event_id,
      :sleep_type,
      :timezone,
      :start_at,
      :end_at,
      Sequel.lit("date_trunc('minute', end_at) - date_trunc('minute', start_at)").as(:utc_duration)).
    reverse_order(:start_at).
    limit(5).
    to_a

  @last5 = @last5.map do |row|
    tz = TZInfo::Timezone.get(row.fetch(:timezone))
    local_start_at = tz.utc_to_local(row.fetch(:start_at))
    local_end_at   = tz.utc_to_local(row.fetch(:end_at))
    row.merge(local_start_at: {wday: local_start_at.strftime("%a"), date: local_start_at.strftime("%Y-%m-%d"), time: local_start_at.strftime("%H:%M")},
              local_end_at: {wday: local_end_at.strftime("%a"), date: local_end_at.strftime("%Y-%m-%d"), time: local_end_at.strftime("%H:%M")},
              utc_duration: row.fetch(:utc_duration).sub(/:00$/, "").tr(":", "h") << "m")
  end

  @user_id = user_id
  @app = :app
  @wakeup = params[:wakeup] == "1"

  erb :app, layout: :layout
end

post %r{\A/me/#{UUID_RE}\z} do |user_id|
  # validate form data
  tz       = TZInfo::Timezone.get(params.fetch("timezone"))
  start_at = Time.at(Integer(params.fetch("start_at")) / 1000.0)
  end_at   = Time.at(Integer(params.fetch("end_at")) / 1000.0)
  sleep_type = %w(nap night).detect{|value| value == params.fetch("sleep_type")}

  # raise on error
  halt 400, "Bad Request: unrecognized sleep_type" if sleep_type.nil?

  DB[table_name_from_user_id(user_id)].insert(event_id: SecureRandom.uuid, timezone: tz.name, start_at: start_at, end_at: end_at, sleep_type: sleep_type)
  redirect "/me/#{user_id}?wakeup=1"
end

get %r{\A/me/#{UUID_RE}/analytics} do |user_id|
  avg_hours_slept_per_weekday_ds = DB[<<-EOSQL, table_name: table_name_from_user_id(user_id)]
    SELECT
         dow
      , sleep_type
      , avg_utc_duration
      , 100.0 * avg_utc_duration / sum(avg_utc_duration) OVER (PARTITION BY sleep_type) AS pct_duration
    FROM (
        SELECT
            dow
          , sleep_type
          , round((extract(hour FROM date_trunc('minute', avg(utc_duration))) + (extract(minute FROM date_trunc('minute', avg(utc_duration))) / 60.0))::numeric, 1) AS avg_utc_duration
        FROM (
          SELECT
              extract(dow FROM (end_at AT TIME ZONE timezone)) dow
            , sleep_type
            , end_at - start_at AS utc_duration
          FROM :table_name) AS t0
        GROUP BY dow, sleep_type) t0
    WHERE avg_utc_duration > 0.0
  EOSQL

  @avg_hours_slept_per_weekday = avg_hours_slept_per_weekday_ds.to_hash_groups([:dow, :sleep_type])
  @avg_hours_slept_per_weekday = @avg_hours_slept_per_weekday.map do |key, value|
    [key, value.first]
  end.to_h

  hours_slept_histogram_ds = DB[<<-EOSQL, table_name: table_name_from_user_id(user_id)]
    SELECT
        sleep_type
      , round((extract(hour FROM date_trunc('minute', end_at - start_at)) + (extract(minute FROM date_trunc('minute', end_at - start_at)) / 60.0))::numeric, 0) AS hour
      , count(*)
    FROM :table_name
    GROUP BY 1, 2
  EOSQL
  @hours_slept_histogram = hours_slept_histogram_ds.to_hash_groups([:sleep_type, :hour], :count).map do |key, value|
    [[key.first, key.last.to_f], value.first]
  end.to_h
  @max_hours = Hash.new
  @max_hours["night"] = @hours_slept_histogram.select{|k, _| k[0] == "night"}.map(&:last).compact.sort.last
  @max_hours["nap"]   = @hours_slept_histogram.select{|k, _| k[0] == "nap"}.map(&:last).compact.sort.last

  @user_id = user_id
  @app = :analytics

  erb :analytics
end

get %r{\A/me/#{UUID_RE}/settings} do |user_id|
  @user_id = user_id
  @app = :settings

  erb :settings
end

get %r{\A/me/#{UUID_RE}/#{UUID_RE}} do |user_id, event_id|
  @user_id = user_id
  @event = DB[table_name_from_user_id(user_id)].filter(event_id: event_id).first!
  tz = TZInfo::Timezone.get(@event.fetch(:timezone))
  @event = @event.merge(
    local_start_at: tz.utc_to_local(@event.fetch(:start_at)),
    local_end_at: tz.utc_to_local(@event.fetch(:end_at)))
  @app = :app

  erb :edit
end

put %r{\A/me/#{UUID_RE}/#{UUID_RE}} do |user_id, event_id|
  tz             = TZInfo::Timezone.get(params.fetch("timezone"))
  sleep_type     = %w(nap night).detect{|value| value == params.fetch("sleep_type")}
  local_start_at = Time.parse(params.fetch("local_start_at"))
  local_end_at   = Time.parse(params.fetch("local_end_at"))
  local_end_at  += 1 if local_start_at == local_end_at
  # TODO: things that make you go hummm... if local_start_at > local_end_at

  DB[table_name_from_user_id(user_id)].filter(event_id: event_id).update(
    timezone: tz.name,
    sleep_type: sleep_type,
    start_at: tz.local_to_utc(local_start_at),
    end_at: tz.local_to_utc(local_end_at))
  redirect "/me/#{user_id}"
end

delete %r{\A/me/#{UUID_RE}/#{UUID_RE}} do |user_id, event_id|
  DB[table_name_from_user_id(user_id)].filter(event_id: event_id).delete
  redirect "/me/#{user_id}"
end
