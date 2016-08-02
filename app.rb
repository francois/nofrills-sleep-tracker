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

def table_name_from_user_id(user_id)
  "events_#{user_id}".tr("-", "_").to_sym
end

get "/" do
  erb :home, layout: :layout
end

post "/" do
  user_id = SecureRandom.uuid
  tz = TZInfo::Timezone.get(params["timezone"]) # Validates the timezone exists
  DB.create_table(table_name_from_user_id(user_id)) do
    column :timezone, :text, null: false
    column :start_at, "timestamp with time zone", null: false, index: true
    column :end_at, "timestamp with time zone", null: false
    column :sleep_type, :text, null: false
    column :created_at, "timestamp with time zone", null: false, default: Sequel.function(:now)

    constraint :start_lt_end, "start_at < end_at"
    constraint :sleep_type_in_list, "sleep_type in ('nap', 'night')"
  end

  Rollbar.info "New user", user_id: user_id
  redirect "/me/#{user_id}?timezone=#{tz.name}"
end

get %r{\A/me/#{UUID_RE}\z} do |user_id|
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

  DB[table_name_from_user_id(user_id)].insert(timezone: tz.name, start_at: start_at, end_at: end_at, sleep_type: sleep_type)
  redirect "/me/#{user_id}"
end

get %r{\A/me/#{UUID_RE}/analytics} do |user_id|
  erb :analytics
end

get %r{\A/me/#{UUID_RE}/settings} do |user_id|
  erb :settings
end
