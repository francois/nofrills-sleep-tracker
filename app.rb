Bundler.require :default, ENV.fetch("RACK_ENV", "development")
require "json"
require "logger"
require "sequel"
require "sinatra"
require "sinatra/reloader" if development?

UUID_RE = /([A-Fa-f0-9]{8}(?:-[A-Fa-f0-9]{4}){3}-[A-Fa-f0-9]{12})/.freeze
VALID_EVENT_KEYS = %w(localtime timezone prior_state new_state).map(&:freeze).freeze

configure :development do
 set :port, 4321
end

configure do
  Rollbar.configure do |config|
    config.access_token = ENV.fetch("ROLLBAR_ACCESS_TOKEN")
    config.environment  = ENV.fetch("STAGE", "development")

    # Use threaded async reporter
    config.use_thread
  end

  # Connect immediately, ensures database is correctly configured during boot, instead of when clients connect
  DB = Sequel.connect(ENV.fetch("DATABASE_URL", "postgresql://vagrant:vagrant@localhost:5432/vagrant"), logger: Logger.new(STDERR))
  DB.run "SELECT version()"

  set :server, %i[trinidad thin]
  set :bind, "0.0.0.0"
end

def table_name_from_user_id(user_id)
  "events_#{user_id}".tr("-", "_").to_sym
end

get "/" do
  erb :home, layout: :layout
end

post "/" do
  user_id = SecureRandom.uuid
  DB.create_table(table_name_from_user_id(user_id)) do
    column :created_at, "timestamp with time zone", null: false, default: Sequel.function(:now)
    column :event_data, "jsonb", null: false
  end

  tz = TZInfo::Timezone.get(params["timezone"])
  redirect "/me/#{user_id}?timezone=#{tz.name}"
end

get %r{\A/me/#{UUID_RE}\z} do |user_id|
  erb :app, layout: :layout
end

post %r{\A/me/#{UUID_RE}\z} do |user_id|
  event_data = params.keep_if{|key, _| VALID_EVENT_KEYS.include?(key)}
  DB[table_name_from_user_id(user_id)].insert(event_data: event_data.to_json)
  redirect "/me/#{user_id}"
end

get %r{\A/me/#{UUID_RE}/analytics} do |user_id|
  erb :analytics
end

get %r{\A/me/#{UUID_RE}/settings} do |user_id|
  erb :settings
end

get "/bad" do
  raise "uncaught exception"
end
